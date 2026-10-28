import { describe, it, expect } from 'vitest';
import { synthesizeTestsOffline } from '../src/synthesizer/test_generator';
import { formatGitHubSuggestion } from '../src/synthesizer/suggestion_fixer';
import { EnclosingScope } from '../src/ast/ts_parser';

describe('Unit Test Synthesizer and Suggestion Fixer', () => {
  it('synthesizes complete Vitest test file for TypeScript function', () => {
    const scope: EnclosingScope = {
      name: 'calculateTax',
      kind: 'function',
      startLine: 1,
      endLine: 5,
      parameters: [
        { name: 'amount', type: 'number', isOptional: false },
        { name: 'rate', type: 'number', isOptional: true, defaultValue: '0.1' }
      ],
      returnType: 'number',
      isAsync: false,
      isExported: true,
      sourceCode: 'export function calculateTax(amount: number, rate: number = 0.1): number { return amount * rate; }',
      calls: []
    };

    const synthesized = synthesizeTestsOffline('src/billing.ts', scope, 'typescript', 'vitest');

    expect(synthesized.framework).toBe('vitest');
    expect(synthesized.testFilePath).toContain('billing.test.ts');
    expect(synthesized.code).toContain("import { calculateTax } from './billing';");
    expect(synthesized.code).toContain("describe('calculateTax'");
    expect(synthesized.code).toContain('expect(result).toBeDefined()');
    expect(synthesized.testCount).toBe(3);
  });

  it('synthesizes Pytest test file for Python function', () => {
    const scope: EnclosingScope = {
      name: 'format_username',
      kind: 'function',
      startLine: 1,
      endLine: 4,
      parameters: [
        { name: 'username', type: 'str', isOptional: false }
      ],
      isAsync: false,
      isExported: true,
      sourceCode: 'def format_username(username: str) -> str: return username.strip().lower()',
      calls: []
    };

    const synthesized = synthesizeTestsOffline('app/users.py', scope, 'python', 'pytest');

    expect(synthesized.framework).toBe('pytest');
    expect(synthesized.testFilePath).toBe('app/test_users.py');
    expect(synthesized.code).toContain('import pytest');
    expect(synthesized.code).toContain('def test_format_username_happy_path():');
    expect(synthesized.code).toContain('def test_format_username_boundary():');
    expect(synthesized.code).toContain('with pytest.raises(Exception):');
  });

  it('formats GitHub multi-line suggestion blocks with proper indentation', () => {
    const original = '    const query = `SELECT * FROM users WHERE id = ${id}`;';
    const replacement = 'const query = "SELECT * FROM users WHERE id = $1";\nconst params = [id];';

    const suggestion = formatGitHubSuggestion({
      originalCode: original,
      replacementCode: replacement,
      commentMessage: 'Use parameterized queries to prevent SQL injection.'
    });

    expect(suggestion).toContain('Use parameterized queries to prevent SQL injection.');
    expect(suggestion).toContain('```suggestion');
    expect(suggestion).toContain('    const query = "SELECT * FROM users WHERE id = $1";');
    expect(suggestion).toContain('```');
  });
});
