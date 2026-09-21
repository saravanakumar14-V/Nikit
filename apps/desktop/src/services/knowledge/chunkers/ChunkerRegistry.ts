import { FileType } from '@nikit/types';
import { IChunker } from '../types';
import { MarkdownChunker } from './MarkdownChunker';
import { CodeChunker } from './CodeChunker';
import { CsvChunker } from './CsvChunker';
import { JsonChunker } from './JsonChunker';
import { PlainTextChunker } from './PlainTextChunker';

export class ChunkerRegistry {
  private chunkers: Map<FileType, IChunker> = new Map();
  private fallbackChunker: IChunker = new PlainTextChunker();

  constructor() {
    this.chunkers.set('markdown', new MarkdownChunker());
    this.chunkers.set('code', new CodeChunker());
    this.chunkers.set('csv', new CsvChunker());
    this.chunkers.set('json', new JsonChunker());
    this.chunkers.set('text', new PlainTextChunker());
  }

  getChunker(fileType: FileType): IChunker {
    return this.chunkers.get(fileType) || this.fallbackChunker;
  }
}

export const chunkerRegistry = new ChunkerRegistry();
