import { describe, expect, it, vi } from 'vitest';
import { sendGraphViewFileInfoMessage } from '../../../../../src/extension/graphView/files/info/message';

describe('graph view file-info message helper', () => {
  it('sends FILE_INFO when the loader returns a payload', async () => {
    const sendMessage = vi.fn();

    await sendGraphViewFileInfoMessage('src/main.py', {
      loadFileInfo: vi.fn().mockResolvedValue({ path: 'src/main.py', size: 123 }),
      sendMessage,
      logError: vi.fn(),
    });

    expect(sendMessage).toHaveBeenCalledWith({
      type: 'FILE_INFO',
      payload: { path: 'src/main.py', size: 123 },
    });
  });

  it('skips messaging when the loader returns no payload', async () => {
    const sendMessage = vi.fn();
    const logError = vi.fn();

    await sendGraphViewFileInfoMessage('src/main.py', {
      loadFileInfo: vi.fn().mockResolvedValue(undefined),
      sendMessage,
      logError,
    });

    expect(sendMessage).not.toHaveBeenCalled();
    expect(logError).not.toHaveBeenCalled();
  });

  it('logs failures without rethrowing', async () => {
    const logError = vi.fn();

    await sendGraphViewFileInfoMessage('src/main.py', {
      loadFileInfo: vi.fn().mockRejectedValue(new Error('boom')),
      sendMessage: vi.fn(),
      logError,
    });

    expect(logError).toHaveBeenCalledWith('[CodeGraphy] Failed to get file info:', expect.any(Error));
  });
});
