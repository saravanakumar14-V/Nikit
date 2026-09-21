import { EvaluationCategory } from '@nikit/types';

export const CURRENT_EVAL_STORAGE_SCHEMA_VERSION = 'v1';

export interface CreateSuiteParams {
  name: string;
  description?: string;
  category?: EvaluationCategory;
}

export interface CreateCaseParams {
  suiteId: string;
  prompt: string;
  expectedOutput?: string;
  systemPrompt?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export const BASELINE_EVALUATION_SUITES: Array<{
  name: string;
  description: string;
  category: EvaluationCategory;
  cases: Array<{ prompt: string; expectedOutput?: string; systemPrompt?: string }>;
}> = [
  {
    name: 'Core Instruction Following',
    description: 'Basic constraint compliance and formatting tests',
    category: 'Instruction Following',
    cases: [
      {
        prompt: 'Respond with exactly one word: PHOENIX',
        expectedOutput: 'PHOENIX',
      },
      {
        prompt: 'List the numbers 1 through 5 separated by commas.',
        expectedOutput: '1, 2, 3, 4, 5',
      },
    ],
  },
  {
    name: 'Arithmetic & Simple Reasoning',
    description: 'Elementary math and logical deductions',
    category: 'Reasoning',
    cases: [
      {
        prompt: 'What is 15 multiplied by 4?',
        expectedOutput: '60',
      },
      {
        prompt: 'If all bloops are razzies and all razzies are fuzzies, are all bloops fuzzies? Answer with YES or NO.',
        expectedOutput: 'YES',
      },
    ],
  },
];
