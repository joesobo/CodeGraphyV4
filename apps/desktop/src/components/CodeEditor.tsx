import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import type { FileDocument } from '../bridge';
import { isMarkdownPath } from './markdownPath';
import './CodeEditor.css';

type MarkdownMode = 'edit' | 'split' | 'preview';

const markdownModes: ReadonlyArray<{ label: string; mode: MarkdownMode }> = [
  { label: 'Edit', mode: 'edit' },
  { label: 'Split', mode: 'split' },
  { label: 'Preview', mode: 'preview' },
];

const MarkdownPreview = lazy(async () => {
  const module = await import('./MarkdownPreview');
  return { default: module.MarkdownPreview };
});

export function CodeEditor({
  document,
  onChange,
  onSave,
}: {
  document: FileDocument;
  onChange: (content: string) => void;
  onSave: () => void;
}): React.ReactElement {
  const hostRef = useRef<HTMLDivElement>(null);
  const onChangeRef = useRef(onChange);
  const onSaveRef = useRef(onSave);
  const [loadError, setLoadError] = useState<string>();
  const documentKey = `${document.path}\0${document.revision}`;
  const [markdownDraft, setMarkdownDraft] = useState({
    content: document.content,
    documentKey,
  });
  const [previewDraft, setPreviewDraft] = useState({
    content: document.content,
    documentKey,
  });
  const [markdownMode, setMarkdownMode] = useState<MarkdownMode>('edit');
  const markdown = isMarkdownPath(document.path);
  const markdownContent = markdownDraft.documentKey === documentKey
    ? markdownDraft.content
    : document.content;

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  useEffect(() => {
    if (!markdown || markdownMode === 'edit') return;
    const timeout = window.setTimeout(() => {
      setPreviewDraft({ content: markdownContent, documentKey });
    }, 150);
    return () => window.clearTimeout(timeout);
  }, [documentKey, markdown, markdownContent, markdownMode]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let active = true;
    let destroy: (() => void) | undefined;
    setLoadError(undefined);
    void import('./createCodeEditor')
      .then(({ createCodeEditor }) => createCodeEditor({
        content: document.content,
        onChange: (content) => {
          setMarkdownDraft({ content, documentKey });
          onChangeRef.current(content);
        },
        onSave: () => onSaveRef.current(),
        parent: host,
        path: document.path,
      }))
      .then((created) => {
        if (active) destroy = created;
        else created();
      })
      .catch((error: unknown) => {
        if (active) setLoadError(error instanceof Error ? error.message : String(error));
      });
    return () => {
      active = false;
      destroy?.();
    };
  }, [document.content, document.path, documentKey]);

  if (loadError) {
    return <div className="editor-state editor-state--error">Editor unavailable: {loadError}</div>;
  }

  if (!markdown) return <div className="editor-host" ref={hostRef} />;

  const previewContent = previewDraft.documentKey === documentKey
    ? previewDraft.content
    : markdownContent;

  return (
    <div className={`markdown-editor markdown-editor--${markdownMode}`}>
      <div aria-label="Markdown editor mode" className="markdown-mode-control" role="group">
        {markdownModes.map(({ label, mode }) => (
          <button
            aria-pressed={markdownMode === mode}
            className={markdownMode === mode ? 'is-active' : undefined}
            key={mode}
            onClick={() => {
              if (mode !== 'edit') setPreviewDraft({ content: markdownContent, documentKey });
              setMarkdownMode(mode);
            }}
            type="button"
          >
            {label}
          </button>
        ))}
      </div>
      <div className="markdown-workspace">
        <div className="markdown-source" hidden={markdownMode === 'preview'}>
          <div className="editor-host" ref={hostRef} />
        </div>
        {markdownMode !== 'edit' ? (
          <Suspense fallback={<div className="markdown-preview-limit" role="status">Loading preview…</div>}>
            <MarkdownPreview content={previewContent} />
          </Suspense>
        ) : null}
      </div>
    </div>
  );
}
