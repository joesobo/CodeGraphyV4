import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CustomRowHeader } from '../../../../src/webview/components/settingsPanel/groups/CustomRowHeader';
import type { GroupEditorState } from '../../../../src/webview/components/settingsPanel/groups/useEditorState';

function buildController(overrides: Partial<GroupEditorState> = {}): GroupEditorState {
  return {
    customExpanded: true,
    setCustomExpanded: vi.fn(),
    expandedPluginIds: new Set(),
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

describe('CustomRowHeader', () => {
  it('renders row summary details and toggles expansion', () => {
    const controller = buildController();
    const setExpandedGroupId = vi.fn();

    render(
      <CustomRowHeader
        controller={controller}
        displayColor="#ff00ff"
        group={{
          id: 'g1',
          pattern: '*.ts',
          color: '#3178C6',
          imageUrl: 'https://example.com/icon.png',
          shape2D: 'diamond',
        }}
        isExpanded={false}
        setExpandedGroupId={setExpandedGroupId}
      />,
    );

    fireEvent.click(screen.getByText('*.ts'));

    expect(setExpandedGroupId).toHaveBeenCalledWith('g1');
    expect(screen.getByText('diamond')).toBeInTheDocument();
    expect(screen.getByRole('img')).toHaveAttribute('src', 'https://example.com/icon.png');
  });

  it('forwards row actions and uses the enabled title for disabled groups', () => {
    const controller = buildController();

    render(
      <CustomRowHeader
        controller={controller}
        displayColor="#3178C6"
        group={{ id: 'g1', pattern: '*.ts', color: '#3178C6', disabled: true }}
        isExpanded={true}
        setExpandedGroupId={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByTitle('Enable group'));
    fireEvent.click(screen.getByTitle('Delete group'));

    expect(controller.updateGroup).toHaveBeenCalledWith('g1', { disabled: false });
    expect(controller.deleteGroup).toHaveBeenCalledWith('g1');
  });
});
