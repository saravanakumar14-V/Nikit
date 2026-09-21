import { Memory, MemoryQuery, MemoryPolicy } from '@nikit/types';

export interface IMemoryStore {
  save(memory: Memory): Promise<void>;
  get(id: string): Promise<Memory | null>;
  list(query?: MemoryQuery): Promise<Memory[]>;
  delete(id: string): Promise<boolean>;
  clearScope(scope: 'user' | 'project', projectId?: string | null): Promise<number>;
  clearAll(): Promise<number>;
  getPolicy(): Promise<MemoryPolicy>;
  savePolicy(policy: MemoryPolicy): Promise<void>;
}
