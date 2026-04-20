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
  }: {
    entry: { id: string; label: string };
    onChange: (id: string, color: string) => void;
  }) => (
    <button type="button" onClick={() => onChange(entry.id, '#abc123')}>
      built-in:{entry.label}
    </button>
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
    builtInEntries: [{ id: 'file', label: 'Files', color: '#111111' }],
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
    onRulesChange: vi.fn(),
    onToggleDefaultVisibility: vi.fn(),
  };

  it('renders rows and collapses the section body', () => {
    render(<LegendSection {...baseProps} />);

    expect(screen.getByText('built-in:Files')).toBeInTheDocument();
    expect(screen.getByText('Custom')).toBeInTheDocument();
    expect(screen.getByText('Plugin defaults')).toBeInTheDocument();
    expect(screen.getByText('src/**')).toBeInTheDocument();

    fireEvent.click(screen.getByTitle('Toggle Nodes legend section'));

    expect(screen.queryByText('built-in:Files')).not.toBeInTheDocument();
    expect(screen.queryByText('src/**')).not.toBeInTheDocument();
  });

  it('groups plugin default rules by plugin inside the section', () => {
    render(
      <LegendSection
        {...baseProps}
        displayRules={[
          { id: 'node:user', pattern: 'src/**', color: '#123456', target: 'node' },
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

    const customSection = screen.getByText('Custom').closest('[data-testid="legend-rule-subsection"]');
    expect(customSection).not.toBeNull();
    expect(within(customSection as HTMLElement).getByText('src/**')).toBeInTheDocument();
    expect(within(customSection as HTMLElement).getByText('add:node')).toBeInTheDocument();

    const typescriptSection = screen.getByText('TypeScript').closest('[data-testid="legend-rule-subsection"]');
    expect(typescriptSection).not.toBeNull();
    expect(within(typescriptSection as HTMLElement).getByText('*.ts')).toBeInTheDocument();
    expect(within(typescriptSection as HTMLElement).getByText('*.tsx')).toBeInTheDocument();
    expect(within(typescriptSection as HTMLElement).queryByText('*.py')).not.toBeInTheDocument();

    const pythonSection = screen.getByText('Python').closest('[data-testid="legend-rule-subsection"]');
    expect(pythonSection).not.toBeNull();
    expect(within(pythonSection as HTMLElement).getByText('*.py')).toBeInTheDocument();
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
