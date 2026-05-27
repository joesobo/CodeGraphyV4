import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getExportCommands } from '../../../src/extension/commands/export';

function makeProvider() {
  return {
    undo: vi.fn(),
    redo: vi.fn(),
    requestExportPng: vi.fn(),
    requestExportSvg: vi.fn(),
    requestExportJpeg: vi.fn(),
    requestExportJson: vi.fn(),
    requestExportMarkdown: vi.fn(),
    clearCacheAndRefresh: vi.fn().mockResolvedValue(undefined),
  };
}

describe('getExportCommands', () => {

    beforeEach(() => {
      vi.clearAllMocks();
    });

  describe('export commands', () => {

        it('calls requestExportPng on the provider', () => {
          const provider = makeProvider();
          const commands = getExportCommands(provider as never);
          const cmd = commands.find((cmd) => cmd.id === 'codegraphy.exportPng')!;

          cmd.handler();

          expect(provider.requestExportPng).toHaveBeenCalledOnce();
        });



        it('calls requestExportSvg on the provider', () => {
          const provider = makeProvider();
          const commands = getExportCommands(provider as never);
          const cmd = commands.find((cmd) => cmd.id === 'codegraphy.exportSvg')!;

          cmd.handler();

          expect(provider.requestExportSvg).toHaveBeenCalledOnce();
        });



        it('calls requestExportJpeg on the provider', () => {
          const provider = makeProvider();
          const commands = getExportCommands(provider as never);
          const cmd = commands.find((cmd) => cmd.id === 'codegraphy.exportJpeg')!;

          cmd.handler();

          expect(provider.requestExportJpeg).toHaveBeenCalledOnce();
        });



        it('calls requestExportJson on the provider', () => {
          const provider = makeProvider();
          const commands = getExportCommands(provider as never);
          const cmd = commands.find((cmd) => cmd.id === 'codegraphy.exportJson')!;

          cmd.handler();

          expect(provider.requestExportJson).toHaveBeenCalledOnce();
        });



        it('calls requestExportMarkdown on the provider', () => {
          const provider = makeProvider();
          const commands = getExportCommands(provider as never);
          const cmd = commands.find((cmd) => cmd.id === 'codegraphy.exportMarkdown')!;

          cmd.handler();

          expect(provider.requestExportMarkdown).toHaveBeenCalledOnce();
        });
  });

  describe('clearCache command', () => {

        it('calls clearCacheAndRefresh on the provider', () => {
          const provider = makeProvider();
          const commands = getExportCommands(provider as never);
          const cmd = commands.find((cmd) => cmd.id === 'codegraphy.clearCache')!;

          cmd.handler();

          expect(provider.clearCacheAndRefresh).toHaveBeenCalledOnce();
        });
  });
});
