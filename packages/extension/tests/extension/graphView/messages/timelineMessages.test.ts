import { describe, expect, it, vi } from 'vitest';
import {
  applyTimelineMessage,
  type GraphViewTimelineHandlers,
} from '../../../../src/extension/graphView/messages/timelineMessages';

function createHandlers(
  overrides: Partial<GraphViewTimelineHandlers> = {},
): GraphViewTimelineHandlers {
  return {
    indexRepository: vi.fn(() => Promise.resolve()),
    jumpToCommit: vi.fn(() => Promise.resolve()),
    previewFileAtCommit: vi.fn(() => Promise.resolve()),
    ...overrides,
  };
}

describe('graph view timeline message', () => {
  it('awaits commit jumps', async () => {
    const handlers = createHandlers();

    await expect(
      applyTimelineMessage(
        { type: 'JUMP_TO_COMMIT', payload: { sha: 'abc123' } },
        handlers,
      ),
    ).resolves.toBe(true);

    expect(handlers.jumpToCommit).toHaveBeenCalledWith('abc123');
  });

  it('starts file previews at a commit without blocking the caller', async () => {
    const handlers = createHandlers();

    await expect(
      applyTimelineMessage(
        { type: 'PREVIEW_FILE_AT_COMMIT', payload: { sha: 'abc123', filePath: 'src/app.ts' } },
        handlers,
      ),
    ).resolves.toBe(true);

    expect(handlers.previewFileAtCommit).toHaveBeenCalledWith('abc123', 'src/app.ts');
  });

  it('starts repository indexing without blocking the caller', async () => {
    const handlers = createHandlers();

    await expect(
      applyTimelineMessage({ type: 'INDEX_REPO' }, handlers),
    ).resolves.toBe(true);

    expect(handlers.indexRepository).toHaveBeenCalledTimes(1);
  });

  it('returns false for unrelated messages', async () => {
    const handlers = createHandlers();

    await expect(
      applyTimelineMessage(
        { type: 'COPY_TO_CLIPBOARD', payload: { text: 'src/app.ts' } },
        handlers,
      ),
    ).resolves.toBe(false);
  });
});
