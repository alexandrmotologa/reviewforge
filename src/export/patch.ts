import { SecurityFinding } from '../security/types';

export interface PatchFileResult {
  patchContent: string;
  appliedCount: number;
  filesModified: string[];
}

/**
 * Generates a unified git patch string from actionable suggestion codes in security findings.
 */
export function generateGitPatch(
  findings: SecurityFinding[],
  fileContents: Map<string, string>
): PatchFileResult {
  const actionable = findings.filter(f => Boolean(f.suggestionCode));
  if (actionable.length === 0) {
    return {
      patchContent: '',
      appliedCount: 0,
      filesModified: []
    };
  }

  // Group findings by file
  const fileGroups = new Map<string, SecurityFinding[]>();
  for (const f of actionable) {
    const list = fileGroups.get(f.filePath) || [];
    list.push(f);
    fileGroups.set(f.filePath, list);
  }

  const patchHunks: string[] = [];
  const filesModified: string[] = [];
  let totalApplied = 0;

  for (const [filePath, fileFindings] of fileGroups.entries()) {
    const originalContent = fileContents.get(filePath);
    if (!originalContent) continue;

    const originalLines = originalContent.split(/\r?\n/);
    const modifiedLines = [...originalLines];

    // Sort findings descending by line number to prevent line offset drift
    fileFindings.sort((a, b) => b.line - a.line);

    for (const f of fileFindings) {
      const lineIdx = f.line - 1;
      if (lineIdx >= 0 && lineIdx < modifiedLines.length && f.suggestionCode) {
        // Replace single line with suggestion replacement lines
        const replacementLines = f.suggestionCode.split(/\r?\n/);
        modifiedLines.splice(lineIdx, 1, ...replacementLines);
        totalApplied++;
      }
    }

    // Build unified diff for this file
    const fileDiffString = buildSimpleFileDiff(filePath, originalLines, modifiedLines);
    if (fileDiffString) {
      patchHunks.push(fileDiffString);
      filesModified.push(filePath);
    }
  }

  return {
    patchContent: patchHunks.join('\n\n') + '\n',
    appliedCount: totalApplied,
    filesModified
  };
}

/**
 * Builds a unified diff text for a modified file.
 */
function buildSimpleFileDiff(filePath: string, oldLines: string[], newLines: string[]): string {
  const normalizedPath = filePath.replace(/\\/g, '/');
  const lines: string[] = [
    `diff --git a/${normalizedPath} b/${normalizedPath}`,
    `--- a/${normalizedPath}`,
    `+++ b/${normalizedPath}`
  ];

  // Find first difference and last difference
  let firstDiff = -1;
  let oldLastDiff = -1;
  let newLastDiff = -1;

  for (let i = 0; i < Math.max(oldLines.length, newLines.length); i++) {
    if (oldLines[i] !== newLines[i]) {
      if (firstDiff === -1) firstDiff = i;
      if (i < oldLines.length) oldLastDiff = i;
      if (i < newLines.length) newLastDiff = i;
    }
  }

  if (firstDiff === -1) return '';

  const contextRadius = 2;
  const startOld = Math.max(0, firstDiff - contextRadius);
  const endOld = Math.min(oldLines.length, Math.max(oldLastDiff + contextRadius + 1, oldLines.length));
  const startNew = startOld;
  const endNew = Math.min(newLines.length, Math.max(newLastDiff + contextRadius + 1, newLines.length));

  const countOld = endOld - startOld;
  const countNew = endNew - startNew;

  lines.push(`@@ -${startOld + 1},${countOld} +${startNew + 1},${countNew} @@`);

  // Context lines before
  for (let i = startOld; i < firstDiff; i++) {
    lines.push(` ${oldLines[i]}`);
  }

  // Deletions
  for (let i = firstDiff; i <= oldLastDiff; i++) {
    if (i < oldLines.length) {
      lines.push(`-${oldLines[i]}`);
    }
  }

  // Additions
  for (let i = firstDiff; i <= newLastDiff; i++) {
    if (i < newLines.length) {
      lines.push(`+${newLines[i]}`);
    }
  }

  // Context lines after
  for (let i = Math.max(oldLastDiff, newLastDiff) + 1; i < endNew && i < newLines.length; i++) {
    lines.push(` ${newLines[i]}`);
  }

  return lines.join('\n');
}
