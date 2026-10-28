import { describe, it, expect } from 'vitest';
import { detectBreakingChanges } from '../src/ast/breaking_changes';

describe('AST Breaking Changes Detector', () => {
  it('detects removed exported functions', () => {
    const oldCode = `
export function add(a: number, b: number): number { return a + b; }
export function subtract(a: number, b: number): number { return a - b; }
`;
    const newCode = `
export function add(a: number, b: number): number { return a + b; }
`;

    const findings = detectBreakingChanges('src/math.ts', oldCode, newCode);
    expect(findings).toHaveLength(1);
    expect(findings[0].type).toBe('export_removed');
    expect(findings[0].symbolName).toBe('subtract');
    expect(findings[0].severity).toBe('critical');
  });

  it('detects newly added required parameter to existing exported function', () => {
    const oldCode = `
export function renderWidget(title: string): string {
  return '<div>' + title + '</div>';
}
`;
    const newCode = `
export function renderWidget(title: string, requiredTheme: string): string {
  return '<div class="' + requiredTheme + '">' + title + '</div>';
}
`;

    const findings = detectBreakingChanges('src/widget.ts', oldCode, newCode);
    expect(findings).toHaveLength(1);
    expect(findings[0].type).toBe('required_param_added');
    expect(findings[0].symbolName).toBe('renderWidget');
    expect(findings[0].description).toContain('requiredTheme');
  });

  it('detects sync to async conversion on public function', () => {
    const oldCode = `
export function calculateChecksum(input: string): string {
  return 'hash_' + input;
}
`;
    const newCode = `
export async function calculateChecksum(input: string): Promise<string> {
  return 'hash_' + input;
}
`;

    const findings = detectBreakingChanges('src/hash.ts', oldCode, newCode);
    expect(findings).toHaveLength(1);
    expect(findings[0].type).toBe('sync_to_async');
    expect(findings[0].symbolName).toBe('calculateChecksum');
    expect(findings[0].severity).toBe('high');
  });
});
