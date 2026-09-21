import { MessagePart } from '@nikit/types';

/**
 * Parses raw text containing markdown code blocks (```lang\ncode```)
 * into a structured array of TextPart and CodePart objects.
 */
export function parseContentToParts(text: string): MessagePart[] {
  if (!text) return [];

  const parts: MessagePart[] = [];
  const codeBlockRegex = /```(\w+)?(?::([^\n]+))?\n([\s\S]*?)(?:```|$)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = codeBlockRegex.exec(text)) !== null) {
    // Text before the code block
    if (match.index > lastIndex) {
      const textBefore = text.slice(lastIndex, match.index);
      if (textBefore.trim()) {
        parts.push({
          type: 'text',
          content: textBefore,
        });
      }
    }

    // Code block
    const language = match[1] || 'text';
    const explicitFilename = match[2]?.trim();
    let codeContent = match[3] || '';

    // If no explicit filename was in ```lang:filename, check if the first line is a comment filename
    let detectedFilename = explicitFilename;
    if (!detectedFilename) {
      const firstLineMatch = codeContent.match(/^(?:#|\/\/|\/\*)\s*([a-zA-Z0-9_\-./\\]+\.[a-zA-Z0-9]+)\s*(?:\*\/)?\r?\n/);
      if (firstLineMatch) {
        detectedFilename = firstLineMatch[1];
      }
    }

    parts.push({
      type: 'code',
      language,
      filename: detectedFilename,
      content: codeContent.trimEnd(),
    });

    lastIndex = match.index + match[0].length;
  }

  // Remaining text after last code block
  if (lastIndex < text.length) {
    const textAfter = text.slice(lastIndex);
    if (textAfter.trim()) {
      parts.push({
        type: 'text',
        content: textAfter,
      });
    }
  }

  // Fallback if no parts were extracted (e.g. whitespace only)
  if (parts.length === 0 && text) {
    parts.push({
      type: 'text',
      content: text,
    });
  }

  return parts;
}

/**
 * Converts message parts back into full unified text for editing or copying.
 */
export function partsToPlainText(parts: MessagePart[]): string {
  return parts
    .map((p) => {
      if (p.type === 'text') return p.content;
      if (p.type === 'code') {
        const lang = p.language ? `${p.language}` : '';
        return `\`\`\`${lang}\n${p.content}\n\`\`\``;
      }
      return '';
    })
    .join('\n\n');
}
