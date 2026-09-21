import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import {
  FileRecord,
  FileSummary,
  NormalizedDocument,
  DocumentChunk,
} from '@nikit/types';
import {
  fileStore,
  documentStore,
  FileIngestionService,
  RawFileInput,
} from '../services/files';
import {
  chunkStore,
  chunkingService,
} from '../services/knowledge';

export interface FileContextValue {
  files: FileSummary[];
  activeFileId: string | null;
  activeFile: FileRecord | null;
  activeDocument: NormalizedDocument | null;
  activeChunks: DocumentChunk[];
  setActiveFileId: (id: string | null) => void;
  ingestFiles: (inputs: RawFileInput[], projectId?: string | null) => Promise<FileRecord[]>;
  deleteFile: (id: string) => Promise<void>;
  attachFileToProject: (fileId: string, projectId: string | null) => Promise<void>;
  detachFileFromProject: (fileId: string) => Promise<void>;
  retryFile: (fileId: string, rawContent?: string | ArrayBuffer) => Promise<FileRecord>;
  rechunkDocument: (fileId: string) => Promise<DocumentChunk[]>;
  refreshFiles: () => Promise<void>;
}

const FileContext = createContext<FileContextValue | undefined>(undefined);

export interface FileProviderProps {
  children: ReactNode;
}

export const FileProvider: React.FC<FileProviderProps> = ({ children }) => {
  const [files, setFiles] = useState<FileSummary[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [activeFile, setActiveFile] = useState<FileRecord | null>(null);
  const [activeDocument, setActiveDocument] = useState<NormalizedDocument | null>(null);
  const [activeChunks, setActiveChunks] = useState<DocumentChunk[]>([]);

  const refreshFiles = useCallback(async () => {
    try {
      const list = await fileStore.list();
      setFiles(list);
    } catch {
      // Ignore
    }
  }, []);

  const refreshActiveFile = useCallback(async (fileId: string | null) => {
    if (!fileId) {
      setActiveFile(null);
      setActiveDocument(null);
      setActiveChunks([]);
      return;
    }

    try {
      const record = await fileStore.get(fileId);
      setActiveFile(record);

      if (record && record.normalizedDocumentId) {
        const doc = await documentStore.get(record.normalizedDocumentId);
        setActiveDocument(doc);

        if (doc) {
          const chunks = await chunkStore.listByDocument(doc.id);
          setActiveChunks(chunks);
        } else {
          setActiveChunks([]);
        }
      } else {
        setActiveDocument(null);
        setActiveChunks([]);
      }
    } catch {
      setActiveFile(null);
      setActiveDocument(null);
      setActiveChunks([]);
    }
  }, []);

  useEffect(() => {
    refreshFiles();
  }, [refreshFiles]);

  useEffect(() => {
    refreshActiveFile(activeFileId);
  }, [activeFileId, refreshActiveFile]);

  const ingestFiles = useCallback(
    async (inputs: RawFileInput[], projectId?: string | null): Promise<FileRecord[]> => {
      const results: FileRecord[] = [];
      for (const input of inputs) {
        const record = await FileIngestionService.ingest(input, projectId);
        results.push(record);
      }
      await refreshFiles();
      return results;
    },
    [refreshFiles]
  );

  const deleteFile = useCallback(
    async (id: string): Promise<void> => {
      await fileStore.delete(id);
      await refreshFiles();
      if (activeFileId === id) {
        setActiveFileId(null);
      }
    },
    [activeFileId, refreshFiles]
  );

  const attachFileToProject = useCallback(
    async (fileId: string, projectId: string | null): Promise<void> => {
      await fileStore.attachToProject(fileId, projectId);
      await refreshFiles();
      if (activeFileId === fileId) {
        await refreshActiveFile(fileId);
      }
    },
    [activeFileId, refreshFiles, refreshActiveFile]
  );

  const detachFileFromProject = useCallback(
    async (fileId: string): Promise<void> => {
      await fileStore.detachFromProject(fileId);
      await refreshFiles();
      if (activeFileId === fileId) {
        await refreshActiveFile(fileId);
      }
    },
    [activeFileId, refreshFiles, refreshActiveFile]
  );

  const retryFile = useCallback(
    async (fileId: string, rawContent?: string | ArrayBuffer): Promise<FileRecord> => {
      const updated = await FileIngestionService.retry(fileId, rawContent);
      await refreshFiles();
      if (activeFileId === fileId) {
        await refreshActiveFile(fileId);
      }
      return updated;
    },
    [activeFileId, refreshFiles, refreshActiveFile]
  );

  const rechunkDocument = useCallback(
    async (fileId: string): Promise<DocumentChunk[]> => {
      const record = await fileStore.get(fileId);
      if (!record || !record.normalizedDocumentId) {
        return [];
      }

      const doc = await documentStore.get(record.normalizedDocumentId);
      if (!doc) {
        return [];
      }

      const result = await chunkingService.chunkDocument(doc, record);
      if (activeFileId === fileId) {
        setActiveChunks(result.chunks);
      }
      return result.chunks;
    },
    [activeFileId]
  );

  const value: FileContextValue = {
    files,
    activeFileId,
    activeFile,
    activeDocument,
    activeChunks,
    setActiveFileId,
    ingestFiles,
    deleteFile,
    attachFileToProject,
    detachFileFromProject,
    retryFile,
    rechunkDocument,
    refreshFiles,
  };

  return <FileContext.Provider value={value}>{children}</FileContext.Provider>;
};

export const useFiles = (): FileContextValue => {
  const context = useContext(FileContext);
  if (!context) {
    throw new Error('useFiles must be used within a FileProvider');
  }
  return context;
};
