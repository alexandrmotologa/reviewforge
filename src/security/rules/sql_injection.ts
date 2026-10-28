import { SecurityRule, SecurityFinding } from '../types';

/**
 * Detects SQL injection vulnerabilities where dynamic variables or template literals
 * are passed into SQL query execution methods without parameterization.
 */
export const sqlInjectionRule: SecurityRule = {
  id: 'sql-injection',
  title: 'SQL Injection Vulnerability',
  cwe: 'CWE-89',
  defaultSeverity: 'critical',

  scan(filePath: string, content: string, modifiedLines?: number[]): SecurityFinding[] {
    const findings: SecurityFinding[] = [];
    const lines = content.split(/\r?\n/);

    const queryPatterns = [
      /\b(?:db|client|pool|conn|connection|prisma|sequelize|knex|cursor)\.(?:query|\$queryRawUnsafe|raw|execute)\s*\(\s*`([^`]*\$\{.+?\}[^`]*)`/i,
      /\b(?:db|client|pool|conn|connection|prisma|sequelize|knex|cursor)\.(?:query|\$queryRawUnsafe|raw|execute)\s*\(\s*(['"][^'"]*['"]\s*\+\s*[a-zA-Z_]\w*)/i,
      /\b(?:SELECT\s+.+?\s+FROM|INSERT\s+INTO\s+.+?|DELETE\s+FROM\s+.+?|UPDATE\s+\w+\s+SET)\b[^;]*\$\{.+?\}/i,
      /\b(?:SELECT\s+.+?\s+FROM|INSERT\s+INTO\s+.+?|DELETE\s+FROM\s+.+?|UPDATE\s+\w+\s+SET)\b[^;]*['"]\s*\+\s*[a-zA-Z_]\w*/i
    ];

    for (let i = 0; i < lines.length; i++) {
      const lineNo = i + 1;
      if (modifiedLines && modifiedLines.length > 0 && !modifiedLines.includes(lineNo)) {
        continue;
      }

      const line = lines[i];
      const trimmed = line.trim();

      // Skip comment lines
      if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('#')) {
        continue;
      }

      for (const pattern of queryPatterns) {
        if (pattern.test(line)) {
          // Check if already using parameterized placeholders ($1, ?)
          if (line.includes('$1') || line.includes('?') && !line.includes('${')) {
            continue;
          }

          findings.push({
            ruleId: this.id,
            title: this.title,
            description: 'Unparameterized query execution detected. Variable interpolation in SQL strings allows attackers to manipulate query logic or extract unauthorized data.',
            severity: this.defaultSeverity,
            cwe: this.cwe,
            filePath,
            line: lineNo,
            snippet: line.trim(),
            remediation: 'Use parameterized queries with placeholders ($1, $2 or ?) and pass parameters as a separate arguments array.',
            suggestionCode: line.replace(/`([^`]*)\$\{(.+?)\}([^`]*)`/, "'$1$1?'")
          });
          break;
        }
      }
    }

    return findings;
  }
};
