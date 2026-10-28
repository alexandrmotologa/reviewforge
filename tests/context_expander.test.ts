import { describe, it, expect } from 'vitest';
import { parseUnifiedDiff } from '../src/git/diff_parser';
import { expandFileContext } from '../src/ast/context_expander';
import { parseTypeScriptFile } from '../src/ast/ts_parser';
import { parsePythonFile } from '../src/ast/python_parser';
import { parseGoFile } from '../src/ast/go_parser';

describe('AST Context Expander', () => {
  it('identifies enclosing function and parameters in TypeScript', () => {
    const code = `
import { db } from './database';

export async function getUser(userId: string, activeOnly: boolean = true): Promise<User | null> {
  const query = 'SELECT * FROM users WHERE id = ' + userId;
  return db.query(query);
}
`;

    const parsed = parseTypeScriptFile(code, 'src/users.ts');
    expect(parsed.imports).toHaveLength(1);
    expect(parsed.imports[0].source).toBe('./database');
    expect(parsed.imports[0].importedSymbols).toContain('db');

    expect(parsed.scopes).toHaveLength(1);
    const scope = parsed.scopes[0];
    expect(scope.name).toBe('getUser');
    expect(scope.isAsync).toBe(true);
    expect(scope.isExported).toBe(true);
    expect(scope.parameters).toHaveLength(2);
    expect(scope.parameters[0].name).toBe('userId');
    expect(scope.parameters[1].name).toBe('activeOnly');
    expect(scope.parameters[1].defaultValue).toBe('true');
  });

  it('expands diff hunks into enclosing scopes', () => {
    const rawDiff = `diff --git a/src/service.ts b/src/service.ts
--- a/src/service.ts
+++ b/src/service.ts
@@ -3,3 +3,3 @@
 export function calculateDiscount(price: number): number {
-  return price * 0.1;
+  return price * 0.2;
 }
`;
    const fullContent = `import { logger } from './logger';

export function calculateDiscount(price: number): number {
  return price * 0.2;
}
`;

    const fileDiff = parseUnifiedDiff(rawDiff)[0];
    const expanded = expandFileContext(fileDiff, fullContent);

    expect(expanded.language).toBe('typescript');
    expect(expanded.modifiedScopes).toHaveLength(1);
    expect(expanded.modifiedScopes[0].scope.name).toBe('calculateDiscount');
    expect(expanded.modifiedScopes[0].scope.sourceCode).toContain('calculateDiscount');
  });

  it('parses Python functions, parameters, and decorators', () => {
    const pythonCode = `import os
from typing import Optional

def compute_total(subtotal: float, tax_rate: float = 0.05) -> float:
    discount = 10.0
    return (subtotal - discount) * (1 + tax_rate)

def _internal_helper(x):
    return x * 2
`;

    const parsed = parsePythonFile(pythonCode, 'app/math.py');
    expect(parsed.imports).toHaveLength(2);
    expect(parsed.scopes).toHaveLength(2);

    const computeScope = parsed.scopes.find(s => s.name === 'compute_total');
    expect(computeScope).toBeDefined();
    expect(computeScope?.isExported).toBe(true);
    expect(computeScope?.parameters).toHaveLength(2);
    expect(computeScope?.parameters[0].name).toBe('subtotal');
    expect(computeScope?.parameters[1].name).toBe('tax_rate');
    expect(computeScope?.parameters[1].defaultValue).toBe('0.05');

    const helperScope = parsed.scopes.find(s => s.name === '_internal_helper');
    expect(helperScope?.isExported).toBe(false);
  });

  it('parses Go functions and methods', () => {
    const goCode = `package auth

import (
	"fmt"
	"net/http"
)

type Server struct{}

func (s *Server) HandleLogin(w http.ResponseWriter, r *http.Request) error {
	fmt.Println("login")
	return nil
}

func ValidateToken(token string) bool {
	return len(token) > 0
}
`;

    const parsed = parseGoFile(goCode, 'auth/server.go');
    expect(parsed.imports).toHaveLength(2);
    expect(parsed.scopes).toHaveLength(2);

    const methodScope = parsed.scopes.find(s => s.name.includes('HandleLogin'));
    expect(methodScope).toBeDefined();
    expect(methodScope?.kind).toBe('method');

    const funcScope = parsed.scopes.find(s => s.name === 'ValidateToken');
    expect(funcScope).toBeDefined();
    expect(funcScope?.isExported).toBe(true);
  });
});
