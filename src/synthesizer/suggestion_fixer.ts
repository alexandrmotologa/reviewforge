export interface SuggestionBlockOptions {
  originalCode: string;
  replacementCode: string;
  indentation?: string;
  commentMessage?: string;
}

/**
 * Formats replacement code into GitHub 1-click ```suggestion markdown blocks.
 */
export function formatGitHubSuggestion(options: SuggestionBlockOptions): string {
  const { originalCode, replacementCode, commentMessage } = options;

  // Determine indentation from the original code
  const firstLine = originalCode.split(/\r?\n/)[0] || '';
  const indentMatch = firstLine.match(/^(\s*)/);
  const indent = options.indentation ?? (indentMatch ? indentMatch[1] : '');

  // Indent replacement lines if they do not already have it
  const replacementLines = replacementCode.split(/\r?\n/).map((line, idx) => {
    if (idx === 0 && !line.startsWith(' ') && !line.startsWith('\t')) {
      return indent + line;
    }
    return line;
  });

  const parts: string[] = [];
  if (commentMessage) {
    parts.push(commentMessage);
    parts.push('');
  }

  parts.push('```suggestion');
  parts.push(replacementLines.join('\n'));
  parts.push('```');

  return parts.join('\n');
}
