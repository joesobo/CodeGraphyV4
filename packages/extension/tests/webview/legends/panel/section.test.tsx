import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type { IGroup } from '../../../../src/shared/settings/groups';
import { LegendSection } from '../../../../src/webview/components/legends/panel/section/view';
import { getPluginRuleGroupStorageKey } from '../../../../src/webview/components/legends/panel/section/pluginSubsection';
import {
  getCustomSectionStorageKey,
  getDefaultSectionStorageKey,
} from '../../../../src/webview/components/legends/panel/section/rulesLayout';
import {
  getLegendSubsectionCollapseTitle,
  stopSubsectionTogglePropagation,
} from '../../../../src/webview/components/legends/panel/section/subsection';

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
    <div>
      <button type="button" onClick={() => onChange(entry.id, '#abc123')}>
        built-in:{entry.label}
      </button>
    </div>
  ),
}));

vi.mock('../../../../src/webview/components/legends/panel/section/createRow', () => ({
  LegendRuleCreateRow: ({
    target,
    onAdd,
  }: {
    target: 'node' | 'edge';
    onAdd: (rule: IGroup, iconImports?: Array<{ path: string; content: string; format: 'svg' }>) => void;
  }) => (
    <>
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
      <button
        type="button"
        onClick={() =>
          onAdd(
            {
              id: `legend:${target}:icon`,
              pattern: `${target}/icon/**`,
              color: '#00ff00',
              target,
              imagePath: `.codegraphy/icons/${target}.svg`,
            },
            [{ path: `.codegraphy/icons/${target}.svg`, content: '<svg />', format: 'svg' }],
          )
        }
      >
        add-icon:{target}
      </button>
    </>
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
      <span>{rule.displayLabel ?? rule.pattern}</span>
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
    collapsedEntries: {},
    onBuiltInColorChange: vi.fn(),
    onCollapsedChange: vi.fn(),
    onRulesChange: vi.fn(),
    onToggleDefaultVisibility: vi.fn(),
    onToggleDefaultVisibilityBatch: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders rows and collapses the section body', () => {
    const onCollapsedChange = vi.fn();
    render(<LegendSection {...baseProps} onCollapsedChange={onCollapsedChange} />);

    expect(screen.getByText('built-in:Files')).toBeInTheDocument();
    expect(screen.getByText('Custom')).toBeInTheDocument();
    expect(screen.getByText('Plugins')).toBeInTheDocument();
    expect(screen.getByText('Defaults')).toBeInTheDocument();
    expect(screen.getByText('src/**')).toBeInTheDocument();

    fireEvent.click(screen.getByTitle('Toggle Nodes legend section'));

    expect(onCollapsedChange).toHaveBeenCalledWith('section:nodes', true);
  });

  it('renders node subsections in custom, plugin, material, defaults order without nesting a duplicate material group', () => {
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
            id: 'plugin:codegraphy.vue:*.py',
            pattern: '*.py',
            color: '#3776ab',
            target: 'node',
            isPluginDefault: true,
            pluginId: 'codegraphy.vue',
            pluginName: 'Python',
          },
          {
            id: 'plugin:codegraphy.gdscript:symbol:godot-class-name',
            pattern: '**',
            displayLabel: 'class_name',
            color: '#478cbf',
            target: 'node',
            isPluginDefault: true,
            pluginId: 'codegraphy.gdscript',
            pluginName: 'Godot',
          },
        ]}
      />,
    );

    const customLabel = screen.getByText('Custom');
    const pluginDefaultsLabel = screen.getByText('Plugins');
    const materialLabels = screen.getAllByText('Material Icon Theme');
    expect(materialLabels).toHaveLength(1);
    const materialLabel = materialLabels[0];
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

    const godotSection = screen.getByText('Godot').closest('[data-testid="legend-rule-subsection"]');
    expect(godotSection).not.toBeNull();
    expect(within(godotSection as HTMLElement).getByText('class_name')).toBeInTheDocument();

    const defaultsSection = screen.getByText('Defaults').closest('[data-testid="legend-rule-subsection"]');
    expect(defaultsSection).not.toBeNull();
    expect(within(defaultsSection as HTMLElement).getByText('built-in:Files')).toBeInTheDocument();
    expect(within(defaultsSection as HTMLElement).getByText('built-in:Packages')).toBeInTheDocument();
  });

  it('collapses plugin groups and toggles all rules in a plugin group', () => {
    const onCollapsedChange = vi.fn();
    render(
      <LegendSection
        {...baseProps}
        displayRules={[
          {
            id: 'plugin:codegraphy.vue:*.py',
            pattern: '*.py',
            color: '#3776ab',
            target: 'node',
            isPluginDefault: true,
            pluginId: 'codegraphy.vue',
            pluginName: 'Python',
          },
          {
            id: 'plugin:codegraphy.vue:*.pyi',
            pattern: '*.pyi',
            color: '#3776ab',
            target: 'node',
            isPluginDefault: true,
            pluginId: 'codegraphy.vue',
            pluginName: 'Python',
            disabled: true,
          },
        ]}
        onCollapsedChange={onCollapsedChange}
      />,
    );

    fireEvent.click(screen.getByTitle('Toggle Python legend entries'));
    expect(baseProps.onToggleDefaultVisibilityBatch).toHaveBeenCalledWith(
      ['plugin:codegraphy.vue:*.py', 'plugin:codegraphy.vue:*.pyi'],
      true,
    );

    fireEvent.click(screen.getByTitle('Collapse Python legend entries'));
    expect(onCollapsedChange).toHaveBeenCalledWith('plugin:codegraphy.vue', true);
  });

  it('toggles all custom rules in a section', () => {
    render(<LegendSection {...baseProps} />);

    fireEvent.click(screen.getByTitle('Toggle Custom legend entries'));

    expect(baseProps.onRulesChange).toHaveBeenCalledWith([
      { id: 'node:user', pattern: 'src/**', color: '#123456', target: 'node', disabled: true },
      { id: 'node:second', pattern: 'tests/**', color: '#456789', target: 'node', disabled: true },
    ]);
  });

  it('toggles only rendered custom rules when target user rules include extra node rules', () => {
    render(
      <LegendSection
        {...baseProps}
        displayRules={[
          { id: 'node:user', pattern: 'src/**', color: '#123456', target: 'node', disabled: true },
        ]}
        userRules={[
          { id: 'node:user', pattern: 'src/**', color: '#123456', target: 'node', disabled: true },
          { id: 'node:hidden', pattern: 'hidden/**', color: '#999999', target: 'node' },
          { id: 'edge:user', pattern: 'call', color: '#654321', target: 'edge' },
        ]}
      />,
    );

    fireEvent.click(screen.getByTitle('Toggle Custom legend entries'));

    expect(baseProps.onRulesChange).toHaveBeenCalledWith([
      { id: 'node:user', pattern: 'src/**', color: '#123456', target: 'node', disabled: false },
      { id: 'node:hidden', pattern: 'hidden/**', color: '#999999', target: 'node' },
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

  it('forwards pending icon imports when creating a legend rule with an icon', () => {
    render(<LegendSection {...baseProps} />);

    fireEvent.click(screen.getByText('add-icon:node'));

    expect(baseProps.onRulesChange).toHaveBeenCalledWith(
      [
        { id: 'node:user', pattern: 'src/**', color: '#123456', target: 'node' },
        { id: 'node:second', pattern: 'tests/**', color: '#456789', target: 'node' },
        { id: 'edge:user', pattern: 'call', color: '#654321', target: 'edge' },
        {
          id: 'legend:node:icon',
          pattern: 'node/icon/**',
          color: '#00ff00',
          target: 'node',
          imagePath: '.codegraphy/icons/node.svg',
        },
      ],
      [{ path: '.codegraphy/icons/node.svg', content: '<svg />', format: 'svg' }],
    );
  });

  it('omits empty plugin and built-in subsections', () => {
    render(
      <LegendSection
        {...baseProps}
        builtInEntries={[]}
        displayRules={[
          { id: 'node:user', pattern: 'src/**', color: '#123456', target: 'node' },
        ]}
      />,
    );

    expect(screen.queryByText('Plugins')).not.toBeInTheDocument();
    expect(screen.queryByText('Material Icon Theme')).not.toBeInTheDocument();
    expect(screen.queryByText('Defaults')).not.toBeInTheDocument();
  });

  it('toggles all material theme rules in a single batch', () => {
    render(
      <LegendSection
        {...baseProps}
        displayRules={[
          {
            id: 'default:*.json',
            pattern: '*.json',
            color: '#f9c74f',
            target: 'node',
            isPluginDefault: true,
            pluginName: 'Material Icon Theme',
          },
          {
            id: 'default:*.md',
            pattern: '*.md',
            color: '#519aba',
            target: 'node',
            isPluginDefault: true,
            pluginName: 'Material Icon Theme',
            disabled: true,
          },
        ]}
      />,
    );

    fireEvent.click(screen.getByTitle('Toggle Material Icon Theme legend entries'));

    expect(baseProps.onToggleDefaultVisibilityBatch).toHaveBeenCalledWith(
      ['default:*.json', 'default:*.md'],
      true,
    );
  });

  it('honors stored collapse state for custom, plugin, material, and default subsections', () => {
    render(
      <LegendSection
        {...baseProps}
        collapsedEntries={{
          'node:custom': true,
          'plugin-defaults': true,
          'plugin:codegraphy.typescript': true,
          'material-icon-theme': true,
          'node:defaults': true,
        }}
        builtInEntries={[
          { id: 'file', label: 'Files', color: '#111111', defaultColor: '#111111' },
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
        ]}
      />,
    );

    expect(screen.queryByText('src/**')).not.toBeInTheDocument();
    expect(screen.queryByText('*.ts')).not.toBeInTheDocument();
    expect(screen.queryByText('*.json')).not.toBeInTheDocument();
    expect(screen.queryByText('built-in:Files')).not.toBeInTheDocument();
  });

  it('honors stored collapse state for an individual plugin subsection', () => {
    render(
      <LegendSection
        {...baseProps}
        collapsedEntries={{ 'plugin:codegraphy.typescript': true }}
        displayRules={[
          {
            id: 'plugin:codegraphy.typescript:*.ts',
            pattern: '*.ts',
            color: '#3178c6',
            target: 'node',
            isPluginDefault: true,
            pluginId: 'codegraphy.typescript',
            pluginName: 'TypeScript',
          },
        ]}
      />,
    );

    expect(screen.getByText('TypeScript')).toBeInTheDocument();
    expect(screen.queryByText('*.ts')).not.toBeInTheDocument();
  });

  it('formats plugin subsection storage keys', () => {
    expect(getPluginRuleGroupStorageKey('codegraphy.typescript')).toBe('plugin:codegraphy.typescript');
  });

  it('formats legend subsection storage keys and collapse titles', () => {
    expect(getCustomSectionStorageKey('node')).toBe('node:custom');
    expect(getDefaultSectionStorageKey('edge')).toBe('edge:defaults');
    expect(getLegendSubsectionCollapseTitle(true, 'Custom')).toBe('Collapse Custom legend entries');
    expect(getLegendSubsectionCollapseTitle(false, 'Custom')).toBe('Expand Custom legend entries');
  });

  it('stops subsection toggle clicks from reaching the collapse trigger', () => {
    const stopPropagation = vi.fn();

    stopSubsectionTogglePropagation({ stopPropagation });

    expect(stopPropagation).toHaveBeenCalledOnce();
  });

  it('keeps local collapse state when no collapsed change callback is provided', () => {
    render(
      <LegendSection
        {...baseProps}
        onCollapsedChange={undefined}
      />,
    );

    expect(screen.getByText('src/**')).toBeInTheDocument();

    fireEvent.click(screen.getByTitle('Toggle Nodes legend section'));
    expect(screen.queryByText('src/**')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTitle('Toggle Nodes legend section'));
    expect(screen.getByText('src/**')).toBeInTheDocument();
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
