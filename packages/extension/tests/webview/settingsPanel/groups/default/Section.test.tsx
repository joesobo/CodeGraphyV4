import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DefaultSection } from '../../../../../src/webview/components/settingsPanel/groups/default/Section';
import type { GroupEditorState } from '../../../../../src/webview/components/settingsPanel/groups/shared/state/useEditorState';

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
    const { container } = render(
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

    expect(container.firstChild).not.toHaveClass('opacity-50');
    expect(screen.getByTitle('Disable all TypeScript groups')).toBeInTheDocument();

    fireEvent.click(screen.getByText('TypeScript'));
    fireEvent.click(screen.getByTitle('Disable all TypeScript groups'));

    expect(controller.togglePluginExpansion).toHaveBeenCalledWith('typescript');
    expect(controller.togglePluginSectionDisabled).toHaveBeenCalledWith('typescript', true);
  });

  it('applies the disabled wrapper styling and enable title when all section groups are disabled', () => {
    const { container } = render(
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

    expect(container.firstChild).toHaveClass('opacity-50');
    expect(screen.getByTitle('Enable all TypeScript groups')).toBeInTheDocument();
  });

  it('renders plugin rows when the section is expanded', () => {
    render(
      <DefaultSection
        controller={buildController({ expandedPluginIds: new Set(['typescript']) })}
        expandedGroupId={null}
        section={{
          sectionId: 'typescript',
          sectionName: 'TypeScript',
          groups: [{ id: 'plugin:typescript:ts', pattern: '*.ts', color: '#3178C6' }],
        }}
        setExpandedGroupId={vi.fn()}
      />,
    );

    expect(screen.getByText('*.ts')).toBeInTheDocument();
  });

  it('hides plugin rows when the section is collapsed', () => {
    render(
      <DefaultSection
        controller={buildController({ expandedPluginIds: new Set() })}
        expandedGroupId={null}
        section={{
          sectionId: 'typescript',
          sectionName: 'TypeScript',
          groups: [{ id: 'plugin:typescript:ts', pattern: '*.ts', color: '#3178C6' }],
        }}
        setExpandedGroupId={vi.fn()}
      />,
    );

    expect(screen.queryByText('*.ts')).not.toBeInTheDocument();
  });
});
