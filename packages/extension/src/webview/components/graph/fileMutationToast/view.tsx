import { useEffect } from 'react';
import { graphStore, useGraphStore } from '../../../store/state';

const toastDurationMs = 5_000;

export function FileMutationToast(): React.ReactElement | null {
  const message = useGraphStore(state => state.fileMutationError);

  useEffect(() => {
    if (!message) return;
    const timeout = setTimeout(() => {
      graphStore.setState(state => state.fileMutationError === message
        ? { fileMutationError: null }
        : {});
    }, toastDurationMs);
    return () => clearTimeout(timeout);
  }, [message]);

  if (!message) return null;
  return (
    <div
      role="alert"
      style={{
        background: 'var(--cg-notification-background)',
        border: '1px solid var(--cg-notification-error-border)',
        bottom: 16,
        boxShadow: '0 2px 8px var(--cg-shadow)',
        color: 'var(--cg-notification-foreground)',
        left: '50%',
        maxWidth: 'min(560px, calc(100% - 32px))',
        padding: '8px 12px',
        position: 'absolute',
        transform: 'translateX(-50%)',
        zIndex: 100,
      }}
    >
      {message}
    </div>
  );
}
