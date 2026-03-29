import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GroupsSection } from '../../../../src/webview/components/settingsPanel/groups/Section';
import { graphStore } from '../../../../src/webview/store/state';

const sentMessages: unknown[] = [];
vi.mock('../../../../src/webview/vscodeApi', () => ({
  postMessage: (message: unknown) => sentMessages.push(message),
  vscode: { getState: () => undefined, setState: vi.fn() },
}));

function setStoreState(overrides: Record<string, unknown> = {}) {
  graphStore.setState({
    groups: [],
    expandedGroupId: null,
    ...overrides,
  });
}

function renderSection(storeOverrides: Record<string, unknown> = {}) {
  setStoreState(storeOverrides);
  return render(<GroupsSection />);
}

function findMessage<T extends { type: string }>(type: T['type']): T | undefined {
  return sentMessages.find((message) => (message as { type?: string }).type === type) as T | undefined;
}

describe('GroupsSection', () => {
  beforeEach(() => {
    sentMessages.length = 0;
  });

  it('shows an empty-state message when no custom groups exist', () => {
    renderSection();

    expect(screen.getByText('No custom groups.')).toBeInTheDocument();
  });

  it('renders existing custom groups', () => {
    renderSection({
      groups: [{ id: 'g1', pattern: 'src/components/**', color: '#ff0000' }],
    });

    expect(screen.getByText('src/components/**')).toBeInTheDocument();
  });

  it('disables the add button for blank patterns', () => {
    renderSection();

    expect(screen.getByRole('button', { name: /^Add$/i })).toBeDisabled();
  });

  it('adds a new custom group and clears the pattern input', () => {
    renderSection();

    const patternInput = screen.getByPlaceholderText('src/**');
    fireEvent.change(patternInput, { target: { value: 'src/utils/**' } });
    fireEvent.click(screen.getByRole('button', { name: /^Add$/i }));

    expect(patternInput).toHaveValue('');
    expect(findMessage<{ type: 'UPDATE_GROUPS'; payload: { groups: Array<{ pattern: string }> } }>('UPDATE_GROUPS'))
      .toMatchObject({
        type: 'UPDATE_GROUPS',
        payload: { groups: [expect.objectContaining({ pattern: 'src/utils/**' })] },
      });
  });

  it('removes a custom group', () => {
    renderSection({
      groups: [{ id: 'g1', pattern: 'src/**', color: '#00ff00' }],
    });

    fireEvent.click(screen.getByTitle('Delete group'));

    expect(findMessage<{ type: 'UPDATE_GROUPS'; payload: { groups: unknown[] } }>('UPDATE_GROUPS')).toEqual({
      type: 'UPDATE_GROUPS',
      payload: { groups: [] },
    });
  });

  it('toggles a custom group disabled state through UPDATE_GROUPS', () => {
    renderSection({
      groups: [{ id: 'g1', pattern: 'src/**', color: '#00ff00' }],
    });

    fireEvent.click(screen.getByTitle('Disable group'));

    expect(findMessage<{ type: 'UPDATE_GROUPS'; payload: { groups: Array<{ disabled?: boolean }> } }>('UPDATE_GROUPS'))
      .toMatchObject({
        payload: { groups: [expect.objectContaining({ disabled: true })] },
      });
  });

  it('shows built-in default groups under the CodeGraphy section', () => {
    renderSection({
      groups: [
        {
          id: 'default:*.json',
          pattern: '*.json',
          color: '#F9C74F',
          isPluginDefault: true,
          pluginName: 'CodeGraphy',
        },
      ],
    });

    expect(screen.getByText('CodeGraphy')).toBeInTheDocument();
  });

  it('shows plugin default groups in a separate section even when disabled', () => {
    renderSection({
      groups: [
        {
          id: 'plugin:codegraphy.typescript:*.ts',
          pattern: '*.ts',
          color: '#3178C6',
          isPluginDefault: true,
          pluginName: 'TypeScript',
          disabled: true,
        },
      ],
    });

    expect(screen.getByText('TypeScript')).toBeInTheDocument();
  });

  it('posts PICK_GROUP_IMAGE when choosing an image for a custom group', () => {
    renderSection({
      groups: [{ id: 'g1', pattern: '*.ts', color: '#3178C6' }],
    });

    fireEvent.click(screen.getByText('*.ts'));
    fireEvent.click(screen.getByText('Choose Image...'));

    expect(sentMessages).toContainEqual({
      type: 'PICK_GROUP_IMAGE',
      payload: { groupId: 'g1' },
    });
  });

  it('clears a custom group image through UPDATE_GROUPS', () => {
    renderSection({
      groups: [{
        id: 'g1',
        pattern: '*.ts',
        color: '#3178C6',
        imagePath: 'assets/icon.svg',
        imageUrl: 'https://example.com/icon.png',
      }],
    });

    fireEvent.click(screen.getByText('*.ts'));
    fireEvent.click(screen.getByText('Clear'));

    expect(findMessage<{ type: 'UPDATE_GROUPS'; payload: { groups: Array<{ imagePath?: string; imageUrl?: string }> } }>('UPDATE_GROUPS'))
      .toMatchObject({
        payload: { groups: [expect.objectContaining({ imagePath: undefined, imageUrl: undefined })] },
      });
  });

  it('posts TOGGLE_PLUGIN_SECTION_DISABLED when a default section is toggled', () => {
    renderSection({
      groups: [
        {
          id: 'plugin:codegraphy.typescript:*.ts',
          pattern: '*.ts',
          color: '#3178C6',
          isPluginDefault: true,
          pluginName: 'TypeScript',
        },
      ],
    });

    fireEvent.click(screen.getByTitle('Disable all TypeScript groups'));

    expect(sentMessages).toContainEqual({
      type: 'TOGGLE_PLUGIN_SECTION_DISABLED',
      payload: { pluginId: 'codegraphy.typescript', disabled: true },
    });
  });

  it('posts TOGGLE_PLUGIN_GROUP_DISABLED when a default group is toggled', () => {
    renderSection({
      groups: [
        {
          id: 'plugin:codegraphy.typescript:*.ts',
          pattern: '*.ts',
          color: '#3178C6',
          isPluginDefault: true,
          pluginName: 'TypeScript',
        },
      ],
    });

    fireEvent.click(screen.getByText('TypeScript'));
    fireEvent.click(screen.getByTitle('Disable group'));

    expect(sentMessages).toContainEqual({
      type: 'TOGGLE_PLUGIN_GROUP_DISABLED',
      payload: { groupId: 'plugin:codegraphy.typescript:*.ts', disabled: true },
    });
  });

  it('creates a custom override when editing a default group shape', () => {
    renderSection({
      groups: [
        {
          id: 'plugin:codegraphy.typescript:*.ts',
          pattern: '*.ts',
          color: '#3178C6',
          isPluginDefault: true,
          pluginName: 'TypeScript',
        },
      ],
    });

    fireEvent.click(screen.getByText('TypeScript'));
    fireEvent.click(screen.getByText('*.ts'));
    fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 'square' } });

    expect(findMessage<{ type: 'UPDATE_GROUPS'; payload: { groups: Array<{ shape2D?: string }> } }>('UPDATE_GROUPS'))
      .toMatchObject({
        payload: { groups: [expect.objectContaining({ shape2D: 'square' })] },
      });
  });

  it('persists custom group pattern updates after the debounce window', () => {
    vi.useFakeTimers();
    renderSection({
      groups: [{ id: 'g1', pattern: '*.ts', color: '#3178C6' }],
    });

    fireEvent.click(screen.getByText('*.ts'));
    fireEvent.change(screen.getByDisplayValue('*.ts'), { target: { value: '*.tsx' } });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(findMessage<{ type: 'UPDATE_GROUPS'; payload: { groups: Array<{ pattern: string }> } }>('UPDATE_GROUPS'))
      .toMatchObject({
        payload: { groups: [expect.objectContaining({ pattern: '*.tsx' })] },
      });
    vi.useRealTimers();
  });
});
