import { describe, expect, it } from 'vitest';
import {
  applyPendingUserGroupsUpdate,
  createPendingUserGroupsUpdate,
} from '../../../../src/webview/store/optimistic/user';

describe('webview/store/optimistic/user', () => {
  it('creates a defensive pending user-group snapshot', () => {
    const groups = [{ id: 'g1', pattern: '*.tsx', color: '#3178C6' }];
    const pending = createPendingUserGroupsUpdate(groups, 1000);

    groups[0]!.pattern = '*.ts';

    expect(pending).toEqual({
      groups: [{ id: 'g1', pattern: '*.tsx', color: '#3178C6' }],
      expiresAt: 3000,
    });
  });

  it('keeps a pending user-group list applied when the host payload is stale', () => {
    const pending = createPendingUserGroupsUpdate(
      [{ id: 'g1', pattern: '*.tsx', color: '#3178C6' }],
      1000,
    );

    expect(
      applyPendingUserGroupsUpdate(
        [{ id: 'g1', pattern: '*.ts', color: '#3178C6' }],
        pending,
        1500,
      ),
    ).toEqual({
      groups: [{ id: 'g1', pattern: '*.tsx', color: '#3178C6' }],
      pendingUserGroups: pending,
    });
  });

  it('clears a pending user-group list once the host payload matches it', () => {
    const pending = createPendingUserGroupsUpdate(
      [{ id: 'g1', pattern: '*.tsx', color: '#3178C6' }],
      1000,
    );

    expect(
      applyPendingUserGroupsUpdate(
        [{ id: 'g1', pattern: '*.tsx', color: '#3178C6' }],
        pending,
        1500,
      ),
    ).toEqual({
      groups: [{ id: 'g1', pattern: '*.tsx', color: '#3178C6' }],
      pendingUserGroups: null,
    });
  });

  it('drops a pending user-group list once it expires', () => {
    const pending = createPendingUserGroupsUpdate(
      [{ id: 'g1', pattern: '*.tsx', color: '#3178C6' }],
      1000,
    );

    expect(
      applyPendingUserGroupsUpdate(
        [{ id: 'g1', pattern: '*.ts', color: '#3178C6' }],
        pending,
        4000,
      ),
    ).toEqual({
      groups: [{ id: 'g1', pattern: '*.ts', color: '#3178C6' }],
      pendingUserGroups: null,
    });
  });

  it('keeps a pending user-group list applied when the host payload length differs', () => {
    const pending = createPendingUserGroupsUpdate(
      [{ id: 'g1', pattern: '*.tsx', color: '#3178C6' }],
      1000,
    );

    expect(
      applyPendingUserGroupsUpdate(
        [
          { id: 'g1', pattern: '*.tsx', color: '#3178C6' },
          { id: 'g2', pattern: '*.ts', color: '#0EA5E9' },
        ],
        pending,
        1500,
      ),
    ).toEqual({
      groups: [{ id: 'g1', pattern: '*.tsx', color: '#3178C6' }],
      pendingUserGroups: pending,
    });
  });

  it('keeps a pending user-group list applied when the pending list is longer than the host payload', () => {
    const pending = createPendingUserGroupsUpdate(
      [
        { id: 'g1', pattern: '*.tsx', color: '#3178C6' },
        { id: 'g2', pattern: '*.ts', color: '#0EA5E9' },
      ],
      1000,
    );

    expect(
      applyPendingUserGroupsUpdate(
        [{ id: 'g1', pattern: '*.tsx', color: '#3178C6' }],
        pending,
        1500,
      ),
    ).toEqual({
      groups: [
        { id: 'g1', pattern: '*.tsx', color: '#3178C6' },
        { id: 'g2', pattern: '*.ts', color: '#0EA5E9' },
      ],
      pendingUserGroups: pending,
    });
  });

  it('ignores plugin-default groups when deciding whether the host payload matches', () => {
    const pending = createPendingUserGroupsUpdate(
      [
        { id: 'g1', pattern: '*.tsx', color: '#3178C6' },
        { id: 'g2', pattern: '*.ts', color: '#0EA5E9' },
      ],
      1000,
    );

    expect(
      applyPendingUserGroupsUpdate(
        [
          { id: 'g1', pattern: '*.tsx', color: '#3178C6' },
          { id: 'g2', pattern: '*.ts', color: '#0EA5E9' },
          { id: 'plugin:typescript', pattern: '*.md', color: '#6366F1', isPluginDefault: true },
        ],
        pending,
        1500,
      ),
    ).toEqual({
      groups: [
        { id: 'g1', pattern: '*.tsx', color: '#3178C6' },
        { id: 'g2', pattern: '*.ts', color: '#0EA5E9' },
        { id: 'plugin:typescript', pattern: '*.md', color: '#6366F1', isPluginDefault: true },
      ],
      pendingUserGroups: null,
    });
  });

  it('keeps plugin-default groups when applying stale pending user groups', () => {
    const pending = createPendingUserGroupsUpdate(
      [{ id: 'g1', pattern: '*.tsx', color: '#3178C6' }],
      1000,
    );

    expect(
      applyPendingUserGroupsUpdate(
        [
          { id: 'g1', pattern: '*.ts', color: '#3178C6' },
          { id: 'plugin:typescript', pattern: '*.md', color: '#6366F1', isPluginDefault: true },
        ],
        pending,
        1500,
      ),
    ).toEqual({
      groups: [
        { id: 'g1', pattern: '*.tsx', color: '#3178C6' },
        { id: 'plugin:typescript', pattern: '*.md', color: '#6366F1', isPluginDefault: true },
      ],
      pendingUserGroups: pending,
    });
  });

  it('keeps pending user groups when only a later group is stale', () => {
    const pending = createPendingUserGroupsUpdate(
      [
        { id: 'g1', pattern: '*.tsx', color: '#3178C6' },
        { id: 'g2', pattern: '*.ts', color: '#0EA5E9' },
      ],
      1000,
    );

    expect(
      applyPendingUserGroupsUpdate(
        [
          { id: 'g1', pattern: '*.tsx', color: '#3178C6' },
          { id: 'g2', pattern: '*.js', color: '#0EA5E9' },
        ],
        pending,
        1500,
      ),
    ).toEqual({
      groups: [
        { id: 'g1', pattern: '*.tsx', color: '#3178C6' },
        { id: 'g2', pattern: '*.ts', color: '#0EA5E9' },
      ],
      pendingUserGroups: pending,
    });
  });

  it('keeps a pending user-group list applied when a matching group has extra properties', () => {
    const pending = createPendingUserGroupsUpdate(
      [{ id: 'g1', pattern: '*.tsx', color: '#3178C6', description: 'tsx files' } as never],
      1000,
    );

    expect(
      applyPendingUserGroupsUpdate(
        [{ id: 'g1', pattern: '*.tsx', color: '#3178C6' }],
        pending,
        1500,
      ),
    ).toEqual({
      groups: [{ id: 'g1', pattern: '*.tsx', color: '#3178C6', description: 'tsx files' } as never],
      pendingUserGroups: pending,
    });
  });

  it('drops a pending user-group list once it expires exactly at the current time', () => {
    const pending = createPendingUserGroupsUpdate(
      [{ id: 'g1', pattern: '*.tsx', color: '#3178C6' }],
      1000,
    );

    expect(
      applyPendingUserGroupsUpdate(
        [{ id: 'g1', pattern: '*.ts', color: '#3178C6' }],
        pending,
        3000,
      ),
    ).toEqual({
      groups: [{ id: 'g1', pattern: '*.ts', color: '#3178C6' }],
      pendingUserGroups: null,
    });
  });
});
