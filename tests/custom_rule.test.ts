import { describe, it, expect } from 'vitest';
import { testCustomRule, createCustomRule } from '../src/security/custom_rule_engine';

describe('Custom Security Rule Sandbox Engine', () => {
  it('detects prohibited internal pattern in code', () => {
    const code = `
import moment from 'moment'; // Prohibited internal library

export function getFormattedDate() {
  return moment().format();
}
`;

    const res = testCustomRule("from ['\"]moment['\"]", code, 'medium');
    expect(res.matches).toBe(true);
    expect(res.matchCount).toBe(1);
    expect(res.findings[0].line).toBe(2);
  });

  it('handles invalid regular expressions gracefully without crashing', () => {
    const res = testCustomRule('[unclosed-bracket', 'const x = 1;');
    expect(res.matches).toBe(false);
    expect(res.error).toBeDefined();
    expect(res.error).toContain('Invalid regular expression');
  });
});
