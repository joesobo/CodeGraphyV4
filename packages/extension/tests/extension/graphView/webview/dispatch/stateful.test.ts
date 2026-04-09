import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IGroup } from '@/shared/settings/groups';
import { dispatchGraphViewPrimaryStateMessage } from '../../../../../src/extension/graphView/webview/dispatch/stateful';
import { createPrimaryMessageContext } from './context';

describe('graph view primary stateful dispatch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns updated user groups from group messages', async () => {
    const incomingGroups: IGroup[] = [{ id: 'user:src', pattern: 'src/**', color: '#112233' }];
    const context = createPrimaryMessageContext({
      getUserGroups: vi.fn(() => incomingGroups),
    });

    await expect(
      dispatchGraphViewPrimaryStateMessage(
        { type: 'UPDATE_LEGENDS', payload: { legends: incomingGroups } },
        context,
      ),
    ).resolves.toEqual({
      handled: true,
      userGroups: incomingGroups,
    });
  });

  it('returns updated filter patterns from settings messages', async () => {
    const context = createPrimaryMessageContext({
      getPluginFilterPatterns: vi.fn(() => ['venv/**']),
    });

    await expect(
      dispatchGraphViewPrimaryStateMessage(
        { type: 'UPDATE_FILTER_PATTERNS', payload: { patterns: ['dist/**'] } },
        context,
      ),
    ).resolves.toEqual({
      handled: true,
      filterPatterns: ['dist/**'],
    });
  });

  it('returns false when neither stateful family handles the input', async () => {
    await expect(
      dispatchGraphViewPrimaryStateMessage({ type: 'GET_PHYSICS_SETTINGS' }, createPrimaryMessageContext()),
    ).resolves.toEqual({ handled: false });
  });
});
