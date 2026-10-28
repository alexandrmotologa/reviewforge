import * as fs from 'fs';
import * as path from 'path';
import * as YAML from 'yaml';
import { ReviewForgeConfig, ReviewForgeConfigSchema, DEFAULT_CONFIG } from './policy';

/**
 * Searches for and parses a .reviewforge.yml, .reviewforge.yaml, or reviewforge.json file.
 */
export function loadReviewForgeConfig(searchDir: string = process.cwd()): ReviewForgeConfig {
  const candidateNames = [
    '.reviewforge.yml',
    '.reviewforge.yaml',
    'reviewforge.yml',
    'reviewforge.yaml',
    '.reviewforge.json',
    'reviewforge.json'
  ];

  for (const name of candidateNames) {
    const candidatePath = path.join(searchDir, name);
    if (fs.existsSync(candidatePath)) {
      try {
        const rawContent = fs.readFileSync(candidatePath, 'utf8');
        let parsedRaw: any;

        if (name.endsWith('.json')) {
          parsedRaw = JSON.parse(rawContent);
        } else {
          parsedRaw = YAML.parse(rawContent);
        }

        const validated = ReviewForgeConfigSchema.parse(parsedRaw || {});
        return validated;
      } catch (err: any) {
        console.warn(`Warning: Failed to parse config file at ${candidatePath}:`, err.message);
      }
    }
  }

  return DEFAULT_CONFIG;
}

/**
 * Parses config from a raw YAML or JSON string directly.
 */
export function parseConfigFromString(content: string, isJson: boolean = false): ReviewForgeConfig {
  try {
    const parsedRaw = isJson ? JSON.parse(content) : YAML.parse(content);
    return ReviewForgeConfigSchema.parse(parsedRaw || {});
  } catch {
    return DEFAULT_CONFIG;
  }
}
