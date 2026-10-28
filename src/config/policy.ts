import { z } from 'zod';

export const ConfigRuleActionSchema = z.enum(['error', 'warn', 'ignore']);
export type ConfigRuleAction = z.infer<typeof ConfigRuleActionSchema>;

export const CustomSecretRuleSchema = z.object({
  name: z.string(),
  pattern: z.string(),
  severity: z.enum(['critical', 'high', 'medium', 'low']).default('high')
});
export type CustomSecretRule = z.infer<typeof CustomSecretRuleSchema>;

export const ReviewForgeConfigSchema = z.object({
  version: z.number().default(1),
  min_score: z.number().min(0).max(100).default(70),
  block_on_critical: z.boolean().default(true),
  exclude: z.array(z.string()).default([
    '**/node_modules/**',
    '**/dist/**',
    '**/.git/**',
    '**/*.min.js',
    '**/*.bundle.js'
  ]),
  rules: z.record(ConfigRuleActionSchema).default({}),
  framework: z.enum(['vitest', 'jest', 'pytest', 'go']).optional(),
  custom_secrets: z.array(CustomSecretRuleSchema).default([])
});

export type ReviewForgeConfig = z.infer<typeof ReviewForgeConfigSchema>;

export const DEFAULT_CONFIG: ReviewForgeConfig = {
  version: 1,
  min_score: 70,
  block_on_critical: true,
  exclude: [
    '**/node_modules/**',
    '**/dist/**',
    '**/.git/**',
    '**/*.min.js',
    '**/*.bundle.js'
  ],
  rules: {},
  custom_secrets: []
};

/**
 * Checks if a file path matches a wildcard/glob pattern.
 */
export function matchesGlob(filePath: string, pattern: string): boolean {
  const normalizedPath = filePath.replace(/\\/g, '/').replace(/^\.\//, '');
  let p = pattern.replace(/\\/g, '/').replace(/^\.\//, '');

  let prefix = '^';
  let suffix = '$';

  if (p.startsWith('**/')) {
    prefix = '(?:^|.*/)';
    p = p.slice(3);
  }

  if (p.endsWith('/**')) {
    suffix = '(?:/.*)?$';
    p = p.slice(0, -3);
  }

  // Escape special regex chars except * and ?
  let regexBody = p
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '.*')
    .replace(/(?<!\.)\*/g, '[^/]*')
    .replace(/\?/g, '.');

  try {
    const fullRegex = new RegExp(`${prefix}${regexBody}${suffix}`);
    return fullRegex.test(normalizedPath);
  } catch {
    return false;
  }
}

/**
 * Determines whether a file path should be excluded based on config patterns.
 */
export function isFileExcluded(filePath: string, excludePatterns: string[]): boolean {
  for (const pattern of excludePatterns) {
    if (matchesGlob(filePath, pattern)) {
      return true;
    }
  }
  return false;
}
