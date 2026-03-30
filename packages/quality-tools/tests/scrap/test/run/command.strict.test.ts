import { describe, expect, it, vi } from 'vitest';
import { runScrapCli } from '../../../../src/scrap/command';
import { createDependencies, createMetrics } from './support';

describe('command strict mode', () => {
  it('sets a failing exit code when split files or review-first files are present', () => {
    const dependencies = createDependencies({
      analyzeScrap: () => [
        {
          ...createMetrics()[0],
          aiActionability: 'MANUAL_SPLIT',
          remediationMode: 'SPLIT'
        }
      ]
    });
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    runScrapCli(['--policy', 'strict', 'quality-tools/'], dependencies);

    expect(dependencies.resolveQualityTarget).toHaveBeenCalledWith(
      expect.any(String),
      'quality-tools/'
    );
    expect(dependencies.reportScrap).toHaveBeenCalled();
    expect(dependencies.setExitCode).toHaveBeenCalledWith(1);
    expect(error).toHaveBeenCalledWith(
      'SCRAP strict mode failed: split or review-first files are present.'
    );
    error.mockRestore();
  });

  it('fails split policy only for split files', () => {
    const dependencies = createDependencies({
      analyzeScrap: () => [
        {
          ...createMetrics()[0],
          aiActionability: 'MANUAL_SPLIT',
          remediationMode: 'SPLIT'
        }
      ]
    });
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    runScrapCli(['--policy', 'split', 'quality-tools/'], dependencies);

    expect(dependencies.setExitCode).toHaveBeenCalledWith(1);
    expect(error).toHaveBeenCalledWith('SCRAP split policy failed: split files are present.');
    error.mockRestore();
  });

  it('fails review policy only for review-first files', () => {
    const dependencies = createDependencies({
      analyzeScrap: () => [
        {
          ...createMetrics()[0],
          aiActionability: 'REVIEW_FIRST',
          remediationMode: 'LOCAL'
        }
      ]
    });
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    runScrapCli(['--policy', 'review', 'quality-tools/'], dependencies);

    expect(dependencies.setExitCode).toHaveBeenCalledWith(1);
    expect(error).toHaveBeenCalledWith('SCRAP review policy failed: review-first files are present.');
    error.mockRestore();
  });
});
