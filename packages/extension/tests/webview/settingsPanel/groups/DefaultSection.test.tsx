import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DefaultSection } from '../../../../src/webview/components/settingsPanel/groups/DefaultSection';
import type { GroupEditorState } from '../../../../src/webview/components/settingsPanel/groups/useEditorState';

function buildController(overrides: Partial<GroupEditorState> = {}): GroupEditorState {
  return {
    customExpanded: true,
    setCustomExpanded: vi.fn(),
    expandedPluginIds: new Set(['typescript']),
    newColor: '#3B82F6',
    setNewColor: vi.fn(),
    newPattern: '',
    setNewPattern: vi.fn(),
    dragIndex: null,
    dragOverIndex: null,
    localColorOverrides: {},
    localPatternOverrides: {},
    addGroup: vi.fn(),
    updateGroup: vi.fn(),
    overridePluginGroup: vi.fn(),
    changeGroupColor: vi.fn(),
    changePluginGroupColor: vi.fn(),
    changeGroupPattern: vi.fn(),
    deleteGroup: vi.fn(),
    pickImage: vi.fn(),
    clearImage: vi.fn(),
    togglePluginGroupDisabled: vi.fn(),
    togglePluginSectionDisabled: vi.fn(),
    togglePluginExpansion: vi.fn(),
    startGroupDrag: vi.fn(),
    overGroupDrag: vi.fn(),
    dropGroup: vi.fn(),
    endGroupDrag: vi.fn(),
    ...overrides,
  };
}

describe('DefaultSection', () => {
  it('renders section controls and forwards section toggles', () => {
    const controller = buildController();
    render(
      <DefaultSection
        controller={controller}
        expandedGroupId={null}
        section={{
          sectionId: 'typescript',
          sectionName: 'TypeScript',
          groups: [{ id: 'plugin:typescript:ts', pattern: '*.ts', color: '#3178C6' }],
        }}
        setExpandedGroupId={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText('TypeScript'));
    fireEvent.click(screen.getByTitle('Disable all TypeScript groups'));

    expect(controller.togglePluginExpansion).toHaveBeenCalledWith('typescript');
    expect(controller.togglePluginSectionDisabled).toHaveBeenCalledWith('typescript', true);
  });

  it('shows the enabled-group title when all section groups are disabled', () => {
    render(
      <DefaultSection
        controller={buildController({ expandedPluginIds: new Set() })}
        expandedGroupId={null}
        section={{
          sectionId: 'typescript',
          sectionName: 'TypeScript',
          groups: [
            {
              id: 'plugin:typescript:ts',
              pattern: '*.ts',
              color: '#3178C6',
              disabled: true,
            },
          ],
        }}
        setExpandedGroupId={vi.fn()}
      />,
    );

    expect(screen.getByTitle('Enable all TypeScript groups')).toBeInTheDocument();
  });
});
