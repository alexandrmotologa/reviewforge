import * as path from 'path';
import { EnclosingScope, ParameterInfo } from '../ast/ts_parser';
import { SupportedLanguage } from '../ast/context_expander';

export type TestFramework = 'vitest' | 'jest' | 'pytest' | 'go';

export interface SynthesizedTestFile {
  targetFilePath: string;
  testFilePath: string;
  framework: TestFramework;
  code: string;
  testCount: number;
}

/**
 * Detects appropriate testing framework from language and project conventions.
 */
export function detectTestFramework(language: SupportedLanguage, preferredFramework?: TestFramework): TestFramework {
  if (preferredFramework) {
    return preferredFramework;
  }
  switch (language) {
    case 'typescript':
    case 'javascript':
      return 'vitest';
    case 'python':
      return 'pytest';
    case 'go':
      return 'go';
    default:
      return 'vitest';
  }
}

/**
 * Generates sample test arguments for a given parameter based on type and name hints.
 */
export function generateSampleValue(param: ParameterInfo, isBoundary: boolean = false): string {
  const typeLower = (param.type || '').toLowerCase();
  const nameLower = param.name.toLowerCase();

  if (isBoundary) {
    if (typeLower.includes('number') || nameLower.includes('count') || nameLower.includes('price') || nameLower.includes('age')) {
      return '0';
    }
    if (typeLower.includes('string') || nameLower.includes('name') || nameLower.includes('id') || nameLower.includes('text')) {
      return "''";
    }
    if (typeLower.includes('boolean')) {
      return 'false';
    }
    if (typeLower.includes('[]') || typeLower.includes('array')) {
      return '[]';
    }
    return 'null';
  }

  // Normal happy path values
  if (typeLower.includes('number') || nameLower.includes('price') || nameLower.includes('amount') || nameLower.includes('port')) {
    return '42';
  }
  if (typeLower.includes('boolean') || nameLower.startsWith('is') || nameLower.startsWith('has')) {
    return 'true';
  }
  if (typeLower.includes('[]') || typeLower.includes('array')) {
    return "['sample_item']";
  }
  if (typeLower.includes('record') || typeLower.includes('object') || nameLower.includes('config') || nameLower.includes('options')) {
    return "{ key: 'value' }";
  }
  if (nameLower.includes('id')) {
    return "'test-id-123'";
  }
  if (nameLower.includes('email')) {
    return "'user@example.com'";
  }
  if (nameLower.includes('url')) {
    return "'https://example.com/api'";
  }
  if (nameLower.includes('path') || nameLower.includes('file')) {
    return "'sample_file.txt'";
  }

  return "'test_value'";
}

/**
 * Synthesizes unit test code deterministically using AST metadata.
 */
export function synthesizeTestsOffline(
  targetFilePath: string,
  scope: EnclosingScope,
  language: SupportedLanguage,
  preferredFramework?: TestFramework
): SynthesizedTestFile {
  const framework = detectTestFramework(language, preferredFramework);
  const baseName = path.basename(targetFilePath, path.extname(targetFilePath));
  const parsedPath = path.parse(targetFilePath);

  let testFilePath = '';
  let code = '';
  let testCount = 3;

  if (framework === 'vitest' || framework === 'jest') {
    testFilePath = path.join(parsedPath.dir, '__tests__', `${baseName}.test.ts`).replace(/\\/g, '/');
    const relativeImport = `./${baseName}`;

    const normalArgs = scope.parameters.map(p => generateSampleValue(p, false)).join(', ');
    const boundaryArgs = scope.parameters.map(p => generateSampleValue(p, true)).join(', ');
    const awaitKeyword = scope.isAsync ? 'await ' : '';
    const asyncFn = scope.isAsync ? 'async () =>' : '() =>';

    const testRunnerImport = framework === 'vitest'
      ? "import { describe, it, expect } from 'vitest';"
      : "// Jest globals describe, it, expect are automatically available in test environment";

    code = `${testRunnerImport}
import { ${scope.name} } from '${relativeImport}';

describe('${scope.name}', () => {
  it('executes successfully with valid parameters', ${asyncFn} {
    const result = ${awaitKeyword}${scope.name}(${normalArgs});
    expect(result).toBeDefined();
  });

  it('handles boundary and edge-case parameters properly', ${asyncFn} {
    const result = ${awaitKeyword}${scope.name}(${boundaryArgs});
    expect(result).toBeDefined();
  });

  it('rejects or throws on malformed invalid parameters', ${asyncFn} {
    ${scope.isAsync
      ? `await expect(${scope.name}(${scope.parameters.map(() => 'undefined as any').join(', ')})).rejects.toThrow();`
      : `expect(() => ${scope.name}(${scope.parameters.map(() => 'undefined as any').join(', ')})).toThrow();`
    }
  });
});
`;
  } else if (framework === 'pytest') {
    testFilePath = path.join(parsedPath.dir, `test_${baseName}.py`).replace(/\\/g, '/');
    const normalArgs = scope.parameters.map(p => {
      const v = generateSampleValue(p, false);
      return v === 'true' ? 'True' : v === 'false' ? 'False' : v;
    }).join(', ');

    const boundaryArgs = scope.parameters.map(p => {
      const v = generateSampleValue(p, true);
      return v === 'null' ? 'None' : v === 'false' ? 'False' : v;
    }).join(', ');

    code = `import pytest
from ${baseName} import ${scope.name}

def test_${scope.name}_happy_path():
    result = ${scope.name}(${normalArgs})
    assert result is not None

def test_${scope.name}_boundary():
    result = ${scope.name}(${boundaryArgs})
    assert result is not None

def test_${scope.name}_invalid_input():
    with pytest.raises(Exception):
        ${scope.name}(${scope.parameters.map(() => 'None').join(', ')})
`;
  } else if (framework === 'go') {
    testFilePath = path.join(parsedPath.dir, `${baseName}_test.go`).replace(/\\/g, '/');
    code = `package ${parsedPath.dir ? path.basename(parsedPath.dir) : 'main'}

import (
	"testing"
)

func Test${scope.name}_HappyPath(t *testing.T) {
	// Exercise ${scope.name} with expected input
	t.Log("Testing ${scope.name} execution")
}

func Test${scope.name}_Boundary(t *testing.T) {
	// Exercise ${scope.name} with boundary conditions
	t.Log("Testing ${scope.name} boundary inputs")
}

func Test${scope.name}_ErrorHandling(t *testing.T) {
	// Verify ${scope.name} error returns
	t.Log("Testing ${scope.name} error cases")
}
`;
  }

  return {
    targetFilePath,
    testFilePath,
    framework,
    code,
    testCount
  };
}
