import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { defaultEngine } from './engine/reviewer';
import { defaultLinter } from './security/linter';
import { parseTypeScriptFile } from './ast/ts_parser';
import { parsePythonFile } from './ast/python_parser';
import { parseGoFile } from './ast/go_parser';
import { detectLanguage } from './ast/context_expander';
import { synthesizeTestsOffline } from './synthesizer/test_generator';
import { GitHubReviewer } from './git/octokit_client';
import { generateSarifReport } from './export/sarif';
import { startServer } from './server/api';

const program = new Command();

program
  .name('reviewforge')
  .description('Self-hosted AI pull request reviewer, AST semantic diff auditor, and test synthesizer')
  .version('1.0.0');

// Command: review
program
  .command('review')
  .description('Run code review on local changes or remote GitHub pull request')
  .option('--diff', 'Review local uncommitted git changes')
  .option('--pr <target>', 'GitHub PR target in format owner/repo/number (e.g. facebook/react/1234)')
  .option('--publish', 'Publish review comments directly to the GitHub PR', false)
  .option('--sarif-output <path>', 'Export SARIF 2.1.0 security report to file')
  .option('--output <path>', 'Save markdown report to file')
  .option('--tests-output-dir <dir>', 'Directory to save synthesized unit test files')
  .action(async (options) => {
    try {
      let rawDiff = '';

      if (options.pr) {
        const parts = options.pr.split('/');
        if (parts.length !== 3) {
          console.error('Error: --pr argument must be in format "owner/repo/pull_number"');
          process.exit(1);
        }
        const [owner, repo, prStr] = parts;
        const pullNumber = parseInt(prStr, 10);
        console.log(`Fetching pull request #${pullNumber} diff for ${owner}/${repo}...`);

        const reviewer = new GitHubReviewer();
        rawDiff = await reviewer.getPullRequestDiff(owner, repo, pullNumber);

        console.log('Running AST semantic analysis and security audit...');
        const result = await defaultEngine.reviewDiff(rawDiff);

        console.log('\n' + result.markdownReport);

        if (options.sarifOutput) {
          const sarif = generateSarifReport(result.scorecard.findings);
          fs.writeFileSync(options.sarifOutput, JSON.stringify(sarif, null, 2), 'utf8');
          console.log(`\nSARIF report written to ${options.sarifOutput}`);
        }

        if (options.output) {
          fs.writeFileSync(options.output, result.markdownReport, 'utf8');
          console.log(`Markdown report written to ${options.output}`);
        }

        if (options.publish) {
          console.log('Publishing review comments to GitHub...');
          await reviewer.publishReview({
            owner,
            repo,
            pullNumber,
            scorecard: result.scorecard,
            synthesizedTests: result.synthesizedTests,
            generalComments: result.generalComments
          });
          console.log('Review published successfully.');
        }

        if (!result.scorecard.passed) {
          process.exit(1);
        }
        return;
      }

      if (options.diff || !options.pr) {
        console.log('Reading local git diff...');
        try {
          rawDiff = execSync('git diff HEAD', { encoding: 'utf8' });
          if (!rawDiff.trim()) {
            // Check unstaged diff
            rawDiff = execSync('git diff', { encoding: 'utf8' });
          }
        } catch {
          console.error('Failed to run git diff. Ensure this directory is inside a Git repository.');
          process.exit(1);
        }

        if (!rawDiff.trim()) {
          console.log('No uncommitted changes detected.');
          return;
        }

        console.log('Running AST semantic analysis, security checks, and test synthesis...');
        const result = await defaultEngine.reviewDiff(rawDiff);

        console.log('\n' + result.markdownReport);

        if (options.sarifOutput) {
          const sarif = generateSarifReport(result.scorecard.findings);
          fs.writeFileSync(options.sarifOutput, JSON.stringify(sarif, null, 2), 'utf8');
          console.log(`\nSARIF report written to ${options.sarifOutput}`);
        }

        if (options.output) {
          fs.writeFileSync(options.output, result.markdownReport, 'utf8');
          console.log(`Markdown report written to ${options.output}`);
        }

        if (options.testsOutputDir && result.synthesizedTests.length > 0) {
          fs.mkdirSync(options.testsOutputDir, { recursive: true });
          for (const test of result.synthesizedTests) {
            const outPath = path.join(options.testsOutputDir, path.basename(test.testFilePath));
            fs.writeFileSync(outPath, test.code, 'utf8');
            console.log(`Synthesized test saved to ${outPath}`);
          }
        }

        if (!result.scorecard.passed) {
          process.exit(1);
        }
      }
    } catch (err: any) {
      console.error('Execution error:', err.message || err);
      process.exit(1);
    }
  });

// Command: test-gen
program
  .command('test-gen <filepath>')
  .description('Synthesize automated unit tests for exported functions in a source file')
  .option('--framework <framework>', 'Target test framework (vitest, jest, pytest, go)')
  .option('--output <path>', 'Write test code to destination file')
  .action((filepath, options) => {
    if (!fs.existsSync(filepath)) {
      console.error(`Error: File "${filepath}" does not exist.`);
      process.exit(1);
    }

    const content = fs.readFileSync(filepath, 'utf8');
    const lang = detectLanguage(filepath);

    let parsed = { scopes: [] as any[] };
    if (lang === 'typescript' || lang === 'javascript') {
      parsed = parseTypeScriptFile(content, filepath);
    } else if (lang === 'python') {
      parsed = parsePythonFile(content, filepath);
    } else if (lang === 'go') {
      parsed = parseGoFile(content, filepath);
    }

    if (parsed.scopes.length === 0) {
      console.log('No functions or methods found in file.');
      return;
    }

    console.log(`Synthesizing unit tests for ${parsed.scopes.length} functions in ${filepath}...`);

    for (const scope of parsed.scopes) {
      const testFile = synthesizeTestsOffline(filepath, scope, lang, options.framework);
      if (options.output) {
        fs.writeFileSync(options.output, testFile.code, 'utf8');
        console.log(`Saved tests to ${options.output}`);
      } else {
        console.log(`\n// --- Tests for ${scope.name} (${testFile.framework}) ---`);
        console.log(testFile.code);
      }
    }
  });

// Command: audit
program
  .command('audit <targetPath>')
  .description('Run static OWASP security audit across a file or directory')
  .option('--sarif-output <path>', 'Save SARIF 2.1.0 report')
  .action((targetPath, options) => {
    if (!fs.existsSync(targetPath)) {
      console.error(`Error: Path "${targetPath}" does not exist.`);
      process.exit(1);
    }

    const stat = fs.statSync(targetPath);
    const filesToScan: string[] = [];

    if (stat.isFile()) {
      filesToScan.push(targetPath);
    } else if (stat.isDirectory()) {
      const walk = (dir: string) => {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const e of entries) {
          if (e.name === 'node_modules' || e.name === '.git' || e.name === 'dist') continue;
          const full = path.join(dir, e.name);
          if (e.isDirectory()) walk(full);
          else if (['.ts', '.js', '.tsx', '.jsx', '.py', '.go'].includes(path.extname(e.name))) {
            filesToScan.push(full);
          }
        }
      };
      walk(targetPath);
    }

    console.log(`Auditing ${filesToScan.length} files against OWASP Top 10 rules...`);
    const allFindings = [];

    for (const f of filesToScan) {
      const content = fs.readFileSync(f, 'utf8');
      const findings = defaultLinter.scanContent(f, content);
      allFindings.push(...findings);
    }

    const scorecard = defaultLinter.buildScorecard(allFindings);

    console.log('\n--- ReviewForge Security Audit ---');
    console.log(`Total Findings: ${scorecard.totalFindings} | Risk Score: ${scorecard.riskScore}/100 | Status: ${scorecard.passed ? 'PASSED' : 'FAILED'}`);
    console.log(`Critical: ${scorecard.criticalCount} | High: ${scorecard.highCount} | Medium: ${scorecard.mediumCount} | Low: ${scorecard.lowCount}\n`);

    for (const f of scorecard.findings) {
      console.log(`[${f.severity.toUpperCase()}] ${f.title} (${f.cwe}) at ${f.filePath}:${f.line}`);
      console.log(`  ${f.description}`);
      console.log(`  Remediation: ${f.remediation}`);
      if (f.snippet) {
        console.log(`  Line: ${f.snippet}`);
      }
      console.log('');
    }

    if (options.sarifOutput) {
      const sarif = generateSarifReport(scorecard.findings);
      fs.writeFileSync(options.sarifOutput, JSON.stringify(sarif, null, 2), 'utf8');
      console.log(`SARIF report written to ${options.sarifOutput}`);
    }

    if (!scorecard.passed) {
      process.exit(1);
    }
  });

// Command: serve
program
  .command('serve')
  .description('Launch the Fastify webhook daemon and React 19 web studio')
  .option('--port <number>', 'Port to listen on', '9440')
  .option('--host <host>', 'Host to bind to', '0.0.0.0')
  .action(async (options) => {
    const port = parseInt(options.port, 10);
    await startServer(port, options.host);
  });

program.parse(process.argv);
