import { describe, expect, it, vi } from 'vitest';
import { createExtensionDiagnosticLogger } from '../../../src/extension/diagnostics/logger';

describe('extension/diagnostics/logger', () => {
  it('stays quiet when verbose diagnostics are disabled', () => {
    const write = vi.fn();
    const logger = createExtensionDiagnosticLogger({
      isEnabled: () => false,
      write,
    });

    logger.emit({
      area: 'extension.lifecycle',
      event: 'activation-started',
      context: { workspaceFolders: 1 },
    });

    expect(write).not.toHaveBeenCalled();
  });

  it('writes human-readable CodeGraphy-prefixed diagnostic facts when enabled', () => {
    const write = vi.fn();
    const logger = createExtensionDiagnosticLogger({
      isEnabled: () => true,
      write,
    });

    logger.emit({
      area: 'extension.lifecycle',
      event: 'activation-started',
      context: { workspaceFolders: 1 },
    });

    expect(write).toHaveBeenCalledOnce();
    expect(write.mock.calls[0][0]).toBe(
      '[CodeGraphy] Activation started: area=extension.lifecycle, workspaceFolders=1',
    );
  });
});
