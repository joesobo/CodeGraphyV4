import React from 'react';
import { DefaultSection } from './Section';
import type { SettingsPanelGroupSection } from '../shared/sections';
import type { GroupEditorState } from '../shared/state/useEditorState';

export function DefaultGroups({
  defaultSections,
  expandedGroupId,
  setExpandedGroupId,
  controller,
}: {
  defaultSections: SettingsPanelGroupSection[];
  expandedGroupId: string | null;
  setExpandedGroupId: (groupId: string | null) => void;
  controller: GroupEditorState;
}): React.ReactElement {
  return (
    <>
      {defaultSections.map((section) => (
        <DefaultSection
          key={section.sectionId}
          controller={controller}
          expandedGroupId={expandedGroupId}
          section={section}
          setExpandedGroupId={setExpandedGroupId}
        />
      ))}
    </>
  );
}
