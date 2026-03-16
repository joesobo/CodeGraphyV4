import React from 'react';
import { DefaultSection } from './DefaultSection';
import type { SettingsPanelGroupSection } from './sections';
import type { GroupEditorState } from './useEditorState';

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
