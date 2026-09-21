import { EvaluationSuite, EvaluationCase, EvaluationRun } from '@nikit/types';

export interface SuiteQuery {
  category?: string;
  search?: string;
  limit?: number;
}

export interface RunQuery {
  suiteId?: string;
  modelId?: string;
  limit?: number;
}

export interface IEvaluationStore {
  // Suites
  saveSuite(suite: EvaluationSuite): Promise<void>;
  getSuite(id: string): Promise<EvaluationSuite | null>;
  listSuites(query?: SuiteQuery): Promise<EvaluationSuite[]>;
  deleteSuite(id: string): Promise<boolean>;

  // Cases
  saveCase(evalCase: EvaluationCase): Promise<void>;
  getCase(id: string): Promise<EvaluationCase | null>;
  listCases(suiteId: string): Promise<EvaluationCase[]>;
  deleteCase(id: string): Promise<boolean>;

  // Runs
  saveRun(run: EvaluationRun): Promise<void>;
  getRun(id: string): Promise<EvaluationRun | null>;
  listRuns(query?: RunQuery): Promise<EvaluationRun[]>;
  deleteRun(id: string): Promise<boolean>;

  clearAll(): Promise<void>;
}
