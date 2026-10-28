import { EnclosingScope, ImportInfo, ParameterInfo, ParsedFileAST } from './ts_parser';

/**
 * Parses Python source code to extract function definitions, classes, and scopes.
 */
export function parsePythonFile(code: string, filepath: string = 'file.py'): ParsedFileAST {
  const lines = code.split(/\r?\n/);
  const scopes: EnclosingScope[] = [];
  const imports: ImportInfo[] = [];
  const exports: string[] = [];

  const getIndent = (line: string): number => {
    const match = line.match(/^(\s*)/);
    return match ? match[1].length : 0;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip comments and empty lines
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    // Import detection
    if (trimmed.startsWith('import ') || trimmed.startsWith('from ')) {
      if (trimmed.startsWith('from ')) {
        const match = trimmed.match(/^from\s+([\w\.]+)\s+import\s+(.+)$/);
        if (match) {
          const source = match[1];
          const symbols = match[2].split(',').map(s => s.trim().split(/\s+as\s+/)[0]);
          imports.push({
            source,
            importedSymbols: symbols,
            isDefault: false,
            isNamespace: false
          });
        }
      } else {
        const match = trimmed.match(/^import\s+(.+)$/);
        if (match) {
          const sources = match[1].split(',').map(s => s.trim().split(/\s+as\s+/)[0]);
          for (const s of sources) {
            imports.push({
              source: s,
              importedSymbols: [s],
              isDefault: true,
              isNamespace: false
            });
          }
        }
      }
      continue;
    }

    // Function definition: def name(params): or async def name(params):
    const funcMatch = trimmed.match(/^(async\s+)?def\s+([a-zA-Z_]\w*)\s*\((.*?)\)(?:\s*->\s*(.+?))?:/);
    if (funcMatch) {
      const isAsync = Boolean(funcMatch[1]);
      const name = funcMatch[2];
      const rawParams = funcMatch[3];
      const returnType = funcMatch[4]?.trim();
      const baseIndent = getIndent(line);
      const startLine = i + 1;

      // Find the end line by inspecting indentation
      let endLine = startLine;
      for (let j = i + 1; j < lines.length; j++) {
        const nextLine = lines[j];
        const nextTrimmed = nextLine.trim();
        if (!nextTrimmed || nextTrimmed.startsWith('#')) {
          continue;
        }
        const nextIndent = getIndent(nextLine);
        if (nextIndent <= baseIndent) {
          endLine = j; // previous non-empty line
          break;
        }
        endLine = j + 1;
      }

      // Parse parameters
      const parameters: ParameterInfo[] = [];
      if (rawParams.trim()) {
        const paramTokens = rawParams.split(',');
        for (const pt of paramTokens) {
          const p = pt.trim();
          if (!p) continue;
          const [nameAndType, defaultVal] = p.split('=').map(x => x.trim());
          const [pName, pType] = nameAndType.split(':').map(x => x.trim());
          parameters.push({
            name: pName,
            type: pType || undefined,
            defaultValue: defaultVal || undefined,
            isOptional: Boolean(defaultVal)
          });
        }
      }

      const sourceCode = lines.slice(startLine - 1, endLine).join('\n');
      const calls: string[] = [];
      const callMatches = sourceCode.matchAll(/([a-zA-Z_]\w*)\s*\(/g);
      for (const cm of callMatches) {
        if (cm[1] !== name && cm[1] !== 'def') {
          calls.push(cm[1]);
        }
      }

      scopes.push({
        name,
        kind: 'function',
        startLine,
        endLine,
        parameters,
        returnType,
        isAsync,
        isExported: !name.startsWith('_'),
        sourceCode,
        calls: [...new Set(calls)]
      });

      if (!name.startsWith('_')) {
        exports.push(name);
      }
    }
  }

  return {
    scopes,
    imports,
    exports
  };
}
