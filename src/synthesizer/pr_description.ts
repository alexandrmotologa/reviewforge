import { FileDiff } from '../git/diff_parser';
import { ExpandedFileContext } from '../ast/context_expander';
import { SecurityScorecard } from '../security/types';
import { BreakingChangeFinding } from '../ast/breaking_changes';
import { SynthesizedTestFile } from './test_generator';

export interface PrDescriptionResult {
  title: string;
  conventionalType: 'feat' | 'fix' | 'refactor' | 'perf' | 'security' | 'chore';
  scope: string;
  markdownDescription: string;
  changelogEntry: string;
}

/**
 * Synthesizes a structured PR description and changelog entry from AST diff analysis.
 */
export function synthesizePrDescription(options: {
  fileDiffs: FileDiff[];
  expandedContexts: ExpandedFileContext[];
  scorecard: SecurityScorecard;
  breakingChanges: BreakingChangeFinding[];
  synthesizedTests: SynthesizedTestFile[];
}): PrDescriptionResult {
  const { fileDiffs, expandedContexts, scorecard, breakingChanges, synthesizedTests } = options;

  // 1. Determine primary conventional commit type
  let conventionalType: PrDescriptionResult['conventionalType'] = 'feat';
  if (scorecard.criticalCount > 0 || scorecard.highCount > 0) {
    conventionalType = 'security';
  } else if (breakingChanges.length > 0) {
    conventionalType = 'feat';
  } else {
    const hasFixKeywords = fileDiffs.some(f => /fix|bug|patch|issue|hotfix/i.test(f.newPath));
    const hasAdditions = fileDiffs.some(f => f.totalAdditions > 0);
    const hasDeletions = fileDiffs.some(f => f.totalDeletions > 0);
    if (hasFixKeywords) {
      conventionalType = 'fix';
    } else if (hasAdditions && !hasDeletions) {
      conventionalType = 'feat';
    } else if (hasAdditions && hasDeletions) {
      conventionalType = 'refactor';
    } else {
      conventionalType = 'chore';
    }
  }

  // 2. Identify scope (common directory or primary module name)
  let scope = 'core';
  if (fileDiffs.length > 0) {
    const firstPath = fileDiffs[0].newPath;
    const parts = firstPath.split(/[\/\\]/);
    if (parts.length > 2 && (parts[0] === 'src' || parts[0] === 'app' || parts[0] === 'packages')) {
      scope = parts[1];
    } else if (parts.length > 1) {
      scope = parts[0];
    }
  }

  // 3. Collect modified symbols
  const modifiedSymbols: string[] = [];
  for (const ctx of expandedContexts) {
    for (const mod of ctx.modifiedScopes) {
      if (mod.scope.name && !modifiedSymbols.includes(mod.scope.name)) {
        modifiedSymbols.push(mod.scope.name);
      }
    }
  }

  // 4. Generate title
  let title = `${conventionalType}(${scope}): update ${fileDiffs.length} file(s)`;
  if (modifiedSymbols.length > 0) {
    title = `${conventionalType}(${scope}): update ${modifiedSymbols.slice(0, 3).join(', ')}`;
    if (modifiedSymbols.length > 3) {
      title += ` and ${modifiedSymbols.length - 3} others`;
    }
  }
  if (conventionalType === 'security') {
    title = `security(${scope}): resolve ${scorecard.totalFindings} vulnerability finding(s)`;
  }

  // 5. Construct Markdown Description
  const lines: string[] = [
    `## Summary of Changes`,
    '',
    `This pull request modifies \`${fileDiffs.length}\` file(s) across the \`${scope}\` module, affecting \`${modifiedSymbols.length}\` AST function/class definition(s).`,
    '',
    '### Type of Change',
    `- [${conventionalType === 'feat' ? 'x' : ' '}] **feat**: New feature or capability`,
    `- [${conventionalType === 'fix' ? 'x' : ' '}] **fix**: Bug fix or patch`,
    `- [${conventionalType === 'refactor' ? 'x' : ' '}] **refactor**: Code change that neither fixes a bug nor adds a feature`,
    `- [${conventionalType === 'security' ? 'x' : ' '}] **security**: Hardening, vulnerability fix, or credential protection`,
    `- [${breakingChanges.length > 0 ? 'x' : ' '}] **BREAKING CHANGE**: Alters public API interface or function signatures`,
    ''
  ];

  if (modifiedSymbols.length > 0) {
    lines.push('### Modified Components and Functions');
    for (const sym of modifiedSymbols) {
      lines.push(`- \`${sym}\``);
    }
    lines.push('');
  }

  if (breakingChanges.length > 0) {
    lines.push('### ⚠️ Breaking API Changes');
    for (const bc of breakingChanges) {
      lines.push(`- **${bc.symbolName}** (${bc.type}): ${bc.description}`);
      if (bc.oldSignature && bc.newSignature) {
        lines.push(`  - Old: \`${bc.oldSignature}\``);
        lines.push(`  - New: \`${bc.newSignature}\``);
      }
    }
    lines.push('');
  }

  lines.push('### Security Assessment');
  lines.push(`- **Risk Score**: ${scorecard.riskScore}/100 (${scorecard.passed ? 'PASSED' : 'ACTION REQUIRED'})`);
  lines.push(`- **Vulnerabilities**: ${scorecard.criticalCount} Critical, ${scorecard.highCount} High, ${scorecard.mediumCount} Medium, ${scorecard.lowCount} Low`);
  lines.push('');

  if (synthesizedTests.length > 0) {
    lines.push('### Automated Test Verification');
    lines.push('ReviewForge synthesized unit tests for modified logic branches:');
    for (const test of synthesizedTests) {
      lines.push(`- \`${test.testFilePath}\` (${test.framework}, ${test.testCount} assertions)`);
    }
    lines.push('');
  }

  lines.push('---');
  lines.push('*Generated autonomously by ReviewForge AST Semantic Reviewer.*');

  const markdownDescription = lines.join('\n');

  // 6. Construct Changelog Entry
  let changelogSection = '### Features';
  if (conventionalType === 'security') changelogSection = '### Security';
  else if (conventionalType === 'fix') changelogSection = '### Bug Fixes';
  else if (conventionalType === 'refactor') changelogSection = '### Refactoring';

  const changelogLines: string[] = [
    changelogSection,
    `- **${scope}**: ${title.split(': ')[1] || title}`
  ];
  if (breakingChanges.length > 0) {
    changelogLines.push('### ⚠️ Breaking Changes');
    for (const bc of breakingChanges) {
      changelogLines.push(`- **${bc.symbolName}**: ${bc.description}`);
    }
  }

  return {
    title,
    conventionalType,
    scope,
    markdownDescription,
    changelogEntry: changelogLines.join('\n')
  };
}
