import {
  DatasetFormat,
  DatasetRecord,
  DatasetValidationResult,
  DatasetValidationIssue,
  DatasetSplitRatio,
  DatasetSplit,
  LeakageOverlap,
} from '@nikit/types';
import { hashText } from '../files/HashService';

export interface ParsedRawRecord {
  text: string;
  input?: string;
  output?: string;
  messages?: Array<{ role: string; content: string }>;
  metadata?: Record<string, unknown>;
  contentHash: string;
}

export class DatasetValidator {
  /**
   * Parses raw string content into validated normalized records and reports issues.
   */
  static parseAndValidate(
    rawContent: string,
    format: DatasetFormat
  ): {
    records: ParsedRawRecord[];
    validation: DatasetValidationResult;
    duplicateCount: number;
    uniqueHashes: Set<string>;
  } {
    const issues: DatasetValidationIssue[] = [];
    const parsedRecords: ParsedRawRecord[] = [];
    const seenHashes = new Set<string>();
    let duplicateCount = 0;

    const lines = rawContent.split(/\r?\n/);
    let recordIndex = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue; // Skip empty lines

      if (format === 'text') {
        const text = line;
        const cHash = hashText(text);
        if (seenHashes.has(cHash)) {
          duplicateCount++;
          issues.push({
            recordIndex,
            message: `Duplicate plain text record detected at line ${i + 1}.`,
            severity: 'warning',
          });
        } else {
          seenHashes.add(cHash);
        }

        parsedRecords.push({
          text,
          contentHash: cHash,
        });
        recordIndex++;
      } else if (format === 'jsonl') {
        try {
          const json = JSON.parse(line);
          if (!json || typeof json !== 'object') {
            issues.push({
              recordIndex,
              message: `Line ${i + 1} is not a valid JSON object.`,
              severity: 'error',
            });
            continue;
          }

          let extractedText = '';
          let extractedInput: string | undefined;
          let extractedOutput: string | undefined;
          let extractedMessages: Array<{ role: string; content: string }> | undefined;

          // 1. Text format
          if (typeof json.text === 'string') {
            extractedText = json.text.trim();
          }
          // 2. Prompt / Response or Instruction / Output format
          else if (typeof json.prompt === 'string' || typeof json.instruction === 'string') {
            extractedInput = (json.prompt || json.instruction || '').trim();
            if (json.input && typeof json.input === 'string') {
              extractedInput += `\n${json.input.trim()}`;
            }
            extractedOutput = (json.response || json.output || '').trim();
            extractedText = `Input: ${extractedInput}\nOutput: ${extractedOutput}`;
          }
          // 3. Chat Messages format
          else if (Array.isArray(json.messages)) {
            const mappedMessages = json.messages.map((m: Record<string, string>) => ({
              role: String(m.role || 'user'),
              content: String(m.content || ''),
            }));
            extractedMessages = mappedMessages;
            extractedText = mappedMessages.map((m: { role: string; content: string }) => `${m.role}: ${m.content}`).join('\n');
          } else {
            issues.push({
              recordIndex,
              message: `Line ${i + 1} does not match any supported schema ('text', 'prompt/response', 'instruction/output', or 'messages').`,
              severity: 'error',
            });
            continue;
          }

          if (!extractedText.trim()) {
            issues.push({
              recordIndex,
              message: `Line ${i + 1} contains empty content.`,
              severity: 'warning',
            });
          }

          if (extractedText.length > 50000) {
            issues.push({
              recordIndex,
              message: `Line ${i + 1} exceeds 50,000 characters and may overflow context windows.`,
              severity: 'info',
            });
          }

          const cHash = hashText(extractedText);
          if (seenHashes.has(cHash)) {
            duplicateCount++;
            issues.push({
              recordIndex,
              message: `Exact duplicate record detected at line ${i + 1}.`,
              severity: 'warning',
            });
          } else {
            seenHashes.add(cHash);
          }

          parsedRecords.push({
            text: extractedText,
            input: extractedInput,
            output: extractedOutput,
            messages: extractedMessages,
            metadata: json.metadata || undefined,
            contentHash: cHash,
          });
          recordIndex++;
        } catch {
          issues.push({
            recordIndex,
            message: `Malformed JSON at line ${i + 1}.`,
            severity: 'error',
          });
        }
      }
    }

    const errorCount = issues.filter((iss) => iss.severity === 'error').length;
    const warningCount = issues.filter((iss) => iss.severity === 'warning').length;

    return {
      records: parsedRecords,
      validation: {
        valid: errorCount === 0 && parsedRecords.length > 0,
        totalRecords: parsedRecords.length,
        errorCount,
        warningCount,
        issues,
      },
      duplicateCount,
      uniqueHashes: seenHashes,
    };
  }

  /**
   * Deterministically splits records into train, validation, and test sets.
   */
  static splitRecords(
    records: ParsedRawRecord[],
    versionId: string,
    ratios: DatasetSplitRatio,
    seed: number = 42
  ): DatasetRecord[] {
    const total = records.length;
    const trainTarget = Math.floor(total * ratios.train);
    const valTarget = Math.floor(total * ratios.validation);

    // Deterministic pseudo-random sorting via Linear Congruential Generator (LCG)
    const indices = Array.from({ length: total }, (_, i) => i);
    let s = seed;
    for (let i = indices.length - 1; i > 0; i--) {
      s = (s * 1664525 + 1013904223) % 4294967296;
      const j = Math.floor((s / 4294967296) * (i + 1));
      const temp = indices[i];
      indices[i] = indices[j];
      indices[j] = temp;
    }

    const output: DatasetRecord[] = [];

    for (let pos = 0; pos < indices.length; pos++) {
      const originalIdx = indices[pos];
      const rec = records[originalIdx];

      let split: DatasetSplit = 'test';
      if (pos < trainTarget) {
        split = 'train';
      } else if (pos < trainTarget + valTarget) {
        split = 'validation';
      }

      output.push({
        id: `rec-${versionId}-${pos + 1}`,
        datasetVersionId: versionId,
        split,
        text: rec.text,
        input: rec.input,
        output: rec.output,
        messages: rec.messages,
        metadata: rec.metadata,
        contentHash: rec.contentHash,
      });
    }

    return output;
  }

  /**
   * Audits exact-content leakage across train, validation, and test partitions.
   */
  static auditLeakage(records: DatasetRecord[]): {
    totalLeakage: number;
    overlaps: LeakageOverlap[];
  } {
    const trainHashes = new Set<string>();
    const valHashes = new Set<string>();
    const testHashes = new Set<string>();

    for (const r of records) {
      if (r.split === 'train') trainHashes.add(r.contentHash);
      else if (r.split === 'validation') valHashes.add(r.contentHash);
      else if (r.split === 'test') testHashes.add(r.contentHash);
    }

    const trainValOverlap: string[] = [];
    for (const h of valHashes) {
      if (trainHashes.has(h)) trainValOverlap.push(h);
    }

    const trainTestOverlap: string[] = [];
    for (const h of testHashes) {
      if (trainHashes.has(h)) trainTestOverlap.push(h);
    }

    const valTestOverlap: string[] = [];
    for (const h of testHashes) {
      if (valHashes.has(h)) valTestOverlap.push(h);
    }

    const overlaps: LeakageOverlap[] = [];
    if (trainValOverlap.length > 0) {
      overlaps.push({
        splitA: 'train',
        splitB: 'validation',
        overlapCount: trainValOverlap.length,
        sampleHashes: trainValOverlap.slice(0, 5),
      });
    }

    if (trainTestOverlap.length > 0) {
      overlaps.push({
        splitA: 'train',
        splitB: 'test',
        overlapCount: trainTestOverlap.length,
        sampleHashes: trainTestOverlap.slice(0, 5),
      });
    }

    if (valTestOverlap.length > 0) {
      overlaps.push({
        splitA: 'validation',
        splitB: 'test',
        overlapCount: valTestOverlap.length,
        sampleHashes: valTestOverlap.slice(0, 5),
      });
    }

    const totalLeakage =
      trainValOverlap.length + trainTestOverlap.length + valTestOverlap.length;

    return {
      totalLeakage,
      overlaps,
    };
  }
}
