import type { IGroup } from '../../../../../shared/settings/groups';
import { postMessage } from '../../../../vscodeApi';
import { graphStore } from '../../../../store/state';
import { buildSettingsGroupOverride } from './override';
import { replaceSettingsPanelUserGroups } from './sections';

interface GroupActionDependencies {
  groups: IGroup[];
  newColor: string;
  newPattern: string;
  setExpandedGroupId: (groupId: string | null) => void;
  setNewColor: (value: string) => void;
  setNewPattern: (value: string) => void;
  userGroups: IGroup[];
}

export interface GroupActionHandlers {
  addGroup: () => void;
  clearImage: (groupId: string) => void;
  deleteGroup: (groupId: string) => void;
  overridePluginGroup: (group: IGroup, updates: Partial<IGroup>) => void;
  pickImage: (groupId: string) => void;
  sendUserGroups: (updated: IGroup[]) => void;
  togglePluginGroupDisabled: (groupId: string, disabled: boolean) => void;
  togglePluginSectionDisabled: (pluginId: string, disabled: boolean) => void;
  updateGroup: (groupId: string, updates: Partial<IGroup>) => void;
}

export function updateSettingsPanelUserGroups(
  userGroups: IGroup[],
  groupId: string,
  updates: Partial<IGroup>,
): IGroup[] {
  return userGroups.map((group) =>
    group.id === groupId ? { ...group, ...updates } : group,
  );
}

function postSettingsGroups(updated: IGroup[]): void {
  postMessage({ type: 'UPDATE_GROUPS', payload: { groups: updated } });
}

export function createGroupActions(
  dependencies: GroupActionDependencies,
): GroupActionHandlers {
  const syncOptimisticGroups = (updated: IGroup[]) => {
    graphStore.getState().setGroups(
      replaceSettingsPanelUserGroups(dependencies.groups, updated),
    );
  };

  const sendUserGroups = (updated: IGroup[]) => {
    syncOptimisticGroups(updated);
    postSettingsGroups(updated);
  };

  const updateGroup = (groupId: string, updates: Partial<IGroup>) => {
    sendUserGroups(
      updateSettingsPanelUserGroups(dependencies.userGroups, groupId, updates),
    );
  };

  const overridePluginGroup = (group: IGroup, updates: Partial<IGroup>) => {
    const newId = crypto.randomUUID();
    const override = buildSettingsGroupOverride(group, updates, newId);
    sendUserGroups([...dependencies.userGroups, override]);
    dependencies.setExpandedGroupId(newId);
  };

  const addGroup = () => {
    const pattern = dependencies.newPattern.trim();
    if (!pattern) {
      return;
    }

    const newId = crypto.randomUUID();
    sendUserGroups([
      ...dependencies.userGroups,
      { id: newId, pattern, color: dependencies.newColor },
    ]);
    dependencies.setNewPattern('');
    dependencies.setNewColor('#3B82F6');
    dependencies.setExpandedGroupId(newId);
  };

  return {
    addGroup,
    clearImage: (groupId: string) => {
      updateGroup(groupId, { imagePath: undefined, imageUrl: undefined });
    },
    deleteGroup: (groupId: string) => {
      sendUserGroups(
        dependencies.userGroups.filter((group) => group.id !== groupId),
      );
    },
    overridePluginGroup,
    pickImage: (groupId: string) => {
      postMessage({ type: 'PICK_GROUP_IMAGE', payload: { groupId } });
    },
    sendUserGroups,
    togglePluginGroupDisabled: (groupId: string, disabled: boolean) => {
      postMessage({
        type: 'TOGGLE_PLUGIN_GROUP_DISABLED',
        payload: { groupId, disabled },
      });
    },
    togglePluginSectionDisabled: (pluginId: string, disabled: boolean) => {
      postMessage({
        type: 'TOGGLE_PLUGIN_SECTION_DISABLED',
        payload: { pluginId, disabled },
      });
    },
    updateGroup,
  };
}
