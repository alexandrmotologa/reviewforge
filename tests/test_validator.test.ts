import { describe, it, expect } from 'vitest';
import { validateSynthesizedTestCode } from '../src/synthesizer/validator';

describe('Synthesized Test Code Validator', () => {
  it('validates correct TypeScript test code with Babel AST', () => {
    const code = `
import { describe, it, expect } from 'vitest';
import { add } from './math';

describe('add', () => {
  it('adds numbers', () => {
    expect(add(1, 2)).toBe(3);
  });
});
`;

    const res = validateSynthesizedTestCode(code, 'vitest');
    expect(res.valid).toBe(true);
  });

  it('detects syntax errors and auto-repairs missing closing braces', () => {
    const brokenCode = `
import { describe, it, expect } from 'vitest';
import { add } from './math';

describe('add', () => {
  it('adds numbers', () => {
    expect(add(1, 2)).toBe(3);
  });
`; // Missing 1 closing brace

    const res = validateSynthesizedTestCode(brokenCode, 'vitest');
    expect(res.valid).toBe(true);
    expect(res.repairedCode).toBeDefined();
    expect(res.repairedCode?.endsWith('});') || res.repairedCode?.endsWith('}')).toBe(true);
  });
});
