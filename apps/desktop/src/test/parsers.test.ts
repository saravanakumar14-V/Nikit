import { describe, it, expect } from 'vitest';
import { PlainTextParser } from '../services/files/parsers/PlainTextParser';
import { MarkdownParser } from '../services/files/parsers/MarkdownParser';
import { JsonParser } from '../services/files/parsers/JsonParser';
import { CsvParser } from '../services/files/parsers/CsvParser';
import { CodeParser } from '../services/files/parsers/CodeParser';

describe('Document Parsers Architecture', () => {
  it('PlainTextParser: parses text files and calculates lines/words/characters', async () => {
    const parser = new PlainTextParser();
    expect(parser.canParse('notes.txt')).toBe(true);
    expect(parser.canParse('notes.pdf')).toBe(false);

    const doc = await parser.parse('f1', 'notes.txt', 'First line\nSecond line with words');
    expect(doc.metadata.lineCount).toBe(2);
    expect(doc.metadata.wordCount).toBe(6);
    expect(doc.text).toBe('First line\nSecond line with words');
  });

  it('MarkdownParser: extracts title from leading header and preserves structure', async () => {
    const parser = new MarkdownParser();
    expect(parser.canParse('readme.md')).toBe(true);

    const content = '# Custom Transformer Architecture\n\nThis paper discusses KV-cache optimization.';
    const doc = await parser.parse('f2', 'readme.md', content);
    expect(doc.title).toBe('Custom Transformer Architecture');
    expect(doc.metadata.sourceType).toBe('markdown');
    expect(doc.metadata.lineCount).toBe(3);
  });

  it('JsonParser: validates JSON syntax and formats normalized document', async () => {
    const parser = new JsonParser();
    expect(parser.canParse('config.json')).toBe(true);

    const validJson = JSON.stringify({ model: 'ZaqX 1.0', layers: 32, heads: 16 });
    const doc = await parser.parse('f3', 'config.json', validJson);
    expect(doc.text).toContain('"model": "ZaqX 1.0"');

    // Malformed JSON throws informative error
    await expect(parser.parse('f3', 'bad.json', '{ model: unquoted }')).rejects.toThrow(
      /JSON parsing error/
    );
  });

  it('CsvParser: formats tabular rows and enforces row limits', async () => {
    const parser = new CsvParser();
    expect(parser.canParse('data.csv')).toBe(true);

    const csvContent = 'id,name,role\n1,Alice,Engineer\n2,Bob,Researcher';
    const doc = await parser.parse('f4', 'data.csv', csvContent);
    expect(doc.text).toContain('id | name | role');
    expect(doc.text).toContain('1 | Alice | Engineer');
    expect(doc.metadata.lineCount).toBe(3);
  });

  it('CodeParser: PRESERVES exact original source text without reformatting', async () => {
    const parser = new CodeParser();
    expect(parser.canParse('kernel.py')).toBe(true);
    expect(parser.canParse('main.rs')).toBe(true);
    expect(parser.canParse('server.ts')).toBe(true);

    const rawPythonCode = `import torch
import torch.nn as nn

class LatentAttention(nn.Module):
    def __init__(self, dim=1024):
        super().__init__()
        self.dim = dim
`;

    const doc = await parser.parse('f5', 'kernel.py', rawPythonCode);
    expect(doc.text).toBe(rawPythonCode); // Exactly identical
    expect(doc.metadata.sourceType).toBe('code');
    expect(doc.metadata.lineCount).toBe(8);
  });
});
