import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DefaultRow } from '../../../../../src/webview/components/settingsPanel/groups/default/Row';
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

describe('DefaultRow', () => {
  it('renders collapsed plugin rows and forwards the visibility toggle', () => {
    const controller = buildController();
    const setExpandedGroupId = vi.fn();
    render(
      <ul>
        <DefaultRow
          controller={controller}
          group={{ id: 'plugin:typescript:ts', pattern: '*.ts', color: '#3178C6' }}
          isExpanded={false}
          setExpandedGroupId={setExpandedGroupId}
        />
      </ul>,
    );

    expect(screen.getByText('*.ts').closest('li')).toHaveClass('rounded');
    expect(screen.getByText('*.ts').closest('li')).toHaveClass('transition-colors');

    fireEvent.click(screen.getByText('*.ts'));
    fireEvent.click(screen.getByTitle('Disable group'));

    expect(setExpandedGroupId).toHaveBeenCalledWith('plugin:typescript:ts');
    expect(controller.togglePluginGroupDisabled).toHaveBeenCalledWith(
      'plugin:typescript:ts',
      true,
    );
  });

  it('renders expanded plugin override controls', () => {
    const controller = buildController({
      localColorOverrides: { 'plugin:typescript:ts': '#ff00ff' },
    });
    render(
      <ul>
        <DefaultRow
          controller={controller}
          group={{
            id: 'plugin:typescript:ts',
            pattern: '*.ts',
            color: '#3178C6',
            imageUrl: 'https://example.com/icon.png',
          }}
          isExpanded={true}
          setExpandedGroupId={vi.fn()}
        />
      </ul>,
    );

    fireEvent.change(screen.getAllByRole('combobox')[0], {
      target: { value: 'square' },
    });
    fireEvent.change(screen.getAllByRole('combobox')[1], {
      target: { value: 'cube' },
    });

    expect(screen.getByRole('img')).toHaveAttribute('src', 'https://example.com/icon.png');
    expect(controller.overridePluginGroup).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'plugin:typescript:ts' }),
      { shape2D: 'square' },
    );
    expect(controller.overridePluginGroup).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'plugin:typescript:ts' }),
      { shape3D: 'cube' },
    );
  });

  it('uses the enabled-group title for disabled plugin rows', () => {
    render(
      <ul>
        <DefaultRow
          controller={buildController()}
          group={{
            id: 'plugin:typescript:ts',
            pattern: '*.ts',
            color: '#3178C6',
            disabled: true,
          }}
          isExpanded={false}
          setExpandedGroupId={vi.fn()}
        />
      </ul>,
    );

    expect(screen.getByTitle('Enable group')).toBeInTheDocument();
  });
});
