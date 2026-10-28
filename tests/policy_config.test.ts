import { describe, it, expect } from 'vitest';
import { matchesGlob, isFileExcluded, ReviewForgeConfigSchema } from '../src/config/policy';
import { parseConfigFromString } from '../src/config/loader';
import { ReviewForgeEngine } from '../src/engine/reviewer';
import { LLMProvider } from '../src/engine/llm_provider';

describe('Project Policy and Configuration Engine', () => {
  it('parses valid YAML config into typed ReviewForgeConfig', () => {
    const yaml = `
version: 1
min_score: 85
block_on_critical: true
exclude:
  - "tests/**"
  - "dist/**"
rules:
  sql-injection: error
  cors-csrf: ignore
`;

    const config = parseConfigFromString(yaml);
    expect(config.version).toBe(1);
    expect(config.min_score).toBe(85);
    expect(config.block_on_critical).toBe(true);
    expect(config.exclude).toContain('tests/**');
    expect(config.rules['cors-csrf']).toBe('ignore');
  });

  it('matches glob patterns correctly across directories and extensions', () => {
    expect(matchesGlob('tests/user.test.ts', 'tests/**')).toBe(true);
    expect(matchesGlob('src/tests/user.test.ts', '**/tests/**')).toBe(true);
    expect(matchesGlob('src/app.min.js', '**/*.min.js')).toBe(true);
    expect(matchesGlob('src/controller/auth.ts', 'tests/**')).toBe(false);

    expect(isFileExcluded('node_modules/foo/index.js', ['**/node_modules/**'])).toBe(true);
    expect(isFileExcluded('src/app.ts', ['**/node_modules/**', 'tests/**'])).toBe(false);
  });

  it('applies rule exclusions and min_score thresholds during review', async () => {
    const rawDiff = `diff --git a/src/api/auth.ts b/src/api/auth.ts
new file mode 100644
--- /dev/null
+++ b/src/api/auth.ts
@@ -0,0 +1,5 @@
+import { db } from './db';
+export async function findUser(id: string) {
+  return db.query(\`SELECT * FROM users WHERE id = \${id}\`);
+}
+`;

    const engine = new ReviewForgeEngine(undefined, new LLMProvider({ provider: 'offline' }));

    // Review with min_score: 90 should fail because SQL injection reduces score to 75
    const resultFail = await engine.reviewDiff(rawDiff, {
      config: {
        version: 1,
        min_score: 90,
        block_on_critical: false,
        exclude: [],
        rules: {},
        custom_secrets: []
      }
    });
    expect(resultFail.scorecard.passed).toBe(false);

    // Review with sql-injection rule set to 'ignore' should pass with score 100
    const resultIgnore = await engine.reviewDiff(rawDiff, {
      config: {
        version: 1,
        min_score: 80,
        block_on_critical: true,
        exclude: [],
        rules: {
          'sql-injection': 'ignore'
        },
        custom_secrets: []
      }
    });
    expect(resultIgnore.scorecard.findings).toHaveLength(0);
    expect(resultIgnore.scorecard.riskScore).toBe(100);
    expect(resultIgnore.scorecard.passed).toBe(true);
  });
});
