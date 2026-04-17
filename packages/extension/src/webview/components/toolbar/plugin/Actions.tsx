import React from 'react';
import type { IPluginToolbarAction } from '../../../../shared/plugins/toolbarActions';
import { getToolbarActionKey } from '../model';
import { PluginToolbarActionMenu } from './Menu';

interface PluginToolbarActionsProps {
  pluginToolbarActions: IPluginToolbarAction[];
}

export function PluginToolbarActions({
  pluginToolbarActions,
}: PluginToolbarActionsProps): React.ReactElement {
  return (
    <>
      {pluginToolbarActions.map((action) => (
        <PluginToolbarActionMenu key={getToolbarActionKey(action)} action={action} />
      ))}
    </>
  );
}
