import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../../src/webview/App';

// Mock window.addEventListener for message handling
const messageListeners: ((event: MessageEvent) => void)[] = [];
vi.stubGlobal('addEventListener', (type: string, listener: (event: MessageEvent) => void) => {
  if (type === 'message') {
    messageListeners.push(listener);
  }
});
vi.stubGlobal('removeEventListener', (type: string, listener: (event: MessageEvent) => void) => {
  if (type === 'message') {
    const index = messageListeners.indexOf(listener);
    if (index > -1) messageListeners.splice(index, 1);
  }
});

describe('App', () => {
  beforeEach(() => {
    messageListeners.length = 0;
  });

  it('should render the CodeGraphy title', () => {
    render(<App />);
    expect(screen.getByText('CodeGraphy')).toBeInTheDocument();
  });

  it('should render the description', () => {
    render(<App />);
    expect(screen.getByText('Visualize your codebase as an interactive graph')).toBeInTheDocument();
  });

  it('should display version when init message is received', async () => {
    render(<App />);

    // Simulate init message from extension
    const initEvent = new MessageEvent('message', {
      data: { type: 'init', payload: { version: '0.1.0' } },
    });

    messageListeners.forEach((listener) => listener(initEvent));

    expect(await screen.findByText('v0.1.0')).toBeInTheDocument();
  });

  it('should render the graph icon', () => {
    render(<App />);
    const svg = document.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });
});
