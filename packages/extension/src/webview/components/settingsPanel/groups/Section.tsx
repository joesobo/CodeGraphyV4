import React from 'react';
import { useGraphStore } from '../../../store';
import { CustomGroups } from './Custom';
import { DefaultGroups } from './Defaults';
import { groupSettingsPanelSections } from './model';
import { useEditorState } from './useEditorState';

export function GroupsSection(): React.ReactElement {
  const groups = useGraphStore((state) => state.groups);
  const expandedGroupId = useGraphStore((state) => state.expandedGroupId);
  const setExpandedGroupId = useGraphStore((state) => state.setExpandedGroupId);
  const { userGroups, defaultSections } = groupSettingsPanelSections(groups);
  const controller = useEditorState({ userGroups, setExpandedGroupId });

  return (
    <div className="mb-2 space-y-2">
      <CustomGroups
        userGroups={userGroups}
        expandedGroupId={expandedGroupId}
        setExpandedGroupId={setExpandedGroupId}
        controller={controller}
      />
      <DefaultGroups
        defaultSections={defaultSections}
        expandedGroupId={expandedGroupId}
        setExpandedGroupId={setExpandedGroupId}
        controller={controller}
      />
    </div>
  );
}
