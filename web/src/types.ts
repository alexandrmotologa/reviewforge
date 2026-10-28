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
  riskScore: number;
  passed: boolean;
  findings: SecurityFinding[];
}

export interface DiffLine {
  type: 'add' | 'delete' | 'context';
  content: string;
  oldLineNumber?: number;
  newLineNumber?: number;
  position: number;
}

export interface DiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  header: string;
  lines: DiffLine[];
}

export interface FileDiff {
  oldPath?: string;
  newPath: string;
  isNew: boolean;
  isDeleted: boolean;
  isRenamed: boolean;
  hunks: DiffHunk[];
  totalAdditions: number;
  totalDeletions: number;
}

export interface SynthesizedTestFile {
  targetFilePath: string;
  testFilePath: string;
  framework: 'vitest' | 'jest' | 'pytest' | 'go';
  code: string;
  testCount: number;
  isValidSyntax?: boolean;
}

export interface BreakingChangeFinding {
  type: string;
  symbolName: string;
  filePath: string;
  line: number;
  description: string;
  severity: 'critical' | 'high' | 'medium';
  oldSignature?: string;
  newSignature?: string;
}

export interface PullRequestInfo {
  title: string;
  author?: string;
  state: string;
  headBranch?: string;
  baseBranch?: string;
  htmlUrl: string;
  owner: string;
  repo: string;
  pullNumber: number;
}

export interface ReviewResult {
  id: string;
  createdAt: string;
  summary: string;
  scorecard: SecurityScorecard;
  fileDiffs: FileDiff[];
  synthesizedTests: SynthesizedTestFile[];
  breakingChanges: BreakingChangeFinding[];
  patchContent: string;
  generalComments: string[];
  markdownReport: string;
  prInfo?: PullRequestInfo;
}

export interface HealthStatus {
  status: string;
  service: string;
  version: string;
  provider: string;
  model: string;
  providerStatus: {
    ok: boolean;
    message: string;
  };
}
