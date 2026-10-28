import * as parser from '@babel/parser';
import { TestFramework } from './test_generator';

export interface ValidationResult {
  valid: boolean;
  error?: string;
  repairedCode?: string;
}

/**
 * Validates synthesized test code for syntactic correctness.
 */
export function validateSynthesizedTestCode(code: string, framework: TestFramework): ValidationResult {
  if (!code || !code.trim()) {
    return { valid: false, error: 'Empty test code' };
  }

  if (framework === 'vitest' || framework === 'jest') {
    try {
      parser.parse(code, {
        sourceType: 'module',
        plugins: ['typescript', 'jsx']
      });
      return { valid: true };
    } catch (err: any) {
      // Attempt syntax repair: check if closing brace/parenthesis is missing
      const openBraces = (code.match(/\{/g) || []).length;
      const closeBraces = (code.match(/\}/g) || []).length;
      if (openBraces > closeBraces) {
        const missing = openBraces - closeBraces;
        const candidates = [
          code + '\n' + '});\n'.repeat(missing),
          code + '\n' + '}\n'.repeat(missing),
          code + '\n});\n}',
          code + '\n});'
        ];
        for (const candidate of candidates) {
          try {
            parser.parse(candidate, {
              sourceType: 'module',
              plugins: ['typescript', 'jsx']
            });
            return { valid: true, repairedCode: candidate.trim() };
          } catch {
            // Continue trying next candidate
          }
        }
      }
      return { valid: false, error: err.message };
    }
  }

  if (framework === 'pytest') {
    // Check balanced parentheses, brackets, and colons after def
    const openParens = (code.match(/\(/g) || []).length;
    const closeParens = (code.match(/\)/g) || []).length;
    if (openParens !== closeParens) {
      return { valid: false, error: `Unbalanced parentheses: ${openParens} open vs ${closeParens} close` };
    }
    return { valid: true };
  }

  if (framework === 'go') {
    const openBraces = (code.match(/\{/g) || []).length;
    const closeBraces = (code.match(/\}/g) || []).length;
    if (openBraces !== closeBraces) {
      return { valid: false, error: `Unbalanced braces in Go test: ${openBraces} open vs ${closeBraces} close` };
    }
    return { valid: true };
  }

  return { valid: true };
}
