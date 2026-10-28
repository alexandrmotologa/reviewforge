import { ExpandedFileContext } from './context_expander';

export interface TaintTraceFinding {
  entryFunction: string;
  sinkCall: string;
  filePath: string;
  callChain: string[];
  description: string;
  blastRadius: number;
  risk: 'critical' | 'high' | 'medium';
}

const CRITICAL_SINKS = new Set([
  'query',
  'execute',
  '$queryRawUnsafe',
  'raw',
  'readFile',
  'readFileSync',
  'createReadStream',
  'writeFile',
  'writeFileSync',
  'exec',
  'execSync',
  'system',
  'popen',
  'fetch',
  'open'
]);

const TAINTED_PARAM_NAMES = [
  'req',
  'request',
  'body',
  'query',
  'params',
  'input',
  'userinput',
  'payload',
  'data',
  'filename',
  'url'
];

/**
 * Traces data flow and call chains from untrusted input parameters to critical system sinks.
 */
export function traceTaintFlow(contexts: ExpandedFileContext[]): TaintTraceFinding[] {
  const findings: TaintTraceFinding[] = [];

  // Build a scope lookup map across all files
  const functionMap = new Map<string, { calls: string[]; filePath: string; isExported: boolean; paramNames: string[] }>();

  for (const ctx of contexts) {
    for (const scope of ctx.allScopes) {
      functionMap.set(scope.name, {
        calls: scope.calls,
        filePath: ctx.filePath,
        isExported: scope.isExported,
        paramNames: scope.parameters.map(p => p.name.toLowerCase())
      });
    }
  }

  // Inspect each modified scope in the diff
  for (const ctx of contexts) {
    for (const mod of ctx.modifiedScopes) {
      const scope = mod.scope;
      const paramNames = scope.parameters.map(p => p.name.toLowerCase());
      const receivesUntrustedInput = paramNames.some(p =>
        TAINTED_PARAM_NAMES.some(tp => p.includes(tp))
      );

      // Check direct sink calls in this function
      for (const call of scope.calls) {
        if (CRITICAL_SINKS.has(call)) {
          findings.push({
            entryFunction: scope.name,
            sinkCall: call,
            filePath: ctx.filePath,
            callChain: [scope.name, call],
            description: `Function '${scope.name}' receives input parameters [${scope.parameters.map(p => p.name).join(', ')}] and directly invokes critical sink '${call}'.`,
            blastRadius: scope.calls.length,
            risk: receivesUntrustedInput ? 'critical' : 'high'
          });
        }

        // Trace downstream 2nd-level calls
        const downstream = functionMap.get(call);
        if (downstream) {
          for (const downCall of downstream.calls) {
            if (CRITICAL_SINKS.has(downCall)) {
              findings.push({
                entryFunction: scope.name,
                sinkCall: downCall,
                filePath: ctx.filePath,
                callChain: [scope.name, call, downCall],
                description: `Tainted flow detected: '${scope.name}' delegates to '${call}', which invokes critical sink '${downCall}'.`,
                blastRadius: downstream.calls.length + scope.calls.length,
                risk: receivesUntrustedInput ? 'high' : 'medium'
              });
            }
          }
        }
      }
    }
  }

  // Deduplicate findings by call chain
  const seen = new Set<string>();
  return findings.filter(f => {
    const key = `${f.filePath}:${f.callChain.join('->')}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
