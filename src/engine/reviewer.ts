import { parseUnifiedDiff, FileDiff } from '../git/diff_parser';
import { expandFileContext, ExpandedFileContext } from '../ast/context_expander';
import { SecurityLinter, defaultLinter } from '../security/linter';
import { SecurityFinding, SecurityScorecard } from '../security/types';
import { synthesizeTestsOffline, SynthesizedTestFile, TestFramework } from '../synthesizer/test_generator';
import { LLMProvider } from './llm_provider';
import { buildReviewSystemPrompt, buildTestSynthesisPrompt } from '../synthesizer/prompt_templates';

export interface ReviewOptions {
  generateTests?: boolean;
  preferredFramework?: TestFramework;
  baseDir?: string;
  fileContents?: Map<string, string>;
  llmProvider?: LLMProvider;
}

export interface ReviewResult {
  id: string;
  createdAt: string;
  summary: string;
  scorecard: SecurityScorecard;
  fileDiffs: FileDiff[];
  expandedContexts: ExpandedFileContext[];
  synthesizedTests: SynthesizedTestFile[];
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

    // 1. Parse unified diff
    const fileDiffs = parseUnifiedDiff(rawDiff);

    // 2. Expand AST context for each file
    const expandedContexts: ExpandedFileContext[] = [];
    const diffFilesForLinter: Array<{ diff: FileDiff; content: string }> = [];

    for (const diff of fileDiffs) {
      const explicitContent = options.fileContents?.get(diff.newPath);
      const expanded = expandFileContext(diff, explicitContent, options.baseDir);
      expandedContexts.push(expanded);
      diffFilesForLinter.push({
        diff,
        content: expanded.fileContent || ''
      });
    }

    // 3. Run static security audit
    const scorecard = this.linter.scanDiffs(diffFilesForLinter);

    // 4. Synthesize unit tests for modified scopes
    const synthesizedTests: SynthesizedTestFile[] = [];
    if (generateTests) {
      for (const ctx of expandedContexts) {
        for (const modScope of ctx.modifiedScopes) {
          // Synthesize tests for each modified function
          const testFile = synthesizeTestsOffline(
            ctx.filePath,
            modScope.scope,
            ctx.language,
            options.preferredFramework
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
                  // Recalculate scorecard
                  const updated = this.linter.buildScorecard(scorecard.findings);
                  Object.assign(scorecard, updated);
                }
              }
            } catch {
              // Ignore JSON parse errors from LLM output
            }
          }
        }
      }
    }

    // Build executive summary
    let summary = `Analyzed ${fileDiffs.length} files with ${scorecard.totalFindings} security findings.`;
    if (scorecard.passed) {
      summary += ' No critical or high-severity vulnerabilities detected.';
    } else {
      summary += ` Flagged ${scorecard.criticalCount} critical and ${scorecard.highCount} high-severity issues.`;
    }

    // Build markdown report
    const markdownReport = this.buildMarkdownReport(summary, scorecard, synthesizedTests, generalComments);

    return {
      id,
      createdAt,
      summary,
      scorecard,
      fileDiffs,
      expandedContexts,
      synthesizedTests,
      generalComments,
      markdownReport
    };
  }

  private buildMarkdownReport(
    summary: string,
    scorecard: SecurityScorecard,
    synthesizedTests: SynthesizedTestFile[],
    generalComments: string[]
  ): string {
    const lines: string[] = [
      '# ReviewForge Code Review Report',
      '',
      `> ${summary}`,
      '',
      `**Risk Score**: ${scorecard.riskScore}/100 | **Status**: ${scorecard.passed ? 'PASSED' : 'NEEDS ATTENTION'}`,
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
