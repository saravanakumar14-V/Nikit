import { DocumentParser } from '@nikit/types';
import { PlainTextParser } from './parsers/PlainTextParser';
import { MarkdownParser } from './parsers/MarkdownParser';
import { JsonParser } from './parsers/JsonParser';
import { CsvParser } from './parsers/CsvParser';
import { CodeParser } from './parsers/CodeParser';

export class ParserRegistry {
  private parsers: DocumentParser[] = [];

  constructor() {
    this.register(new PlainTextParser());
    this.register(new MarkdownParser());
    this.register(new JsonParser());
    this.register(new CsvParser());
    this.register(new CodeParser());
  }

  register(parser: DocumentParser): void {
    this.parsers.push(parser);
  }

  getParser(filename: string, mimeType?: string): DocumentParser | null {
    for (const parser of this.parsers) {
      if (parser.canParse(filename, mimeType)) {
        return parser;
      }
    }
    return null;
  }

  isSupported(filename: string, mimeType?: string): boolean {
    return this.getParser(filename, mimeType) !== null;
  }
}

export const parserRegistry = new ParserRegistry();
