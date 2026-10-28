import { describe, it, expect } from 'vitest';
import { parseUnifiedDiff } from '../src/git/diff_parser';
import { findNewLineInDiff, resolveGitHubReviewTarget } from '../src/git/hunk_locator';

describe('Unified Diff Parser', () => {
  it('parses single file diff with additions and deletions', () => {
    const rawDiff = `diff --git a/src/math.ts b/src/math.ts
index 1111111..2222222 100644
--- a/src/math.ts
+++ b/src/math.ts
@@ -1,5 +1,6 @@
 export function add(a: number, b: number): number {
-  return a - b;
+  // Fixed subtraction bug
+  return a + b;
 }
`;

    const files = parseUnifiedDiff(rawDiff);
    expect(files).toHaveLength(1);

    const file = files[0];
    expect(file.newPath).toBe('src/math.ts');
    expect(file.oldPath).toBe('src/math.ts');
    expect(file.isNew).toBe(false);
    expect(file.isDeleted).toBe(false);
    expect(file.totalAdditions).toBe(2);
    expect(file.totalDeletions).toBe(1);
    expect(file.hunks).toHaveLength(1);

    const hunk = file.hunks[0];
    expect(hunk.oldStart).toBe(1);
    expect(hunk.oldLines).toBe(5);
    expect(hunk.newStart).toBe(1);
    expect(hunk.newLines).toBe(6);

    // Test hunk locator
    const located = findNewLineInDiff(file, 3);
    expect(located).not.toBeNull();
    expect(located?.line.content).toBe('  return a + b;');
    expect(located?.line.type).toBe('add');

    const target = resolveGitHubReviewTarget(file, 3);
    expect(target).not.toBeNull();
    expect(target?.line).toBe(3);
    expect(target?.side).toBe('RIGHT');
  });

  it('handles newly created files and deleted files', () => {
    const rawDiff = `diff --git a/src/new_file.ts b/src/new_file.ts
new file mode 100644
index 0000000..3333333
--- /dev/null
+++ b/src/new_file.ts
@@ -0,0 +1,3 @@
+export const VERSION = '1.0.0';
+export const API_URL = 'https://api.example.com';
+
diff --git a/src/old_file.ts b/src/old_file.ts
deleted file mode 100644
index 4444444..0000000
--- a/src/old_file.ts
+++ /dev/null
@@ -1,2 +0,0 @@
-export const DEPRECATED = true;
-
`;

    const files = parseUnifiedDiff(rawDiff);
    expect(files).toHaveLength(2);
    expect(files[0].isNew).toBe(true);
    expect(files[0].totalAdditions).toBe(3);
    expect(files[1].isDeleted).toBe(true);
    expect(files[1].totalDeletions).toBe(2);
  });
});
