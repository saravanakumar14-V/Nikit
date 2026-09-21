import { describe, it, expect } from 'vitest';
import { parseContentToParts, partsToPlainText } from '../services/messageParser';

describe('Message Parser & Part Transformer', () => {
  it('should parse simple markdown text into text parts', () => {
    const raw = 'Hello world! This is a simple response.';
    const parts = parseContentToParts(raw);

    expect(parts.length).toBe(1);
    expect(parts[0]).toEqual({
      type: 'text',
      content: 'Hello world! This is a simple response.',
    });
  });

  it('should parse code blocks and detect language and filename', () => {
    const raw = `Here is the implementation:

\`\`\`python
# tensor_engine.py
import torch

def multiply(a, b):
    return torch.matmul(a, b)
\`\`\`

And that is how it works.`;

    const parts = parseContentToParts(raw);
    expect(parts.length).toBe(3);

    expect(parts[0].type).toBe('text');
    expect(parts[1].type).toBe('code');
    if (parts[1].type === 'code') {
      expect(parts[1].language).toBe('python');
      expect(parts[1].filename).toBe('tensor_engine.py');
      expect(parts[1].content).toContain('def multiply(a, b):');
    }
    expect(parts[2].type).toBe('text');
  });

  it('should convert message parts back to unified plain text', () => {
    const raw = `Introduction paragraph.

\`\`\`typescript
const x: number = 42;
\`\`\`

Conclusion paragraph.`;

    const parts = parseContentToParts(raw);
    const reconstructed = partsToPlainText(parts);

    expect(reconstructed).toContain('Introduction paragraph.');
    expect(reconstructed).toContain('const x: number = 42;');
    expect(reconstructed).toContain('Conclusion paragraph.');
  });
});
