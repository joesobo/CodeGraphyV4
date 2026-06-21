import React from 'react';
import Toolbar from '../../../components/toolbar/view';

type ToolbarProps = React.ComponentProps<typeof Toolbar>;

export function ToolbarRail({ pluginHost }: { pluginHost: ToolbarProps['pluginHost'] }): React.ReactElement {
  return (
    <nav
      className="absolute inset-y-4 left-4 z-30 pointer-events-none"
      data-codegraphy-region="graph-tool-rail"
      aria-label="Graph tools"
    >
      <div className="h-full pointer-events-auto">
        <Toolbar pluginHost={pluginHost} />
      </div>
    </nav>
  );
}
