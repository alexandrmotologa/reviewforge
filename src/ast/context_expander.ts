import * as fs from 'fs';
import * as path from 'path';
import { FileDiff, DiffLine } from '../git/diff_parser';
import { parseTypeScriptFile, findEnclosingScopeForLine, EnclosingScope, ImportInfo, ParsedFileAST } from './ts_parser';
import { parsePythonFile } from './python_parser';
import { parseGoFile } from './go_parser';

export type SupportedLanguage = 'typescript' | 'javascript' | 'python' | 'go' | 'other';

export interface ScopeModification {
  scope: EnclosingScope;
  modifiedLines: number[];
  diffLines: DiffLine[];
}

export interface ExpandedFileContext {
  filePath: string;
  language: SupportedLanguage;
  modifiedScopes: ScopeModification[];
  allScopes: EnclosingScope[];
  imports: ImportInfo[];
  exports: string[];
  fileContent?: string;
}

/**
 * Determines file language from file path.
 */
export function detectLanguage(filePath: string): SupportedLanguage {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.ts':
    case '.tsx':
    case '.mts':
    case '.cts':
      return 'typescript';
    case '.js':
    case '.jsx':
    case '.mjs':
    case '.cjs':
      return 'javascript';
    case '.py':
      return 'python';
    case '.go':
      return 'go';
    default:
      return 'other';
  }
}

/**
 * Reconstructs the new file content from diff hunks if the file does not exist on disk.
 */
export function reconstructFileFromDiff(fileDiff: FileDiff): string {
  const lines: string[] = [];
  for (const hunk of fileDiff.hunks) {
    for (const dl of hunk.lines) {
      if (dl.type === 'context' || dl.type === 'add') {
        lines.push(dl.content);
      }
    }
  }
  return lines.join('\n');
}

/**
 * Expands diff hunks with enclosing AST scopes and semantic context.
 */
export function expandFileContext(
  fileDiff: FileDiff,
  explicitContent?: string,
  baseDir: string = process.cwd()
): ExpandedFileContext {
  const language = detectLanguage(fileDiff.newPath);

  // Retrieve file content from explicit input, disk, or diff reconstruction
  let content = explicitContent;
  if (!content) {
    const fullPath = path.isAbsolute(fileDiff.newPath) ? fileDiff.newPath : path.join(baseDir, fileDiff.newPath);
    if (fs.existsSync(fullPath)) {
      try {
        content = fs.readFileSync(fullPath, 'utf8');
      } catch {
        content = reconstructFileFromDiff(fileDiff);
      }
    } else {
      content = reconstructFileFromDiff(fileDiff);
    }
  }

  let parsed: ParsedFileAST = { scopes: [], imports: [], exports: [] };

  try {
    if (language === 'typescript' || language === 'javascript') {
      parsed = parseTypeScriptFile(content, fileDiff.newPath);
    } else if (language === 'python') {
      parsed = parsePythonFile(content, fileDiff.newPath);
    } else if (language === 'go') {
      parsed = parseGoFile(content, fileDiff.newPath);
    }
  } catch (err) {
    // If AST parsing fails on incomplete diff chunks, proceed with empty scopes
  }

  // Map modified lines to their enclosing scopes
  const scopeMap = new Map<string, ScopeModification>();

  for (const hunk of fileDiff.hunks) {
    for (const dl of hunk.lines) {
      if (dl.type === 'add' && dl.newLineNumber) {
        const lineNo = dl.newLineNumber;
        const enclosing = findEnclosingScopeForLine(parsed, lineNo);
        if (enclosing) {
          const key = `${enclosing.startLine}-${enclosing.endLine}-${enclosing.name}`;
          const existing = scopeMap.get(key);
          if (existing) {
            if (!existing.modifiedLines.includes(lineNo)) {
              existing.modifiedLines.push(lineNo);
              existing.diffLines.push(dl);
            }
          } else {
            scopeMap.set(key, {
              scope: enclosing,
              modifiedLines: [lineNo],
              diffLines: [dl]
            });
          }
        }
      }
    }
  }

  return {
    filePath: fileDiff.newPath,
    language,
    modifiedScopes: Array.from(scopeMap.values()),
    allScopes: parsed.scopes,
    imports: parsed.imports,
    exports: parsed.exports,
    fileContent: content
  };
}
