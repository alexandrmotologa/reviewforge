export type ChangeType = 'add' | 'delete' | 'context';

export interface DiffLine {
  type: ChangeType;
  content: string;
  oldLineNumber?: number;
  newLineNumber?: number;
  position: number;
}

export interface DiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  header: string;
  lines: DiffLine[];
}

export interface FileDiff {
  oldPath?: string;
  newPath: string;
  isNew: boolean;
  isDeleted: boolean;
  isRenamed: boolean;
  hunks: DiffHunk[];
  totalAdditions: number;
  totalDeletions: number;
}

/**
 * Parses raw unified diff text into structured FileDiff objects.
 */
export function parseUnifiedDiff(rawDiff: string): FileDiff[] {
  if (!rawDiff || !rawDiff.trim()) {
    return [];
  }

  const lines = rawDiff.split(/\r?\n/);
  const files: FileDiff[] = [];

  let currentFile: FileDiff | null = null;
  let currentHunk: DiffHunk | null = null;
  let currentOldLine = 0;
  let currentNewLine = 0;
  let positionInFile = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // File header: diff --git a/path b/path
    if (line.startsWith('diff --git ')) {
      if (currentFile) {
        if (currentHunk) {
          currentFile.hunks.push(currentHunk);
          currentHunk = null;
        }
        files.push(currentFile);
      }

      const match = line.match(/^diff --git a\/(.+?) b\/(.+)$/);
      const oldPath = match ? match[1] : undefined;
      const newPath = match ? match[2] : 'unknown';

      currentFile = {
        oldPath,
        newPath,
        isNew: false,
        isDeleted: false,
        isRenamed: false,
        hunks: [],
        totalAdditions: 0,
        totalDeletions: 0
      };
      positionInFile = 0;
      continue;
    }

    if (!currentFile) {
      // Diff might not start with 'diff --git', e.g. standalone patch starting with --- or @@
      if (line.startsWith('--- ')) {
        const path = line.replace(/^--- (a\/)?/, '').trim();
        currentFile = {
          oldPath: path === '/dev/null' ? undefined : path,
          newPath: path,
          isNew: path === '/dev/null',
          isDeleted: false,
          isRenamed: false,
          hunks: [],
          totalAdditions: 0,
          totalDeletions: 0
        };
        positionInFile = 0;
        continue;
      }
    }

    if (!currentFile) {
      continue;
    }

    if (line.startsWith('new file mode ')) {
      currentFile.isNew = true;
      continue;
    }

    if (line.startsWith('deleted file mode ')) {
      currentFile.isDeleted = true;
      continue;
    }

    if (line.startsWith('similarity index ') || line.startsWith('rename from ') || line.startsWith('rename to ')) {
      currentFile.isRenamed = true;
      if (line.startsWith('rename to ')) {
        currentFile.newPath = line.replace('rename to ', '').trim();
      }
      continue;
    }

    if (line.startsWith('--- ')) {
      const path = line.replace(/^--- (a\/)?/, '').trim();
      if (path === '/dev/null') {
        currentFile.isNew = true;
        currentFile.oldPath = undefined;
      } else {
        currentFile.oldPath = path;
      }
      continue;
    }

    if (line.startsWith('+++ ')) {
      const path = line.replace(/^\+\+\+ (b\/)?/, '').trim();
      if (path === '/dev/null') {
        currentFile.isDeleted = true;
      } else {
        currentFile.newPath = path;
      }
      continue;
    }

    // Hunk header: @@ -oldStart,oldLines +newStart,newLines @@
    const hunkHeaderMatch = line.match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@(.*)$/);
    if (hunkHeaderMatch) {
      if (currentHunk) {
        currentFile.hunks.push(currentHunk);
      }

      const oldStart = parseInt(hunkHeaderMatch[1], 10);
      const oldLines = hunkHeaderMatch[2] !== undefined ? parseInt(hunkHeaderMatch[2], 10) : 1;
      const newStart = parseInt(hunkHeaderMatch[3], 10);
      const newLines = hunkHeaderMatch[4] !== undefined ? parseInt(hunkHeaderMatch[4], 10) : 1;

      currentOldLine = oldStart;
      currentNewLine = newStart;
      positionInFile++;

      currentHunk = {
        oldStart,
        oldLines,
        newStart,
        newLines,
        header: line,
        lines: []
      };
      continue;
    }

    // Lines inside a hunk
    if (currentHunk) {
      positionInFile++;

      if (line.startsWith('+')) {
        currentHunk.lines.push({
          type: 'add',
          content: line.slice(1),
          newLineNumber: currentNewLine,
          position: positionInFile
        });
        currentNewLine++;
        currentFile.totalAdditions++;
      } else if (line.startsWith('-')) {
        currentHunk.lines.push({
          type: 'delete',
          content: line.slice(1),
          oldLineNumber: currentOldLine,
          position: positionInFile
        });
        currentOldLine++;
        currentFile.totalDeletions++;
      } else if (line.startsWith(' ') || line === '') {
        currentHunk.lines.push({
          type: 'context',
          content: line.startsWith(' ') ? line.slice(1) : line,
          oldLineNumber: currentOldLine,
          newLineNumber: currentNewLine,
          position: positionInFile
        });
        currentOldLine++;
        currentNewLine++;
      } else if (line.startsWith('\\ No newline at end of file')) {
        // Git EOF marker, doesn't increment line counts
      }
    }
  }

  if (currentFile) {
    if (currentHunk) {
      currentFile.hunks.push(currentHunk);
    }
    files.push(currentFile);
  }

  return files;
}
