import { SecurityRule, SecurityFinding } from '../types';

/**
 * Detects Path Traversal vulnerabilities where user input is passed directly
 * into filesystem calls without path containment validation.
 */
export const traversalRule: SecurityRule = {
  id: 'path-traversal',
  title: 'Path Traversal Vulnerability',
  cwe: 'CWE-22',
  defaultSeverity: 'high',

  scan(filePath: string, content: string, modifiedLines?: number[]): SecurityFinding[] {
    const findings: SecurityFinding[] = [];
    const lines = content.split(/\r?\n/);

    const traversalPatterns = [
      /\bfs\.(?:readFile|readFileSync|createReadStream|writeFile|writeFileSync|unlink|unlinkSync)\s*\([^)]*(?:req\.(?:query|params|body)|request\.(?:query|params|body)|filePath|userPath|inputPath|filename)/i,
      /\bpath\.(?:join|resolve)\s*\([^)]*(?:req\.(?:query|params|body)|userInput|inputPath|rawPath|filename)/i,
      /\bopen\s*\(\s*(?:req\.(?:query|params|body)|filename|input_file|filePath)\s*,/i
    ];

    for (let i = 0; i < lines.length; i++) {
      const lineNo = i + 1;
      if (modifiedLines && modifiedLines.length > 0 && !modifiedLines.includes(lineNo)) {
        continue;
      }

      const line = lines[i];

      // Check if sanitized with path.basename, path.normalize with startsWith check
      if (line.includes('path.basename(') || line.includes('startsWith(') || line.includes('indexOf(')) {
        continue;
      }

      for (const pattern of traversalPatterns) {
        if (pattern.test(line)) {
          findings.push({
            ruleId: this.id,
            title: this.title,
            description: 'Unvalidated user parameter passed into filesystem resolution. Attackers can supply relative sequences (such as ../) to access restricted server files.',
            severity: this.defaultSeverity,
            cwe: this.cwe,
            filePath,
            line: lineNo,
            snippet: line.trim(),
            remediation: 'Sanitize filename with path.basename() or verify that path.resolve(target) starts with your trusted root directory.',
            suggestionCode: line.replace(/path\.join\((.+?)\)/, 'path.normalize(path.join(SAFE_DIR, path.basename($1)))')
          });
          break;
        }
      }
    }

    return findings;
  }
};
