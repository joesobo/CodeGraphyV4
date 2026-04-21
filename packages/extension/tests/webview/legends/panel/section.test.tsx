import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type { IGroup } from '../../../../src/shared/settings/groups';
import { LegendSection } from '../../../../src/webview/components/legends/panel/section/view';

const { postLegendOrderUpdate } = vi.hoisted(() => ({
  postLegendOrderUpdate: vi.fn(),
}));

vi.mock('../../../../src/webview/components/legends/panel/section/order', () => ({
  postLegendOrderUpdate,
}));

vi.mock('../../../../src/webview/components/legends/panel/section/builtInRow', () => ({
  LegendBuiltInRow: ({
    entry,
    onChange,
    onToggleColor,
    showColorToggle,
  }: {
    entry: { id: string; label: string; colorEnabled?: boolean };
    onChange: (id: string, color: string) => void;
    onToggleColor?: (id: string, enabled: boolean) => void;
    showColorToggle?: boolean;
  }) => (
    <div>
      <button type="button" onClick={() => onChange(entry.id, '#abc123')}>
        built-in:{entry.label}
      </button>
      {showColorToggle && onToggleColor ? (
        <button type="button" onClick={() => onToggleColor(entry.id, !(entry.colorEnabled ?? true))}>
          toggle-color:{entry.label}
        </button>
      ) : null}
    </div>
  ),
}));

vi.mock('../../../../src/webview/components/legends/panel/section/createRow', () => ({
  LegendRuleCreateRow: ({
    target,
    onAdd,
  }: {
    target: 'node' | 'edge';
    onAdd: (rule: IGroup) => void;
  }) => (
    <button
      type="button"
      onClick={() =>
        onAdd({
          id: `legend:${target}:new`,
          pattern: `${target}/**`,
          color: '#00ff00',
          target,
        })
      }
    >
      add:{target}
    </button>
  ),
}));

vi.mock('../../../../src/webview/components/legends/panel/section/ruleRow', () => ({
  LegendRuleRow: ({
    rule,
    isDragging,
    isDragOver,
    onChange,
    onRemove,
    onToggleDefaultVisibility,
    onDragStart,
    onDragOver,
    onDrop,
    onDragEnd,
  }: {
    rule: IGroup;
    isDragging: boolean;
    isDragOver: boolean;
    onChange: (rule: IGroup) => void;
    onRemove: () => void;
    onToggleDefaultVisibility: (legendId: string, visible: boolean) => void;
    onDragStart: () => void;
    onDragOver: (event: React.DragEvent<HTMLDivElement>) => void;
    onDrop: (event: React.DragEvent<HTMLDivElement>) => void;
    onDragEnd: () => void;
  }) => (
    <div
      data-testid={`legend-row-${rule.id}`}
      data-dragging={String(isDragging)}
      data-drag-over={String(isDragOver)}
    >
      <span>{rule.pattern}</span>
      <button type="button" onClick={() => onChange({ ...rule, pattern: `${rule.pattern}:updated` })}>
        change:{rule.id}
      </button>
      <button type="button" onClick={onRemove}>
        remove:{rule.id}
      </button>
      <button type="button" onClick={() => onToggleDefaultVisibility(rule.id, false)}>
        toggle:{rule.id}
      </button>
      <button type="button" onClick={onDragStart}>
        drag-start:{rule.id}
      </button>
      <button
        type="button"
        onClick={() => onDragOver({ preventDefault() {} } as React.DragEvent<HTMLDivElement>)}
      >
        drag-over:{rule.id}
      </button>
      <button
        type="button"
        onClick={() => onDrop({ preventDefault() {} } as React.DragEvent<HTMLDivElement>)}
      >
        drop:{rule.id}
      </button>
      <button type="button" onClick={onDragEnd}>
        drag-end:{rule.id}
      </button>
    </div>
  ),
}));

describe('webview/legends/section', () => {
  const baseProps = {
    title: 'Nodes',
    builtInEntries: [{ id: 'file', label: 'Files', color: '#111111', defaultColor: '#111111' }],
    displayRules: [
      { id: 'node:user', pattern: 'src/**', color: '#123456', target: 'node' },
      { id: 'node:second', pattern: 'tests/**', color: '#456789', target: 'node' },
      {
        id: 'node:plugin',
        pattern: '*.ts',
        color: '#3178c6',
        target: 'node',
        isPluginDefault: true,
      },
    ] as IGroup[],
    userRules: [
      { id: 'node:user', pattern: 'src/**', color: '#123456', target: 'node' },
      { id: 'node:second', pattern: 'tests/**', color: '#456789', target: 'node' },
      { id: 'edge:user', pattern: 'call', color: '#654321', target: 'edge' },
    ] as IGroup[],
    legends: [
      { id: 'node:user', pattern: 'src/**', color: '#123456', target: 'node' },
      { id: 'node:second', pattern: 'tests/**', color: '#456789', target: 'node' },
      { id: 'edge:user', pattern: 'call', color: '#654321', target: 'edge' },
    ] as IGroup[],
    target: 'node' as const,
    onBuiltInColorChange: vi.fn(),
    onBuiltInColorToggle: vi.fn(),
    onRulesChange: vi.fn(),
    onToggleDefaultVisibility: vi.fn(),
  };

  it('renders rows and collapses the section body', () => {
    render(<LegendSection {...baseProps} />);

    expect(screen.getByText('built-in:Files')).toBeInTheDocument();
    expect(screen.getByText('toggle-color:Files')).toBeInTheDocument();
    expect(screen.getByText('Custom')).toBeInTheDocument();
    expect(screen.getByText('Plugin defaults')).toBeInTheDocument();
    expect(screen.getByText('Defaults')).toBeInTheDocument();
    expect(screen.getByText('src/**')).toBeInTheDocument();

    fireEvent.click(screen.getByTitle('Toggle Nodes legend section'));

    expect(screen.queryByText('built-in:Files')).not.toBeInTheDocument();
    expect(screen.queryByText('src/**')).not.toBeInTheDocument();
  });

  it('renders node subsections in custom, plugin, material, defaults order', () => {
    render(
      <LegendSection
        {...baseProps}
        builtInEntries={[
          { id: 'file', label: 'Files', color: '#111111', defaultColor: '#111111' },
          { id: 'package', label: 'Packages', color: '#222222', defaultColor: '#222222' },
        ]}
        displayRules={[
          { id: 'node:user', pattern: 'src/**', color: '#123456', target: 'node' },
          {
            id: 'default:*.json',
            pattern: '*.json',
            color: '#f9c74f',
            target: 'node',
            isPluginDefault: true,
            pluginName: 'Material Icon Theme',
          },
          {
            id: 'plugin:codegraphy.typescript:*.ts',
            pattern: '*.ts',
            color: '#3178c6',
            target: 'node',
            isPluginDefault: true,
            pluginId: 'codegraphy.typescript',
            pluginName: 'TypeScript',
          },
          {
            id: 'plugin:codegraphy.typescript:*.tsx',
            pattern: '*.tsx',
            color: '#61dafb',
            target: 'node',
            isPluginDefault: true,
            pluginId: 'codegraphy.typescript',
            pluginName: 'TypeScript',
          },
          {
            id: 'plugin:codegraphy.python:*.py',
            pattern: '*.py',
            color: '#3776ab',
            target: 'node',
            isPluginDefault: true,
            pluginId: 'codegraphy.python',
            pluginName: 'Python',
          },
        ]}
      />,
    );

    const customLabel = screen.getByText('Custom');
    const pluginDefaultsLabel = screen.getByText('Plugin defaults');
    const materialLabel = screen.getAllByText('Material Icon Theme')[0];
    const defaultsLabel = screen.getByText('Defaults');

    expect(customLabel.compareDocumentPosition(pluginDefaultsLabel) & Node.DOCUMENT_POSITION_FOLLOWING)
      .toBeTruthy();
    expect(pluginDefaultsLabel.compareDocumentPosition(materialLabel) & Node.DOCUMENT_POSITION_FOLLOWING)
      .toBeTruthy();
    expect(materialLabel.compareDocumentPosition(defaultsLabel) & Node.DOCUMENT_POSITION_FOLLOWING)
      .toBeTruthy();

    const customSection = screen.getByText('Custom').closest('[data-testid="legend-rule-subsection"]');
    expect(customSection).not.toBeNull();
    expect(within(customSection as HTMLElement).getByText('src/**')).toBeInTheDocument();
    expect(within(customSection as HTMLElement).getByText('add:node')).toBeInTheDocument();

    const materialSection = materialLabel.closest('[data-testid="legend-rule-subsection"]');
    expect(materialSection).not.toBeNull();
    expect(within(materialSection as HTMLElement).getByText('*.json')).toBeInTheDocument();

    const typescriptSection = screen.getByText('TypeScript').closest('[data-testid="legend-rule-subsection"]');
    expect(typescriptSection).not.toBeNull();
    expect(within(typescriptSection as HTMLElement).getByText('*.ts')).toBeInTheDocument();
    expect(within(typescriptSection as HTMLElement).getByText('*.tsx')).toBeInTheDocument();
    expect(within(typescriptSection as HTMLElement).queryByText('*.py')).not.toBeInTheDocument();
    expect(within(typescriptSection as HTMLElement).queryByText('*.json')).not.toBeInTheDocument();

    const pythonSection = screen.getByText('Python').closest('[data-testid="legend-rule-subsection"]');
    expect(pythonSection).not.toBeNull();
    expect(within(pythonSection as HTMLElement).getByText('*.py')).toBeInTheDocument();

    const defaultsSection = screen.getByText('Defaults').closest('[data-testid="legend-rule-subsection"]');
    expect(defaultsSection).not.toBeNull();
    expect(within(defaultsSection as HTMLElement).getByText('built-in:Files')).toBeInTheDocument();
    expect(within(defaultsSection as HTMLElement).getByText('built-in:Packages')).toBeInTheDocument();
  });

  it('collapses plugin groups and toggles all rules in a plugin group', () => {
    render(
      <LegendSection
        {...baseProps}
        displayRules={[
          {
            id: 'plugin:codegraphy.python:*.py',
            pattern: '*.py',
            color: '#3776ab',
            target: 'node',
            isPluginDefault: true,
            pluginId: 'codegraphy.python',
            pluginName: 'Python',
          },
          {
            id: 'plugin:codegraphy.python:*.pyi',
            pattern: '*.pyi',
            color: '#3776ab',
            target: 'node',
            isPluginDefault: true,
            pluginId: 'codegraphy.python',
            pluginName: 'Python',
            disabled: true,
          },
        ]}
      />,
    );

    fireEvent.click(screen.getByTitle('Toggle Python legend entries'));
    expect(baseProps.onToggleDefaultVisibility).toHaveBeenCalledWith(
      'plugin:codegraphy.python:*.py',
      true,
    );
    expect(baseProps.onToggleDefaultVisibility).toHaveBeenCalledWith(
      'plugin:codegraphy.python:*.pyi',
      true,
    );

    fireEvent.click(screen.getByTitle('Collapse Python legend entries'));
    expect(screen.queryByText('*.py')).not.toBeInTheDocument();
    expect(screen.queryByText('*.pyi')).not.toBeInTheDocument();
  });

  it('toggles all custom rules in a section', () => {
    render(<LegendSection {...baseProps} />);

    fireEvent.click(screen.getByTitle('Toggle Custom legend entries'));

    expect(baseProps.onRulesChange).toHaveBeenCalledWith([
      { id: 'node:user', pattern: 'src/**', color: '#123456', target: 'node', disabled: true },
      { id: 'node:second', pattern: 'tests/**', color: '#456789', target: 'node', disabled: true },
    ]);
  });

  it('forwards built-in color changes, added rules, and rule updates to the section callbacks', () => {
    render(<LegendSection {...baseProps} />);

    fireEvent.click(screen.getByText('built-in:Files'));
    expect(baseProps.onBuiltInColorChange).toHaveBeenCalledWith('file', '#abc123');

    fireEvent.click(screen.getByText('add:node'));
    expect(baseProps.onRulesChange).toHaveBeenCalledWith([
      { id: 'node:user', pattern: 'src/**', color: '#123456', target: 'node' },
      { id: 'node:second', pattern: 'tests/**', color: '#456789', target: 'node' },
      { id: 'edge:user', pattern: 'call', color: '#654321', target: 'edge' },
      { id: 'legend:node:new', pattern: 'node/**', color: '#00ff00', target: 'node' },
    ]);

    fireEvent.click(screen.getByText('change:node:user'));
    expect(baseProps.onRulesChange).toHaveBeenCalledWith([
      { id: 'node:user', pattern: 'src/**:updated', color: '#123456', target: 'node' },
      { id: 'node:second', pattern: 'tests/**', color: '#456789', target: 'node' },
    ]);
  });

  it('removes rules and forwards plugin-default visibility toggles', () => {
    render(<LegendSection {...baseProps} />);

    fireEvent.click(screen.getByText('remove:node:user'));
    expect(baseProps.onRulesChange).toHaveBeenCalledWith([
      { id: 'node:second', pattern: 'tests/**', color: '#456789', target: 'node' },
      { id: 'edge:user', pattern: 'call', color: '#654321', target: 'edge' },
    ]);

    fireEvent.click(screen.getByText('toggle:node:plugin'));
    expect(baseProps.onToggleDefaultVisibility).toHaveBeenCalledWith('node:plugin', false);
  });

  it('posts rule reorders only after a drag starts and clears the drag state after the drop', () => {
    render(<LegendSection {...baseProps} />);

    fireEvent.click(screen.getByText('drop:node:user'));
    expect(postLegendOrderUpdate).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText('drag-start:node:plugin'));
    expect(screen.getByTestId('legend-row-node:plugin')).toHaveAttribute('data-dragging', 'true');
    fireEvent.click(screen.getByText('drag-over:node:user'));
    expect(screen.getByTestId('legend-row-node:user')).toHaveAttribute('data-drag-over', 'true');
    fireEvent.click(screen.getByText('drop:node:user'));

    expect(postLegendOrderUpdate).toHaveBeenCalledWith(
      baseProps.displayRules,
      baseProps.legends,
      'node',
      2,
      0,
    );
    expect(screen.getByTestId('legend-row-node:plugin')).toHaveAttribute('data-dragging', 'false');
    expect(screen.getByTestId('legend-row-node:user')).toHaveAttribute('data-drag-over', 'false');

    fireEvent.click(screen.getByText('drop:node:user'));
    expect(postLegendOrderUpdate).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText('drag-start:node:plugin'));
    fireEvent.click(screen.getByText('drag-over:node:user'));
    fireEvent.click(screen.getByText('drag-end:node:plugin'));
    expect(screen.getByTestId('legend-row-node:plugin')).toHaveAttribute('data-dragging', 'false');
    expect(screen.getByTestId('legend-row-node:user')).toHaveAttribute('data-drag-over', 'false');
  });
});
