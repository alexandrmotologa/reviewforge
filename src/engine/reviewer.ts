import { parseUnifiedDiff, FileDiff } from '../git/diff_parser';
import { expandFileContext, ExpandedFileContext, reconstructFileFromDiff } from '../ast/context_expander';
import { SecurityLinter, defaultLinter } from '../security/linter';
import { SecurityFinding, SecurityScorecard } from '../security/types';
import { synthesizeTestsOffline, SynthesizedTestFile, TestFramework } from '../synthesizer/test_generator';
import { LLMProvider } from './llm_provider';
import { buildReviewSystemPrompt } from '../synthesizer/prompt_templates';
import { ReviewForgeConfig, isFileExcluded } from '../config/policy';
import { loadReviewForgeConfig } from '../config/loader';
import { detectBreakingChanges, BreakingChangeFinding } from '../ast/breaking_changes';
import { generateGitPatch } from '../export/patch';

export interface ReviewOptions {
  generateTests?: boolean;
  preferredFramework?: TestFramework;
  baseDir?: string;
  fileContents?: Map<string, string>;
  llmProvider?: LLMProvider;
  config?: ReviewForgeConfig;
}

export interface ReviewResult {
  id: string;
  createdAt: string;
  summary: string;
  scorecard: SecurityScorecard;
  fileDiffs: FileDiff[];
  expandedContexts: ExpandedFileContext[];
  synthesizedTests: SynthesizedTestFile[];
  breakingChanges: BreakingChangeFinding[];
  patchContent: string;
  generalComments: string[];
  markdownReport: string;
}

export class ReviewForgeEngine {
  private linter: SecurityLinter;
  private llm: LLMProvider;

  constructor(linter: SecurityLinter = defaultLinter, llm?: LLMProvider) {
    this.linter = linter;
    this.llm = llm || new LLMProvider();
  }

  /**
   * Reviews a raw unified git diff string.
   */
  public async reviewDiff(rawDiff: string, options: ReviewOptions = {}): Promise<ReviewResult> {
    const id = `rf-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const createdAt = new Date().toISOString();
    const generateTests = options.generateTests ?? true;

    // Load configuration
    const config = options.config || loadReviewForgeConfig(options.baseDir);
    const framework = options.preferredFramework || config.framework;

    // 1. Parse unified diff
    const allFileDiffs = parseUnifiedDiff(rawDiff);

    // Filter out excluded files
    const fileDiffs = allFileDiffs.filter(diff => !isFileExcluded(diff.newPath, config.exclude));

    // 2. Expand AST context & collect breaking changes
    const expandedContexts: ExpandedFileContext[] = [];
    const diffFilesForLinter: Array<{ diff: FileDiff; content: string }> = [];
    const breakingChanges: BreakingChangeFinding[] = [];
    const fileContentsMap = new Map<string, string>();

    for (const diff of fileDiffs) {
      const explicitContent = options.fileContents?.get(diff.newPath);
      const expanded = expandFileContext(diff, explicitContent, options.baseDir);
      expandedContexts.push(expanded);

      const newContent = expanded.fileContent || reconstructFileFromDiff(diff);
      fileContentsMap.set(diff.newPath, newContent);

      diffFilesForLinter.push({
        diff,
        content: newContent
      });

      // Detect breaking changes if the file was modified (not new or deleted)
      if (!diff.isNew && !diff.isDeleted && diff.hunks.length > 0) {
        const oldContent = this.reconstructOldContent(diff);
        if (oldContent.trim()) {
          const bc = detectBreakingChanges(diff.newPath, oldContent, newContent);
          breakingChanges.push(...bc);
        }
      }
    }

    // 3. Run static security audit
    let scorecard = this.linter.scanDiffs(diffFilesForLinter);

    // Apply rule configurations (error, warn, ignore)
    if (config.rules && Object.keys(config.rules).length > 0) {
      scorecard.findings = scorecard.findings.filter(f => {
        const action = config.rules[f.ruleId];
        if (action === 'ignore') return false;
        if (action === 'warn') {
          if (f.severity === 'critical' || f.severity === 'high') {
            f.severity = 'medium';
          }
        }
        return true;
      });

      const updated = this.linter.buildScorecard(scorecard.findings);
      Object.assign(scorecard, updated);
    }

    // Evaluate scorecard compliance based on policy
    scorecard.passed =
      scorecard.riskScore >= config.min_score &&
      (!config.block_on_critical || scorecard.criticalCount === 0);

    // 4. Synthesize unit tests for modified scopes
    const synthesizedTests: SynthesizedTestFile[] = [];
    if (generateTests) {
      for (const ctx of expandedContexts) {
        for (const modScope of ctx.modifiedScopes) {
          const testFile = synthesizeTestsOffline(
            ctx.filePath,
            modScope.scope,
            ctx.language,
            framework
          );
          synthesizedTests.push(testFile);
        }
      }
    }

    // 5. LLM Semantic Review (if enabled and reachable)
    const generalComments: string[] = [];
    const provider = options.llmProvider || this.llm;

    if (provider.getProviderType() !== 'offline') {
      for (const ctx of expandedContexts) {
        for (const modScope of ctx.modifiedScopes) {
          const hunkSnippet = modScope.diffLines.map(dl => `${dl.type === 'add' ? '+' : dl.type === 'delete' ? '-' : ' '}${dl.content}`).join('\n');
          const prompt = `Review this changed function in ${ctx.filePath}:\n\nFunction AST Source:\n${modScope.scope.sourceCode}\n\nDiff Changes:\n${hunkSnippet}`;

          const completion = await provider.complete([
            { role: 'system', content: buildReviewSystemPrompt() },
            { role: 'user', content: prompt }
          ]);

          if (completion) {
            try {
              const jsonMatch = completion.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]) as {
                  summary?: string;
                  findings?: Array<{
                    title: string;
                    description: string;
                    severity: 'critical' | 'high' | 'medium' | 'low';
                    line: number;
                    remediation: string;
                    suggestionCode?: string;
                  }>;
                };

                if (parsed.summary) {
                  generalComments.push(`[${ctx.filePath}] ${parsed.summary}`);
                }

                if (parsed.findings && parsed.findings.length > 0) {
                  for (const f of parsed.findings) {
                    scorecard.findings.push({
                      ruleId: 'llm-semantic-review',
                      title: f.title,
                      description: f.description,
                      severity: f.severity,
                      cwe: 'CWE-Other',
                      filePath: ctx.filePath,
                      line: f.line || modScope.scope.startLine,
                      remediation: f.remediation,
                      suggestionCode: f.suggestionCode
                    });
                  }
                  const updated = this.linter.buildScorecard(scorecard.findings);
                  Object.assign(scorecard, updated);
                  scorecard.passed =
                    scorecard.riskScore >= config.min_score &&
                    (!config.block_on_critical || scorecard.criticalCount === 0);
                }
              }
            } catch {
              // Ignore JSON parse errors
            }
          }
        }
      }
    }

    // 6. Generate 1-click git patch
    const patchResult = generateGitPatch(scorecard.findings, fileContentsMap);

    // Build executive summary
    let summary = `Analyzed ${fileDiffs.length} files with ${scorecard.totalFindings} security findings`;
    if (breakingChanges.length > 0) {
      summary += ` and ${breakingChanges.length} breaking API contract change(s)`;
    }
    summary += `. Risk Score: ${scorecard.riskScore}/100.`;

    // Build markdown report
    const markdownReport = this.buildMarkdownReport(
      summary,
      scorecard,
      synthesizedTests,
      breakingChanges,
      generalComments
    );

    return {
      id,
      createdAt,
      summary,
      scorecard,
      fileDiffs,
      expandedContexts,
      synthesizedTests,
      breakingChanges,
      patchContent: patchResult.patchContent,
      generalComments,
      markdownReport
    };
  }

  private reconstructOldContent(diff: FileDiff): string {
    const lines: string[] = [];
    for (const hunk of diff.hunks) {
      for (const dl of hunk.lines) {
        if (dl.type === 'context' || dl.type === 'delete') {
          lines.push(dl.content);
        }
      }
    }
    return lines.join('\n');
  }

  private buildMarkdownReport(
    summary: string,
    scorecard: SecurityScorecard,
    synthesizedTests: SynthesizedTestFile[],
    breakingChanges: BreakingChangeFinding[],
    generalComments: string[]
  ): string {
    const lines: string[] = [
      '# ReviewForge Code Review Report',
      '',
      `> ${summary}`,
      '',
      `**Risk Score**: ${scorecard.riskScore}/100 | **Status**: ${scorecard.passed ? 'PASSED' : 'ACTION REQUIRED'}`,
      '',
      '## Security Scorecard',
      '| Metric | Value |',
      '|---|---|',
      `| Critical Issues | ${scorecard.criticalCount} |`,
      `| High Issues | ${scorecard.highCount} |`,
      `| Medium Issues | ${scorecard.mediumCount} |`,
      `| Low Issues | ${scorecard.lowCount} |`,
      `| Overall Risk Score | ${scorecard.riskScore} / 100 |`,
      ''
    ];

    if (breakingChanges.length > 0) {
      lines.push('## Breaking API Changes Detected');
      for (const bc of breakingChanges) {
        lines.push(`### [${bc.severity.toUpperCase()}] ${bc.symbolName} (${bc.type})`);
        lines.push(`- **Location**: \`${bc.filePath}:${bc.line}\``);
        lines.push(`- **Impact**: ${bc.description}`);
        if (bc.oldSignature && bc.newSignature) {
          lines.push(`- **Old**: \`${bc.oldSignature}\``);
          lines.push(`- **New**: \`${bc.newSignature}\``);
        }
        lines.push('');
      }
    }

    if (scorecard.findings.length > 0) {
      lines.push('## Detected Vulnerabilities');
      for (const f of scorecard.findings) {
        lines.push(`### [${f.severity.toUpperCase()}] ${f.title} (${f.cwe})`);
        lines.push(`- **Location**: \`${f.filePath}:${f.line}\``);
        lines.push(`- **Details**: ${f.description}`);
        lines.push(`- **Remediation**: ${f.remediation}`);
        if (f.snippet) {
          lines.push('```');
          lines.push(f.snippet);
          lines.push('```');
        }
        lines.push('');
      }
    }

    if (synthesizedTests.length > 0) {
      lines.push('## Synthesized Unit Tests');
      for (const t of synthesizedTests) {
        lines.push(`### File: \`${t.testFilePath}\` (${t.framework})`);
        lines.push('```');
        lines.push(t.code);
        lines.push('```');
        lines.push('');
      }
    }

    return lines.join('\n');
  }
}

export const defaultEngine = new ReviewForgeEngine();
