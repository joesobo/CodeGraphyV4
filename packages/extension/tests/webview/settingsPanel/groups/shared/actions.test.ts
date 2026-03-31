import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IGroup } from '../../../../../src/shared/settings/groups';
import { graphStore } from '../../../../../src/webview/store/state';
import { createGroupActions } from '../../../../../src/webview/components/settingsPanel/groups/shared/actions';

const sentMessages: unknown[] = [];
vi.mock('../../../../../src/webview/vscodeApi', () => ({
  postMessage: (message: unknown) => sentMessages.push(message),
  vscode: { getState: () => undefined, setState: vi.fn() },
}));

describe('settingsPanel groups actions', () => {
  beforeEach(() => {
    sentMessages.length = 0;
    graphStore.setState({ groups: [] });
  });

  it('ignores blank patterns when adding a group', () => {
    const setExpandedGroupId = vi.fn();
    const actions = createGroupActions({
      groups: [],
      newColor: '#3B82F6',
      newPattern: '   ',
      setExpandedGroupId,
      setNewColor: vi.fn(),
      setNewPattern: vi.fn(),
      userGroups: [],
    });

    actions.addGroup();

    expect(sentMessages).toEqual([]);
    expect(setExpandedGroupId).not.toHaveBeenCalled();
  });

  it('adds a trimmed custom group and resets the form state', () => {
    const setExpandedGroupId = vi.fn();
    const setNewColor = vi.fn();
    const setNewPattern = vi.fn();
    const actions = createGroupActions({
      groups: [],
      newColor: '#ff00ff',
      newPattern: '  src/**  ',
      setExpandedGroupId,
      setNewColor,
      setNewPattern,
      userGroups: [],
    });

    actions.addGroup();

    expect(sentMessages.at(-1)).toMatchObject({
      type: 'UPDATE_GROUPS',
      payload: {
        groups: [expect.objectContaining({ pattern: 'src/**', color: '#ff00ff' })],
      },
    });
    expect(setNewPattern).toHaveBeenCalledWith('');
    expect(setNewColor).toHaveBeenCalledWith('#3B82F6');
    expect(setExpandedGroupId).toHaveBeenCalledWith(expect.any(String));
  });

  it('updates, deletes, and clears custom groups through UPDATE_GROUPS', () => {
    const groups: IGroup[] = [
      { id: 'g1', pattern: '*.ts', color: '#3178C6', imagePath: 'icon.svg' },
      { id: 'g2', pattern: '*.tsx', color: '#22C55E' },
    ];
    const actions = createGroupActions({
      groups,
      newColor: '#3B82F6',
      newPattern: '',
      setExpandedGroupId: vi.fn(),
      setNewColor: vi.fn(),
      setNewPattern: vi.fn(),
      userGroups: groups,
    });

    actions.updateGroup('g1', { disabled: true });
    actions.clearImage('g1');
    actions.deleteGroup('g1');

    expect(sentMessages[0]).toEqual({
      type: 'UPDATE_GROUPS',
      payload: {
        groups: [
          { ...groups[0], disabled: true },
          groups[1],
        ],
      },
    });
    expect(sentMessages[1]).toMatchObject({
      payload: {
        groups: expect.arrayContaining([
          expect.objectContaining({ id: 'g1', imagePath: undefined, imageUrl: undefined }),
        ]),
      },
    });
    expect(sentMessages[2]).toEqual({
      type: 'UPDATE_GROUPS',
      payload: { groups: [groups[1]] },
    });
  });

  it('builds plugin overrides and expands the new override group', () => {
    const setExpandedGroupId = vi.fn();
    const actions = createGroupActions({
      groups: [],
      newColor: '#3B82F6',
      newPattern: '',
      setExpandedGroupId,
      setNewColor: vi.fn(),
      setNewPattern: vi.fn(),
      userGroups: [],
    });

    actions.overridePluginGroup(
      {
        id: 'plugin:godot:scenes',
        pattern: 'scenes/**',
        color: '#22C55E',
        imagePath: 'assets/godot.svg',
        isPluginDefault: true,
      },
      { shape2D: 'square' },
    );

    expect(sentMessages.at(-1)).toMatchObject({
      payload: {
        groups: [
          expect.objectContaining({
            imagePath: 'plugin:godot:assets/godot.svg',
            shape2D: 'square',
          }),
        ],
      },
    });
    expect(setExpandedGroupId).toHaveBeenCalledWith(expect.any(String));
  });

  it('posts image-pick and plugin-toggle messages', () => {
    const actions = createGroupActions({
      groups: [],
      newColor: '#3B82F6',
      newPattern: '',
      setExpandedGroupId: vi.fn(),
      setNewColor: vi.fn(),
      setNewPattern: vi.fn(),
      userGroups: [],
    });

    actions.pickImage('g1');
    actions.togglePluginGroupDisabled('g1', true);
    actions.togglePluginSectionDisabled('typescript', true);

    expect(sentMessages).toEqual([
      { type: 'PICK_GROUP_IMAGE', payload: { groupId: 'g1' } },
      { type: 'TOGGLE_PLUGIN_GROUP_DISABLED', payload: { groupId: 'g1', disabled: true } },
      { type: 'TOGGLE_PLUGIN_SECTION_DISABLED', payload: { pluginId: 'typescript', disabled: true } },
    ]);
  });

  it('keeps default groups in the optimistic store when a custom group changes', () => {
    const defaultGroup = {
      id: 'plugin:typescript:ts',
      pattern: '*.ts',
      color: '#3178C6',
      isPluginDefault: true,
      pluginName: 'TypeScript',
    } satisfies IGroup;
    const actions = createGroupActions({
      groups: [
        { id: 'g1', pattern: '*.tsx', color: '#22C55E' },
        defaultGroup,
      ],
      newColor: '#3B82F6',
      newPattern: '',
      setExpandedGroupId: vi.fn(),
      setNewColor: vi.fn(),
      setNewPattern: vi.fn(),
      userGroups: [{ id: 'g1', pattern: '*.tsx', color: '#22C55E' }],
    });

    actions.updateGroup('g1', { pattern: '*.cts' });

    expect(graphStore.getState().groups).toEqual([
      { id: 'g1', pattern: '*.cts', color: '#22C55E' },
      defaultGroup,
    ]);
  });
});
