import { FileDiff, DiffHunk, DiffLine } from './diff_parser';

export interface LocatedLine {
  hunk: DiffHunk;
  line: DiffLine;
  hunkIndex: number;
  lineIndexInHunk: number;
}

export interface ReviewTarget {
  path: string;
  line: number;
  startLine?: number;
  position: number;
  side: 'RIGHT' | 'LEFT';
}

/**
 * Finds a specific new line number within parsed file diff hunks.
 */
export function findNewLineInDiff(fileDiff: FileDiff, targetLineNumber: number): LocatedLine | null {
  for (let h = 0; h < fileDiff.hunks.length; h++) {
    const hunk = fileDiff.hunks[h];
    for (let l = 0; l < hunk.lines.length; l++) {
      const diffLine = hunk.lines[l];
      if (diffLine.newLineNumber === targetLineNumber) {
        return {
          hunk,
          line: diffLine,
          hunkIndex: h,
          lineIndexInHunk: l
        };
      }
    }
  }
  return null;
}

/**
 * Finds a specific deleted line number within parsed file diff hunks.
 */
export function findOldLineInDiff(fileDiff: FileDiff, targetLineNumber: number): LocatedLine | null {
  for (let h = 0; h < fileDiff.hunks.length; h++) {
    const hunk = fileDiff.hunks[h];
    for (let l = 0; l < hunk.lines.length; l++) {
      const diffLine = hunk.lines[l];
      if (diffLine.oldLineNumber === targetLineNumber && diffLine.type === 'delete') {
        return {
          hunk,
          line: diffLine,
          hunkIndex: h,
          lineIndexInHunk: l
        };
      }
    }
  }
  return null;
}

/**
 * Resolves GitHub review comment parameters for a given line or range.
 */
export function resolveGitHubReviewTarget(
  fileDiff: FileDiff,
  endLineNumber: number,
  startLineNumber?: number
): ReviewTarget | null {
  const endLocated = findNewLineInDiff(fileDiff, endLineNumber);
  if (!endLocated) {
    // If not found in additions/context, check deleted
    const oldLocated = findOldLineInDiff(fileDiff, endLineNumber);
    if (!oldLocated) {
      return null;
    }
    return {
      path: fileDiff.newPath,
      line: endLineNumber,
      position: oldLocated.line.position,
      side: 'LEFT'
    };
  }

  const result: ReviewTarget = {
    path: fileDiff.newPath,
    line: endLineNumber,
    position: endLocated.line.position,
    side: 'RIGHT'
  };

  if (startLineNumber && startLineNumber < endLineNumber) {
    result.startLine = startLineNumber;
  }

  return result;
}

/**
 * Retrieves surrounding lines from a hunk around a target line.
 */
export function getSurroundingHunkContent(
  hunk: DiffHunk,
  lineIndex: number,
  radius: number = 3
): string[] {
  const start = Math.max(0, lineIndex - radius);
  const end = Math.min(hunk.lines.length, lineIndex + radius + 1);
  return hunk.lines.slice(start, end).map(l => {
    const prefix = l.type === 'add' ? '+' : l.type === 'delete' ? '-' : ' ';
    return prefix + l.content;
  });
}
