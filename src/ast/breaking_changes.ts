import { ParsedFileAST, EnclosingScope, parseTypeScriptFile } from './ts_parser';
import { parsePythonFile } from './python_parser';
import { parseGoFile } from './go_parser';
import { detectLanguage } from './context_expander';

export type BreakingChangeType =
  | 'export_removed'
  | 'required_param_added'
  | 'param_removed'
  | 'param_type_changed'
  | 'sync_to_async'
  | 'return_type_changed';

export interface BreakingChangeFinding {
  type: BreakingChangeType;
  symbolName: string;
  filePath: string;
  line: number;
  description: string;
  severity: 'critical' | 'high' | 'medium';
  oldSignature?: string;
  newSignature?: string;
}

/**
 * Parses file content according to its file extension.
 */
function parseAstByLanguage(content: string, filePath: string): ParsedFileAST {
  const lang = detectLanguage(filePath);
  if (lang === 'typescript' || lang === 'javascript') {
    return parseTypeScriptFile(content, filePath);
  }
  if (lang === 'python') {
    return parsePythonFile(content, filePath);
  }
  if (lang === 'go') {
    return parseGoFile(content, filePath);
  }
  return { scopes: [], imports: [], exports: [] };
}

/**
 * Compares old and new file ASTs to detect breaking public API and contract changes.
 */
export function detectBreakingChanges(
  filePath: string,
  oldContent: string,
  newContent: string
): BreakingChangeFinding[] {
  const findings: BreakingChangeFinding[] = [];

  const oldAst = parseAstByLanguage(oldContent, filePath);
  const newAst = parseAstByLanguage(newContent, filePath);

  // 1. Check for removed or renamed exports
  const newExportSet = new Set(newAst.exports);
  for (const exp of oldAst.exports) {
    if (exp !== 'default' && !newExportSet.has(exp)) {
      const oldScope = oldAst.scopes.find(s => s.name === exp);
      findings.push({
        type: 'export_removed',
        symbolName: exp,
        filePath,
        line: oldScope?.startLine || 1,
        description: `Exported symbol '${exp}' was removed or renamed from public API contract. External consumers importing this symbol will fail at build or runtime.`,
        severity: 'critical'
      });
    }
  }

  // 2. Compare signature details for preserved exported scopes
  const oldScopeMap = new Map<string, EnclosingScope>();
  for (const s of oldAst.scopes) {
    if (s.isExported) {
      oldScopeMap.set(s.name, s);
    }
  }

  for (const newScope of newAst.scopes) {
    if (!newScope.isExported) continue;
    const oldScope = oldScopeMap.get(newScope.name);
    if (!oldScope) continue;

    // Check Sync to Async conversion
    if (!oldScope.isAsync && newScope.isAsync) {
      findings.push({
        type: 'sync_to_async',
        symbolName: newScope.name,
        filePath,
        line: newScope.startLine,
        description: `Exported function '${newScope.name}' was converted from synchronous to async. Existing callers not awaiting this function will receive an unhandled Promise instead of the expected return value.`,
        severity: 'high'
      });
    }

    // Check Parameter counts and required additions
    const oldRequiredParams = oldScope.parameters.filter(p => !p.isOptional && !p.defaultValue);
    const newRequiredParams = newScope.parameters.filter(p => !p.isOptional && !p.defaultValue);

    // If new required params were added beyond the old count
    if (newRequiredParams.length > oldRequiredParams.length) {
      const addedParams = newRequiredParams.slice(oldRequiredParams.length).map(p => p.name).join(', ');
      findings.push({
        type: 'required_param_added',
        symbolName: newScope.name,
        filePath,
        line: newScope.startLine,
        description: `Required parameter(s) [${addedParams}] added to existing exported function '${newScope.name}'. Existing call sites with fewer arguments will break.`,
        severity: 'critical',
        oldSignature: `${oldScope.name}(${oldScope.parameters.map(p => p.name).join(', ')})`,
        newSignature: `${newScope.name}(${newScope.parameters.map(p => p.name).join(', ')})`
      });
    }

    // Check if parameters were removed from public signature
    if (newScope.parameters.length < oldScope.parameters.length) {
      findings.push({
        type: 'param_removed',
        symbolName: newScope.name,
        filePath,
        line: newScope.startLine,
        description: `Parameter count decreased for exported function '${newScope.name}' (was ${oldScope.parameters.length}, now ${newScope.parameters.length}).`,
        severity: 'medium'
      });
    }

    // Check parameter type alterations
    for (let i = 0; i < Math.min(oldScope.parameters.length, newScope.parameters.length); i++) {
      const oldParam = oldScope.parameters[i];
      const newParam = newScope.parameters[i];
      if (oldParam.type && newParam.type && oldParam.type !== newParam.type) {
        findings.push({
          type: 'param_type_changed',
          symbolName: newScope.name,
          filePath,
          line: newScope.startLine,
          description: `Type of parameter '${newParam.name}' in '${newScope.name}' changed from '${oldParam.type}' to '${newParam.type}'.`,
          severity: 'high',
          oldSignature: `${oldParam.name}: ${oldParam.type}`,
          newSignature: `${newParam.name}: ${newParam.type}`
        });
      }
    }
  }

  return findings;
}
