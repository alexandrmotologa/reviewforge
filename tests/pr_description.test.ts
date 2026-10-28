import { describe, it, expect } from 'vitest';
import { synthesizePrDescription } from '../src/synthesizer/pr_description';
import { FileDiff } from '../src/git/diff_parser';
import { ExpandedFileContext } from '../src/ast/context_expander';
import { SecurityScorecard } from '../src/security/types';
import { BreakingChangeFinding } from '../src/ast/breaking_changes';

describe('PR Description and Changelog Synthesizer', () => {
  it('generates structured conventional PR description with breaking change notices', () => {
    const fileDiffs: FileDiff[] = [
      {
        newPath: 'src/billing/invoice.ts',
        isNew: false,
        isDeleted: false,
        isRenamed: false,
        totalAdditions: 15,
        totalDeletions: 4,
        hunks: []
      }
    ];

    const expandedContexts: ExpandedFileContext[] = [
      {
        filePath: 'src/billing/invoice.ts',
        language: 'typescript',
        modifiedScopes: [
          {
            scope: {
              name: 'generateInvoicePdf',
              kind: 'function',
              startLine: 10,
              endLine: 40,
              parameters: [{ name: 'orderId', isOptional: false }],
              isAsync: true,
              isExported: true,
              sourceCode: '...',
              calls: ['db.query']
            },
            modifiedLines: [15],
            diffLines: []
          }
        ],
        allScopes: [],
        imports: [],
        exports: ['generateInvoicePdf']
      }
    ];

    const scorecard: SecurityScorecard = {
      totalFindings: 0,
      criticalCount: 0,
      highCount: 0,
      mediumCount: 0,
      lowCount: 0,
      riskScore: 100,
      passed: true,
      findings: []
    };

    const breakingChanges: BreakingChangeFinding[] = [
      {
        type: 'required_param_added',
        symbolName: 'generateInvoicePdf',
        filePath: 'src/billing/invoice.ts',
        line: 10,
        description: 'Required parameter currency added to signature',
        severity: 'critical'
      }
    ];

    const result = synthesizePrDescription({
      fileDiffs,
      expandedContexts,
      scorecard,
      breakingChanges,
      synthesizedTests: []
    });

    expect(result.scope).toBe('billing');
    expect(result.title).toContain('generateInvoicePdf');
    expect(result.markdownDescription).toContain('## Summary of Changes');
    expect(result.markdownDescription).toContain('BREAKING CHANGE');
    expect(result.markdownDescription).toContain('**Risk Score**: 100/100');
    expect(result.changelogEntry).toContain('Breaking Changes');
  });
});
