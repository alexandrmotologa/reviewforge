import { describe, it, expect } from 'vitest';
import { traceTaintFlow } from '../src/ast/taint_tracer';
import { ExpandedFileContext } from '../src/ast/context_expander';

describe('Taint Tracer & Blast Radius Analyzer', () => {
  it('traces direct and delegated call paths from input sources to critical sinks', () => {
    const contexts: ExpandedFileContext[] = [
      {
        filePath: 'src/api/files.ts',
        language: 'typescript',
        modifiedScopes: [
          {
            scope: {
              name: 'handleUpload',
              kind: 'function',
              startLine: 1,
              endLine: 20,
              parameters: [{ name: 'req', isOptional: false }],
              isAsync: true,
              isExported: true,
              sourceCode: '...',
              calls: ['saveToDisk']
            },
            modifiedLines: [5],
            diffLines: []
          }
        ],
        allScopes: [
          {
            name: 'handleUpload',
            kind: 'function',
            startLine: 1,
            endLine: 20,
            parameters: [{ name: 'req', isOptional: false }],
            isAsync: true,
            isExported: true,
            sourceCode: '...',
            calls: ['saveToDisk']
          },
          {
            name: 'saveToDisk',
            kind: 'function',
            startLine: 22,
            endLine: 35,
            parameters: [{ name: 'filename', isOptional: false }],
            isAsync: false,
            isExported: false,
            sourceCode: '...',
            calls: ['writeFileSync']
          }
        ],
        imports: [],
        exports: ['handleUpload']
      }
    ];

    const traces = traceTaintFlow(contexts);
    expect(traces).toHaveLength(1);
    expect(traces[0].entryFunction).toBe('handleUpload');
    expect(traces[0].sinkCall).toBe('writeFileSync');
    expect(traces[0].callChain).toEqual(['handleUpload', 'saveToDisk', 'writeFileSync']);
    expect(traces[0].risk).toBe('high');
  });
});
