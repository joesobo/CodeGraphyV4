import React, { useEffect, useState } from 'react';
import GraphIcon from './components/GraphIcon';

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
        <GraphIcon className="w-10 h-10" />
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
