import type { IGroup } from '../../../../../shared/settings/groups';
import { postMessage } from '../../../../vscodeApi';
import { buildSettingsGroupOverride } from './override';

interface GroupActionDependencies {
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

function postSettingsGroups(updated: IGroup[]): void {
  postMessage({ type: 'UPDATE_GROUPS', payload: { groups: updated } });
}

export function createGroupActions(
  dependencies: GroupActionDependencies,
): GroupActionHandlers {
  const sendUserGroups = (updated: IGroup[]) => {
    postSettingsGroups(updated);
  };

  const updateGroup = (groupId: string, updates: Partial<IGroup>) => {
    sendUserGroups(
      dependencies.userGroups.map((group) =>
        group.id === groupId ? { ...group, ...updates } : group,
      ),
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
