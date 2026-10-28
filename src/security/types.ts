export type SecuritySeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export interface SecurityFinding {
  ruleId: string;
  title: string;
  description: string;
  severity: SecuritySeverity;
  cwe: string;
  filePath: string;
  line: number;
  column?: number;
  endLine?: number;
  snippet?: string;
  remediation: string;
  suggestionCode?: string;
}

export interface SecurityScorecard {
  totalFindings: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  riskScore: number; // 0 to 100, where 100 is completely secure
  passed: boolean;
  findings: SecurityFinding[];
}

export interface SecurityRule {
  id: string;
  title: string;
  cwe: string;
  defaultSeverity: SecuritySeverity;
  scan(filePath: string, content: string, modifiedLines?: number[]): SecurityFinding[];
}
