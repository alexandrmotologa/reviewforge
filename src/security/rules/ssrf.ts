import { SecurityRule, SecurityFinding } from '../types';

/**
 * Detects Server-Side Request Forgery (SSRF) where dynamic URLs from client inputs
 * are requested without host validation.
 */
export const ssrfRule: SecurityRule = {
  id: 'ssrf',
  title: 'Server-Side Request Forgery (SSRF)',
  cwe: 'CWE-918',
  defaultSeverity: 'high',

  scan(filePath: string, content: string, modifiedLines?: number[]): SecurityFinding[] {
    const findings: SecurityFinding[] = [];
    const lines = content.split(/\r?\n/);

    const ssrfPatterns = [
      /\b(?:fetch|axios\.(?:get|post|put|delete)|http\.(?:get|request)|https\.(?:get|request))\s*\(\s*(?:req\.(?:query|body|params)|url|targetUrl|webhookUrl)\b/i,
      /\burllib\.request\.urlopen\s*\(\s*(?:request\.(?:GET|POST|json)|target_url|user_url)\b/i
    ];

    for (let i = 0; i < lines.length; i++) {
      const lineNo = i + 1;
      if (modifiedLines && modifiedLines.length > 0 && !modifiedLines.includes(lineNo)) {
        continue;
      }

      const line = lines[i];

      // Check if domain validation or URL parse is present
      if (line.includes('ALLOWLIST') || line.includes('allowedHosts') || line.includes('isAllowedUrl')) {
        continue;
      }

      for (const pattern of ssrfPatterns) {
        if (pattern.test(line)) {
          findings.push({
            ruleId: this.id,
            title: this.title,
            description: 'Unvalidated outbound network request detected. Attackers can supply internal IPs (such as 127.0.0.1 or 169.254.169.254) to query cloud metadata or internal microservices.',
            severity: this.defaultSeverity,
            cwe: this.cwe,
            filePath,
            line: lineNo,
            snippet: line.trim(),
            remediation: 'Validate target URL hostname against an allowlist and reject loopback and private CIDR ranges.'
          });
          break;
        }
      }
    }

    return findings;
  }
};
