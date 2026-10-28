import { EnclosingScope, ImportInfo, ParameterInfo, ParsedFileAST } from './ts_parser';

/**
 * Parses Go source code to extract function declarations, method receivers, and scopes.
 */
export function parseGoFile(code: string, filepath: string = 'file.go'): ParsedFileAST {
  const lines = code.split(/\r?\n/);
  const scopes: EnclosingScope[] = [];
  const imports: ImportInfo[] = [];
  const exports: string[] = [];

  let inImportBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('//')) {
      continue;
    }

    // Single-line import: import "fmt"
    if (trimmed.startsWith('import "')) {
      const match = trimmed.match(/^import\s+"([^"]+)"/);
      if (match) {
        imports.push({
          source: match[1],
          importedSymbols: [match[1].split('/').pop() || match[1]],
          isDefault: true,
          isNamespace: false
        });
      }
      continue;
    }

    // Multi-line import block
    if (trimmed === 'import (') {
      inImportBlock = true;
      continue;
    }
    if (inImportBlock) {
      if (trimmed === ')') {
        inImportBlock = false;
        continue;
      }
      const match = trimmed.match(/"([^"]+)"/);
      if (match) {
        imports.push({
          source: match[1],
          importedSymbols: [match[1].split('/').pop() || match[1]],
          isDefault: true,
          isNamespace: false
        });
      }
      continue;
    }

    // Function or Method: func (r *Type) Name(...) (...) { or func Name(...) (...) {
    if (trimmed.startsWith('func ')) {
      const funcMatch = trimmed.match(/^func\s+(?:\(([^)]+)\)\s+)?([a-zA-Z_]\w*)\s*\((.*?)\)(?:\s*(.+?))?\s*\{/);
      if (funcMatch) {
        const receiver = funcMatch[1];
        const name = funcMatch[2];
        const rawParams = funcMatch[3];
        const returnType = funcMatch[4]?.trim();
        const startLine = i + 1;

        // Trace closing brace
        let braceCount = 0;
        let endLine = startLine;

        for (let j = i; j < lines.length; j++) {
          const l = lines[j];
          for (let charIdx = 0; charIdx < l.length; charIdx++) {
            const ch = l[charIdx];
            if (ch === '{') braceCount++;
            if (ch === '}') {
              braceCount--;
              if (braceCount === 0) {
                endLine = j + 1;
                break;
              }
            }
          }
          if (braceCount === 0 && j >= i) {
            break;
          }
        }

        const parameters: ParameterInfo[] = [];
        if (rawParams.trim()) {
          const parts = rawParams.split(',');
          for (const pt of parts) {
            const p = pt.trim();
            if (!p) continue;
            const tokens = p.split(/\s+/);
            if (tokens.length >= 2) {
              parameters.push({
                name: tokens[0],
                type: tokens.slice(1).join(' '),
                isOptional: false
              });
            } else {
              parameters.push({
                name: p,
                isOptional: false
              });
            }
          }
        }

        const isExported = name[0] === name[0].toUpperCase() && name[0] !== '_';
        const sourceCode = lines.slice(startLine - 1, endLine).join('\n');

        const calls: string[] = [];
        const callMatches = sourceCode.matchAll(/([a-zA-Z_]\w*)\s*\(/g);
        for (const cm of callMatches) {
          if (cm[1] !== name && cm[1] !== 'func') {
            calls.push(cm[1]);
          }
        }

        scopes.push({
          name: receiver ? `${receiver.trim()}.${name}` : name,
          kind: receiver ? 'method' : 'function',
          startLine,
          endLine,
          parameters,
          returnType,
          isAsync: false,
          isExported,
          sourceCode,
          calls: [...new Set(calls)]
        });

        if (isExported) {
          exports.push(name);
        }
      }
    }
  }

  return {
    scopes,
    imports,
    exports
  };
}
