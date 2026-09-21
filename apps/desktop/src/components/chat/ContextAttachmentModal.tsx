import React, { useState } from 'react';
import { FileText, Code, Folder, Plus, Check } from 'lucide-react';
import { Dialog, Button, Badge } from '@nikit/ui';
import { AttachmentReference, FileSummary } from '@nikit/types';
import { useFiles } from '../../state/FileContext';
import { useProject } from '../../state/ProjectContext';
import { documentStore, fileStore } from '../../services/files';
import styles from './ContextAttachmentModal.module.css';

export interface ContextAttachmentModalProps {
  open: boolean;
  onClose: () => void;
  onAttach: (attachment: AttachmentReference) => void;
  existingAttachmentIds?: string[];
}

export const ContextAttachmentModal: React.FC<ContextAttachmentModalProps> = ({
  open,
  onClose,
  onAttach,
  existingAttachmentIds = [],
}) => {
  const { files } = useFiles();
  const { activeProject } = useProject();
  const [tab, setTab] = useState<'knowledge' | 'workspace' | 'snippet'>('knowledge');

  // Snippet state
  const [snippetName, setSnippetName] = useState('');
  const [snippetContent, setSnippetContent] = useState('');
  const [snippetType, setSnippetType] = useState<'code' | 'file'>('code');
  const [isLoading, setIsLoading] = useState(false);

  // Filter project files
  const projectFiles = files.filter(
    (f) => activeProject && f.projectId === activeProject.id
  );

  const handleSelectFile = async (fileSummary: FileSummary) => {
    setIsLoading(true);
    try {
      const fullFile = await fileStore.get(fileSummary.id);
      let textContent = '';
      if (fullFile?.normalizedDocumentId) {
        const doc = await documentStore.get(fullFile.normalizedDocumentId);
        if (doc) {
          textContent = doc.text;
        }
      }

      const attachment: AttachmentReference = {
        id: fileSummary.id,
        name: fileSummary.name,
        type: fileSummary.fileType === 'code' ? 'code' : 'file',
        sizeBytes: fileSummary.sizeBytes || 0,
        content: textContent,
        mimeType: fullFile?.mimeType,
        path: fullFile?.sourcePath,
      };

      onAttach(attachment);
      onClose();
    } catch {
      // Fallback attachment without full text
      const attachment: AttachmentReference = {
        id: fileSummary.id,
        name: fileSummary.name,
        type: fileSummary.fileType === 'code' ? 'code' : 'file',
        sizeBytes: fileSummary.sizeBytes || 0,
        content: `[File Reference: ${fileSummary.name}]`,
      };
      onAttach(attachment);
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddSnippet = () => {
    if (!snippetContent.trim()) return;

    const attachment: AttachmentReference = {
      id: `snippet-${Date.now()}`,
      name: snippetName.trim() || 'Custom Context Snippet',
      type: snippetType,
      sizeBytes: new TextEncoder().encode(snippetContent).length,
      content: snippetContent.trim(),
      mimeType: snippetType === 'code' ? 'text/plain' : 'text/markdown',
    };

    onAttach(attachment);
    setSnippetName('');
    setSnippetContent('');
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Attach Context to Prompt"
      description="Select indexed documents, workspace files, or paste code snippets to include in prompt context."
      maxWidth={580}
    >
      <div className={styles.modalBody}>
        <div className={styles.tabsRow}>
          <button
            type="button"
            className={`${styles.tabBtn} ${tab === 'knowledge' ? styles.tabBtnActive : ''}`}
            onClick={() => setTab('knowledge')}
          >
            <FileText size={14} />
            <span>Knowledge Base ({files.length})</span>
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${tab === 'workspace' ? styles.tabBtnActive : ''}`}
            onClick={() => setTab('workspace')}
          >
            <Folder size={14} />
            <span>Project Files ({projectFiles.length})</span>
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${tab === 'snippet' ? styles.tabBtnActive : ''}`}
            onClick={() => setTab('snippet')}
          >
            <Code size={14} />
            <span>Raw Snippet</span>
          </button>
        </div>

        {tab === 'knowledge' && (
          <div className={styles.fileList}>
            {files.length === 0 ? (
              <div className={styles.emptyNotice}>
                <FileText size={28} />
                <span>No files found in Knowledge Base. Upload files in the Files view.</span>
              </div>
            ) : (
              files.map((f) => {
                const isAttached = existingAttachmentIds.includes(f.id);
                return (
                  <div
                    key={f.id}
                    className={styles.fileItem}
                    onClick={() => !isAttached && !isLoading && handleSelectFile(f)}
                    style={{ opacity: isAttached ? 0.6 : 1, cursor: isAttached ? 'default' : 'pointer' }}
                  >
                    <div className={styles.fileInfoLeft}>
                      <FileText size={16} className={styles.fileIcon} />
                      <div>
                        <div className={styles.fileName}>{f.name}</div>
                        <div className={styles.fileMeta}>
                          {((f.sizeBytes || 0) / 1024).toFixed(1)} KB · {f.fileType.toUpperCase()}
                        </div>
                      </div>
                    </div>
                    {isAttached ? (
                      <Badge variant="accent" size="sm">
                        <Check size={12} style={{ marginRight: '4px' }} /> Attached
                      </Badge>
                    ) : (
                      <Button variant="ghost" size="sm" leftIcon={<Plus size={14} />} disabled={isLoading}>
                        Attach
                      </Button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {tab === 'workspace' && (
          <div className={styles.fileList}>
            {projectFiles.length === 0 ? (
              <div className={styles.emptyNotice}>
                <Folder size={28} />
                <span>No files scoped to the active project workspace.</span>
              </div>
            ) : (
              projectFiles.map((f) => {
                const isAttached = existingAttachmentIds.includes(f.id);
                return (
                  <div
                    key={f.id}
                    className={styles.fileItem}
                    onClick={() => !isAttached && !isLoading && handleSelectFile(f)}
                    style={{ opacity: isAttached ? 0.6 : 1, cursor: isAttached ? 'default' : 'pointer' }}
                  >
                    <div className={styles.fileInfoLeft}>
                      <Folder size={16} className={styles.fileIcon} />
                      <div>
                        <div className={styles.fileName}>{f.name}</div>
                        <div className={styles.fileMeta}>
                          {((f.sizeBytes || 0) / 1024).toFixed(1)} KB
                        </div>
                      </div>
                    </div>
                    {isAttached ? (
                      <Badge variant="accent" size="sm">
                        <Check size={12} style={{ marginRight: '4px' }} /> Attached
                      </Badge>
                    ) : (
                      <Button variant="ghost" size="sm" leftIcon={<Plus size={14} />} disabled={isLoading}>
                        Attach
                      </Button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {tab === 'snippet' && (
          <div className={styles.snippetForm}>
            <div className={styles.inputGroup}>
              <label className={styles.label}>Snippet Type</label>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <Button
                  type="button"
                  variant={snippetType === 'code' ? 'primary' : 'ghost'}
                  size="sm"
                  leftIcon={<Code size={14} />}
                  onClick={() => setSnippetType('code')}
                >
                  Code Snippet
                </Button>
                <Button
                  type="button"
                  variant={snippetType === 'file' ? 'primary' : 'ghost'}
                  size="sm"
                  leftIcon={<FileText size={14} />}
                  onClick={() => setSnippetType('file')}
                >
                  Text / Markdown
                </Button>
              </div>
            </div>
            <div className={styles.inputGroup}>
              <label className={styles.label}>Snippet Title / Filename</label>
              <input
                type="text"
                className={styles.textInput}
                placeholder="e.g. attention_kernel.py, schema.sql, or Notes"
                value={snippetName}
                onChange={(e) => setSnippetName(e.target.value)}
              />
            </div>
            <div className={styles.inputGroup}>
              <label className={styles.label}>Code or Text Content</label>
              <textarea
                className={styles.textarea}
                placeholder="Paste code, configuration, or text context to attach directly to prompt..."
                value={snippetContent}
                onChange={(e) => setSnippetContent(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
              <Button variant="ghost" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Plus size={14} />}
                onClick={handleAddSnippet}
                disabled={!snippetContent.trim()}
              >
                Attach Snippet
              </Button>
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
};
