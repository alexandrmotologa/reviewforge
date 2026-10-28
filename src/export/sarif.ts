import { SecurityFinding, SecurityScorecard } from '../security/types';

export interface SarifReport {
  $schema: string;
  version: string;
  runs: Array<{
    tool: {
      driver: {
        name: string;
        version: string;
        informationUri: string;
        rules: Array<{
          id: string;
          name: string;
          shortDescription: { text: string };
          fullDescription: { text: string };
          defaultConfiguration: {
            level: 'error' | 'warning' | 'note';
          };
          properties: {
            tags: string[];
            cwe: string;
          };
        }>;
      };
    };
    results: Array<{
      ruleId: string;
      level: 'error' | 'warning' | 'note';
      message: { text: string };
      locations: Array<{
        physicalLocation: {
          artifactLocation: {
            uri: string;
          };
          region: {
            startLine: number;
            startColumn?: number;
          };
        };
      }>;
    }>;
  }>;
}

/**
 * Converts ReviewForge security findings into SARIF 2.1.0 format for GitHub Code Scanning.
 */
export function generateSarifReport(findings: SecurityFinding[]): SarifReport {
  const ruleMap = new Map<string, {
    id: string;
    name: string;
    shortDescription: { text: string };
    fullDescription: { text: string };
    defaultConfiguration: { level: 'error' | 'warning' | 'note' };
    properties: { tags: string[]; cwe: string };
  }>();

  for (const f of findings) {
    if (!ruleMap.has(f.ruleId)) {
      const level = f.severity === 'critical' || f.severity === 'high' ? 'error' : f.severity === 'medium' ? 'warning' : 'note';
      ruleMap.set(f.ruleId, {
        id: f.ruleId,
        name: f.title,
        shortDescription: { text: f.title },
        fullDescription: { text: f.description },
        defaultConfiguration: { level },
        properties: {
          tags: ['security', 'owasp', f.cwe.toLowerCase()],
          cwe: f.cwe
        }
      });
    }
  }

  const results = findings.map(f => {
    const level: 'error' | 'warning' | 'note' =
      f.severity === 'critical' || f.severity === 'high' ? 'error' : f.severity === 'medium' ? 'warning' : 'note';

    return {
      ruleId: f.ruleId,
      level,
      message: {
        text: `${f.title}: ${f.description} Remediation: ${f.remediation}`
      },
      locations: [
        {
          physicalLocation: {
            artifactLocation: {
              uri: f.filePath.replace(/\\/g, '/')
            },
            region: {
              startLine: f.line,
              startColumn: f.column || 1
            }
          }
        }
      ]
    };
  });

  return {
    $schema: 'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json',
    version: '2.1.0',
    runs: [
      {
        tool: {
          driver: {
            name: 'ReviewForge',
            version: '1.0.0',
            informationUri: 'https://github.com/alexandrmotologa/reviewforge',
            rules: Array.from(ruleMap.values())
          }
        },
        results
      }
    ]
  };
}
