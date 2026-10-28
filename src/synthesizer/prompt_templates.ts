export interface ReviewPromptContext {
  filePath: string;
  language: string;
  scopeName: string;
  scopeCode: string;
  diffHunk: string;
  parameters: Array<{ name: string; type?: string }>;
  staticFindingsSummary?: string;
}

/**
 * Builds the LLM system prompt enforcing high-precision review discipline.
 */
export function buildReviewSystemPrompt(): string {
  return `You are ReviewForge, a high-precision autonomous code reviewer and security auditor.
Analyze the provided code diff within its enclosing AST function scope.

Your review must follow these principles:
1. Focus on real bugs, logic regressions, unhandled edge cases, and security vulnerabilities.
2. Do not post stylistic nitpicks, comment punctuation remarks, or formatting complaints.
3. Every finding that includes a concrete code fix must provide exact code for a 1-click GitHub suggestion block.
4. If the code is correct, return an empty findings list.

Return your response strictly as valid JSON adhering to this schema:
{
  "summary": "1-2 sentence high-level summary of changes and risks",
  "riskScore": 85,
  "findings": [
    {
      "title": "Short title",
      "description": "Clear explanation of the problem and failure scenario",
      "severity": "critical" | "high" | "medium" | "low",
      "line": 42,
      "remediation": "How to fix it",
      "suggestionCode": "Exact replacement code lines"
    }
  ]
}`;
}

/**
 * Builds the prompt for synthesizing runnable unit tests for an enclosing scope.
 */
export function buildTestSynthesisPrompt(context: ReviewPromptContext, framework: string): string {
  return `You are ReviewForge Test Synthesizer.
Generate a complete, self-contained, runnable unit test suite in ${framework} for the following function:

File: ${context.filePath}
Language: ${context.language}
Function: ${context.scopeName}
Parameters: ${JSON.stringify(context.parameters)}

Full Enclosing Implementation:
\`\`\`${context.language}
${context.scopeCode}
\`\`\`

Diff Changes:
\`\`\`diff
${context.diffHunk}
\`\`\`

Requirements:
1. Import the target function from the relative file path.
2. Write a comprehensive test suite covering:
   - Happy path with realistic parameters.
   - Boundary conditions (empty strings, zero, boundary numbers, null/undefined).
   - Error rejection / exception assertions on invalid inputs.
3. Return ONLY valid, executable test code inside a single markdown code block without extra conversational prose.`;
}
