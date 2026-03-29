import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CustomAddForm } from '../../../../../src/webview/components/settingsPanel/groups/custom/AddForm';
import type { GroupEditorState } from '../../../../../src/webview/components/settingsPanel/groups/shared/state/useEditorState';

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

describe('CustomAddForm', () => {
  it('routes add-form changes through controller state setters', () => {
    const controller = buildController({ newPattern: 'src/**', newColor: '#ff00ff' });
    render(<CustomAddForm controller={controller} />);

    fireEvent.change(screen.getByPlaceholderText('src/**'), {
      target: { value: 'src/lib/**' },
    });
    fireEvent.change(screen.getByTitle('Pick color'), {
      target: { value: '#00ff00' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^Add$/i }));

    expect(controller.setNewPattern).toHaveBeenCalledWith('src/lib/**');
    expect(controller.setNewColor).toHaveBeenCalledWith('#00ff00');
    expect(controller.addGroup).toHaveBeenCalled();
  });

  it('adds a group when enter is pressed', () => {
    const controller = buildController({ newPattern: 'src/**' });
    render(<CustomAddForm controller={controller} />);

    fireEvent.keyDown(screen.getByPlaceholderText('src/**'), { key: 'Enter' });

    expect(controller.addGroup).toHaveBeenCalledTimes(1);
  });

  it('does not add a group for other key presses', () => {
    const controller = buildController({ newPattern: 'src/**' });
    render(<CustomAddForm controller={controller} />);

    fireEvent.keyDown(screen.getByPlaceholderText('src/**'), { key: 'Tab' });

    expect(controller.addGroup).not.toHaveBeenCalled();
  });

  it('disables add for whitespace-only patterns', () => {
    const controller = buildController({ newPattern: '   ' });
    render(<CustomAddForm controller={controller} />);

    expect(screen.getByRole('button', { name: /^Add$/i })).toBeDisabled();
  });
});
