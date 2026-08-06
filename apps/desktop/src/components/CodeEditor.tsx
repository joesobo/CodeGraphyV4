import { useEffect, useRef, useState } from 'react';
import type { FileDocument } from '../bridge';

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

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let active = true;
    let destroy: (() => void) | undefined;
    setLoadError(undefined);
    void import('./createCodeEditor')
      .then(({ createCodeEditor }) => {
        if (!active) return;
        destroy = createCodeEditor({
          content: document.content,
          onChange: content => onChangeRef.current(content),
          onSave: () => onSaveRef.current(),
          parent: host,
          path: document.path,
        });
      })
      .catch((error: unknown) => {
        if (active) setLoadError(error instanceof Error ? error.message : String(error));
      });
    return () => {
      active = false;
      destroy?.();
    };
  }, [document.content, document.path, document.revision]);

  return loadError
    ? <div className="editor-state editor-state--error">Editor unavailable: {loadError}</div>
    : <div className="editor-host" ref={hostRef} />;
}
