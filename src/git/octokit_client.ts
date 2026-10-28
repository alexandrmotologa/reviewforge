import { Octokit } from '@octokit/rest';
import { SecurityFinding, SecurityScorecard } from '../security/types';
import { formatGitHubSuggestion } from '../synthesizer/suggestion_fixer';
import { SynthesizedTestFile } from '../synthesizer/test_generator';

export interface GitHubReviewComment {
  path: string;
  line: number;
  start_line?: number;
  side?: 'RIGHT' | 'LEFT';
  body: string;
}

export interface ReviewPublishOptions {
  owner: string;
  repo: string;
  pullNumber: number;
  commitId?: string;
  scorecard: SecurityScorecard;
  synthesizedTests?: SynthesizedTestFile[];
  generalComments?: string[];
  dryRun?: boolean;
}

export class GitHubReviewer {
  private octokit: Octokit;

  constructor(token?: string) {
    const authToken = token || process.env.GITHUB_TOKEN;
    this.octokit = new Octokit({
      auth: authToken
    });
  }

  /**
   * Fetches the unified diff of a pull request from GitHub.
   */
  public async getPullRequestDiff(owner: string, repo: string, pullNumber: number): Promise<string> {
    const response = await this.octokit.rest.pulls.get({
      owner,
      repo,
      pull_number: pullNumber,
      headers: {
        accept: 'application/vnd.github.v3.diff'
      }
    });

    return response.data as unknown as string;
  }

  /**
   * Retrieves pull request metadata including the head commit SHA.
   */
  public async getPullRequestDetails(owner: string, repo: string, pullNumber: number) {
    const response = await this.octokit.rest.pulls.get({
      owner,
      repo,
      pull_number: pullNumber
    });
    return response.data;
  }

  /**
   * Builds an aggregate markdown summary for the PR review body.
   */
  public buildSummaryMarkdown(
    scorecard: SecurityScorecard,
    synthesizedTests: SynthesizedTestFile[] = [],
    generalComments: string[] = []
  ): string {
    const riskBadge = scorecard.passed
      ? '🟢 **PASS** (Low Risk)'
      : '🔴 **SECURITY ACTION REQUIRED**';

    const lines: string[] = [
      '## ReviewForge Autonomous PR Audit',
      '',
      `**Risk Evaluation**: ${riskBadge} | **Security Score**: ${scorecard.riskScore}/100`,
      '',
      '### Vulnerability Breakdown',
      '| Severity | Count | Status |',
      '|---|---|---|',
      `| Critical | ${scorecard.criticalCount} | ${scorecard.criticalCount === 0 ? 'Clean' : 'Needs Fix'} |`,
      `| High | ${scorecard.highCount} | ${scorecard.highCount === 0 ? 'Clean' : 'Needs Fix'} |`,
      `| Medium | ${scorecard.mediumCount} | ${scorecard.mediumCount === 0 ? 'Clean' : 'Review'} |`,
      `| Low | ${scorecard.lowCount} | Clean |`,
      ''
    ];

    if (scorecard.findings.length > 0) {
      lines.push('### Static Security Findings');
      for (const finding of scorecard.findings) {
        lines.push(`- **[${finding.severity.toUpperCase()}] ${finding.title}** (${finding.cwe}) at \`${finding.filePath}:${finding.line}\``);
        lines.push(`  ${finding.description}`);
        if (finding.remediation) {
          lines.push(`  *Remediation*: ${finding.remediation}`);
        }
      }
      lines.push('');
    }

    if (synthesizedTests.length > 0) {
      lines.push('### Synthesized Unit Test Suites');
      lines.push('ReviewForge automatically synthesized regression tests for newly modified functions:');
      for (const test of synthesizedTests) {
        lines.push(`- \`${test.testFilePath}\` (${test.framework}, ${test.testCount} assertions)`);
      }
      lines.push('');
    }

    if (generalComments.length > 0) {
      lines.push('### General Remarks');
      for (const comment of generalComments) {
        lines.push(`- ${comment}`);
      }
      lines.push('');
    }

    lines.push('---');
    lines.push('*Automated review conducted by ReviewForge AST Semantic Engine.*');

    return lines.join('\n');
  }

  /**
   * Publishes comments and review decision to GitHub.
   */
  public async publishReview(options: ReviewPublishOptions): Promise<{ reviewId?: number; summary: string }> {
    const { owner, repo, pullNumber, scorecard, synthesizedTests = [], dryRun } = options;

    const summary = this.buildSummaryMarkdown(scorecard, synthesizedTests, options.generalComments);

    // Format inline comments with 1-click suggestion blocks where available
    const comments: GitHubReviewComment[] = [];

    for (const finding of scorecard.findings) {
      let body = `**${finding.title}** (${finding.cwe})\n\n${finding.description}\n\n*Remediation*: ${finding.remediation}`;
      if (finding.suggestionCode && finding.snippet) {
        body = formatGitHubSuggestion({
          originalCode: finding.snippet,
          replacementCode: finding.suggestionCode,
          commentMessage: body
        });
      }

      comments.push({
        path: finding.filePath,
        line: finding.line,
        body
      });
    }

    if (dryRun) {
      return { summary };
    }

    const prDetails = await this.getPullRequestDetails(owner, repo, pullNumber);
    const commitId = options.commitId || prDetails.head.sha;

    const event = scorecard.passed ? 'COMMENT' : 'REQUEST_CHANGES';

    const response = await this.octokit.rest.pulls.createReview({
      owner,
      repo,
      pull_number: pullNumber,
      commit_id: commitId,
      body: summary,
      event,
      comments: comments.map(c => ({
        path: c.path,
        line: c.line,
        body: c.body
      }))
    });

    return {
      reviewId: response.data.id,
      summary
    };
  }
}
