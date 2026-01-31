import React, { useEffect, useState } from 'react';

interface InitMessage {
  type: 'init';
  payload: {
    version: string;
  };
}

type ExtensionMessage = InitMessage;

export default function App(): React.ReactElement {
  const [version, setVersion] = useState<string>('');

  useEffect(() => {
    const handleMessage = (event: MessageEvent<ExtensionMessage>) => {
      const message = event.data;
      if (message.type === 'init') {
        setVersion(message.payload.version);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="flex items-center gap-3 mb-4">
        <svg
          className="w-10 h-10 text-accent"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="12" cy="12" r="3" />
          <circle cx="4" cy="8" r="2" />
          <circle cx="20" cy="8" r="2" />
          <circle cx="4" cy="16" r="2" />
          <circle cx="20" cy="16" r="2" />
          <line x1="9" y1="10" x2="6" y2="9" />
          <line x1="15" y1="10" x2="18" y2="9" />
          <line x1="9" y1="14" x2="6" y2="15" />
          <line x1="15" y1="14" x2="18" y2="15" />
        </svg>
        <h1 className="text-2xl font-bold text-primary">CodeGraphy</h1>
      </div>
      {version && (
        <p className="text-sm text-secondary">v{version}</p>
      )}
      <p className="mt-6 text-secondary text-center">
        Visualize your codebase as an interactive graph
      </p>
    </div>
  );
}
