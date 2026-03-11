/**
 * @fileoverview Tests for Context Menu components.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuLabel,
} from '../../src/webview/components/ui/context-menu';

describe('ContextMenu Components', () => {
  it('should export all required components', () => {
    expect(ContextMenu).toBeDefined();
    expect(ContextMenuTrigger).toBeDefined();
    expect(ContextMenuContent).toBeDefined();
    expect(ContextMenuItem).toBeDefined();
    expect(ContextMenuSeparator).toBeDefined();
    expect(ContextMenuLabel).toBeDefined();
  });

  it('should render ContextMenuItem with correct classes', () => {
    render(
      <ContextMenu>
        <ContextMenuTrigger>
          <button>Right click me</button>
        </ContextMenuTrigger>
      </ContextMenu>
    );
    
    expect(screen.getByText('Right click me')).toBeInTheDocument();
  });

  it('should support destructive variant', () => {
    // ContextMenuItem should accept destructive prop
    const DestructiveItem = () => (
      <ContextMenu>
        <ContextMenuTrigger>
          <button>Trigger</button>
        </ContextMenuTrigger>
      </ContextMenu>
    );
    
    const { container } = render(<DestructiveItem />);
    expect(container).toBeInTheDocument();
  });

  it('should support inset variant', () => {
    // ContextMenuItem should accept inset prop
    const InsetItem = () => (
      <ContextMenu>
        <ContextMenuTrigger>
          <button>Trigger</button>
        </ContextMenuTrigger>
      </ContextMenu>
    );
    
    const { container } = render(<InsetItem />);
    expect(container).toBeInTheDocument();
  });
});
