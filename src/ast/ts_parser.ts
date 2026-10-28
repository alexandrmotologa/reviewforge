import * as parser from '@babel/parser';
import traverse, { NodePath } from '@babel/traverse';
import * as t from '@babel/types';

export interface ParameterInfo {
  name: string;
  type?: string;
  defaultValue?: string;
  isOptional: boolean;
}

export interface EnclosingScope {
  name: string;
  kind: 'function' | 'method' | 'arrow' | 'class' | 'module';
  startLine: number;
  endLine: number;
  parameters: ParameterInfo[];
  returnType?: string;
  isAsync: boolean;
  isExported: boolean;
  sourceCode: string;
  calls: string[];
}

export interface ImportInfo {
  source: string;
  importedSymbols: string[];
  isDefault: boolean;
  isNamespace: boolean;
}

export interface ParsedFileAST {
  scopes: EnclosingScope[];
  imports: ImportInfo[];
  exports: string[];
}

/**
 * Parses TypeScript or JavaScript source code and indexes all functions, methods, and scopes.
 */
export function parseTypeScriptFile(code: string, filepath: string = 'file.ts'): ParsedFileAST {
  const isTypeScript = filepath.endsWith('.ts') || filepath.endsWith('.tsx') || filepath.endsWith('.mts') || filepath.endsWith('.cts');
  const isJsx = filepath.endsWith('.jsx') || filepath.endsWith('.tsx');

  const plugins: parser.ParserPlugin[] = [
    'classProperties',
    'classPrivateProperties',
    'classPrivateMethods',
    'decorators-legacy',
    'dynamicImport',
    'exportDefaultFrom',
    'nullishCoalescingOperator',
    'optionalChaining'
  ];

  if (isTypeScript) {
    plugins.push('typescript');
  }
  if (isJsx) {
    plugins.push('jsx');
  }

  let ast: parser.ParseResult<t.File>;
  try {
    ast = parser.parse(code, {
      sourceType: 'module',
      plugins
    });
  } catch (err) {
    // If module parse fails, try script parse
    ast = parser.parse(code, {
      sourceType: 'script',
      plugins: plugins.filter(p => p !== 'typescript')
    });
  }

  const lines = code.split(/\r?\n/);
  const getSlice = (start: number, end: number) => {
    return lines.slice(start - 1, end).join('\n');
  };

  const scopes: EnclosingScope[] = [];
  const imports: ImportInfo[] = [];
  const exports: string[] = [];

  // Traverse imports and exports
  traverse(ast, {
    ImportDeclaration(path: NodePath<t.ImportDeclaration>) {
      const source = path.node.source.value;
      const symbols: string[] = [];
      let isDefault = false;
      let isNamespace = false;

      for (const spec of path.node.specifiers) {
        if (t.isImportDefaultSpecifier(spec)) {
          isDefault = true;
          symbols.push(spec.local.name);
        } else if (t.isImportNamespaceSpecifier(spec)) {
          isNamespace = true;
          symbols.push(spec.local.name);
        } else if (t.isImportSpecifier(spec)) {
          const importedName = t.isIdentifier(spec.imported) ? spec.imported.name : spec.imported.value;
          symbols.push(importedName);
        }
      }

      imports.push({
        source,
        importedSymbols: symbols,
        isDefault,
        isNamespace
      });
    },

    ExportNamedDeclaration(path: NodePath<t.ExportNamedDeclaration>) {
      if (path.node.declaration) {
        if (t.isFunctionDeclaration(path.node.declaration) && path.node.declaration.id) {
          exports.push(path.node.declaration.id.name);
        } else if (t.isVariableDeclaration(path.node.declaration)) {
          for (const decl of path.node.declaration.declarations) {
            if (t.isIdentifier(decl.id)) {
              exports.push(decl.id.name);
            }
          }
        }
      }
    },

    ExportDefaultDeclaration(path: NodePath<t.ExportDefaultDeclaration>) {
      if (t.isFunctionDeclaration(path.node.declaration) && path.node.declaration.id) {
        exports.push(path.node.declaration.id.name);
      } else {
        exports.push('default');
      }
    }
  });

  // Helper to extract param info
  function extractParams(params: Array<any>): ParameterInfo[] {
    return params.map(p => {
      let targetNode = p;
      if (t.isTSParameterProperty(p)) {
        targetNode = p.parameter;
      }
      if (t.isIdentifier(targetNode)) {
        let typeStr: string | undefined;
        if (targetNode.typeAnnotation && t.isTSTypeAnnotation(targetNode.typeAnnotation)) {
          const typeAnn = targetNode.typeAnnotation.typeAnnotation;
          typeStr = code.slice(typeAnn.start ?? 0, typeAnn.end ?? 0) || undefined;
        }
        return {
          name: targetNode.name,
          type: typeStr,
          isOptional: Boolean(targetNode.optional)
        };
      }
      if (t.isAssignmentPattern(targetNode) && t.isIdentifier(targetNode.left)) {
        return {
          name: targetNode.left.name,
          defaultValue: code.slice(targetNode.right.start ?? 0, targetNode.right.end ?? 0),
          isOptional: true
        };
      }
      if (t.isRestElement(targetNode) && t.isIdentifier(targetNode.argument)) {
        return {
          name: `...${targetNode.argument.name}`,
          isOptional: true
        };
      }
      return {
        name: 'param',
        isOptional: false
      };
    });
  }

  // Helper to extract function calls within a node
  function extractCalls(nodePath: NodePath): string[] {
    const calls: string[] = [];
    nodePath.traverse({
      CallExpression(callPath: NodePath<t.CallExpression>) {
        const callee = callPath.node.callee;
        if (t.isIdentifier(callee)) {
          calls.push(callee.name);
        } else if (t.isMemberExpression(callee) && t.isIdentifier(callee.property)) {
          calls.push(callee.property.name);
        }
      }
    });
    return [...new Set(calls)];
  }

  // Traverse functions and methods
  traverse(ast, {
    FunctionDeclaration(path: NodePath<t.FunctionDeclaration>) {
      if (!path.node.loc) return;
      const name = path.node.id ? path.node.id.name : 'anonymous';
      const isExported = path.parentPath.isExportNamedDeclaration() || path.parentPath.isExportDefaultDeclaration();
      const startLine = path.node.loc.start.line;
      const endLine = path.node.loc.end.line;
      const params = extractParams(path.node.params);
      const isAsync = Boolean(path.node.async);
      const calls = extractCalls(path);

      let returnType: string | undefined;
      if (path.node.returnType && t.isTSTypeAnnotation(path.node.returnType)) {
        returnType = code.slice(path.node.returnType.typeAnnotation.start ?? 0, path.node.returnType.typeAnnotation.end ?? 0);
      }

      scopes.push({
        name,
        kind: 'function',
        startLine,
        endLine,
        parameters: params,
        returnType,
        isAsync,
        isExported,
        sourceCode: getSlice(startLine, endLine),
        calls
      });
    },

    ClassMethod(path: NodePath<t.ClassMethod>) {
      if (!path.node.loc) return;
      let name = 'method';
      if (t.isIdentifier(path.node.key)) {
        name = path.node.key.name;
      }
      const startLine = path.node.loc.start.line;
      const endLine = path.node.loc.end.line;
      const params = extractParams(path.node.params);
      const isAsync = Boolean(path.node.async);
      const calls = extractCalls(path);

      scopes.push({
        name,
        kind: 'method',
        startLine,
        endLine,
        parameters: params,
        isAsync,
        isExported: false,
        sourceCode: getSlice(startLine, endLine),
        calls
      });
    },

    VariableDeclarator(path: NodePath<t.VariableDeclarator>) {
      if (!path.node.loc || !path.node.init) return;
      if (t.isArrowFunctionExpression(path.node.init) || t.isFunctionExpression(path.node.init)) {
        const fn = path.node.init;
        if (!fn.loc) return;
        const name = t.isIdentifier(path.node.id) ? path.node.id.name : 'arrowFunction';
        const isExported = Boolean(path.parentPath?.parentPath?.isExportNamedDeclaration());
        const startLine = path.node.loc.start.line;
        const endLine = path.node.loc.end.line;
        const params = extractParams(fn.params);
        const isAsync = Boolean(fn.async);
        const calls = extractCalls(path);

        scopes.push({
          name,
          kind: 'arrow',
          startLine,
          endLine,
          parameters: params,
          isAsync,
          isExported,
          sourceCode: getSlice(startLine, endLine),
          calls
        });
      }
    }
  });

  return {
    scopes,
    imports,
    exports
  };
}

/**
 * Finds the innermost scope that encloses the specified line number.
 */
export function findEnclosingScopeForLine(astResult: ParsedFileAST, lineNumber: number): EnclosingScope | null {
  const matching = astResult.scopes.filter(s => s.startLine <= lineNumber && s.endLine >= lineNumber);
  if (matching.length === 0) {
    return null;
  }
  // Sort by smallest line span (innermost scope)
  matching.sort((a, b) => (a.endLine - a.startLine) - (b.endLine - b.startLine));
  return matching[0];
}
