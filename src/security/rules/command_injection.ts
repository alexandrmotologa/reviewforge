import { SecurityRule, SecurityFinding } from '../types';

/**
 * Detects command injection vulnerabilities where user input is evaluated inside a shell.
 */
export const commandInjectionRule: SecurityRule = {
  id: 'command-injection',
  title: 'Command Injection Vulnerability',
  cwe: 'CWE-78',
  defaultSeverity: 'critical',

  scan(filePath: string, content: string, modifiedLines?: number[]): SecurityFinding[] {
    const findings: SecurityFinding[] = [];
    const lines = content.split(/\r?\n/);

    const commandPatterns = [
      /\b(?:child_process\.|cp\.)?exec(?:Sync)?\s*\(\s*`[^`]*\$\{.+?\}[^`]*`/i,
      /\b(?:child_process\.|cp\.)?exec(?:Sync)?\s*\(\s*['"][^'"]*['"]\s*\+\s*[a-zA-Z_]\w*/i,
      /\bos\.system\s*\(\s*f?['"][^'"]*\{.+?\}[^'"]*['"]\s*\)/i,
      /\bos\.system\s*\(\s*['"][^'"]*['"]\s*\+\s*[a-zA-Z_]\w*\s*\)/i,
      /\bsubprocess\.(?:Popen|run|call)\s*\(\s*[^,]+shell\s*=\s*True/i
    ];

    for (let i = 0; i < lines.length; i++) {
      const lineNo = i + 1;
      if (modifiedLines && modifiedLines.length > 0 && !modifiedLines.includes(lineNo)) {
        continue;
      }

      const line = lines[i];

      for (const pattern of commandPatterns) {
        if (pattern.test(line)) {
          findings.push({
            ruleId: this.id,
            title: this.title,
            description: 'Shell execution with unescaped variable interpolation detected. Attackers can append command separators (;, &&, |) to execute arbitrary host commands.',
            severity: this.defaultSeverity,
            cwe: this.cwe,
            filePath,
            line: lineNo,
            snippet: line.trim(),
            remediation: 'Use child_process.execFile() or spawn() passing arguments as an array without invoking a system shell.',
            suggestionCode: line.replace(/exec\((.+?)\)/, 'execFile(COMMAND, [args])')
          });
          break;
        }
      }
    }

    return findings;
  }
};
