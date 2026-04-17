import type { Disposable } from '../../../../disposable';
import { toDisposable } from '../../../../disposable';
import type { IView } from '../../../../../views/contracts';
import type { ICommand, IContextMenuItem } from '../../../../../../../../plugin-api/src/commands';
import type { IExporter, IToolbarAction } from '../../../../../../../../plugin-api/src/api';
import type { ApiContext } from './context';

type RegistrationContext = Pick<
  ApiContext,
  | 'pluginId'
  | 'viewRegistry'
  | 'commandRegistrar'
  | 'commands'
  | 'contextMenuItems'
  | 'exporters'
  | 'toolbarActions'
>;

function removeFromArray<T>(items: T[], item: T): void {
  const index = items.indexOf(item);
  if (index !== -1) {
    items.splice(index, 1);
  }
}

export function registerPluginView(context: RegistrationContext, view: IView): Disposable {
  const taggedView = { ...view, pluginId: context.pluginId };
  context.viewRegistry.register(taggedView);

  return toDisposable(() => {
    context.viewRegistry.unregister(view.id);
  });
}

export function registerPluginCommand(context: RegistrationContext, command: ICommand): Disposable {
  context.commands.push(command);
  const registration = context.commandRegistrar(command.id, command.action);

  return toDisposable(() => {
    registration.dispose();
    removeFromArray(context.commands, command);
  });
}

export function registerPluginContextMenuItem(
  context: RegistrationContext,
  item: IContextMenuItem,
): Disposable {
  context.contextMenuItems.push(item);

  return toDisposable(() => {
    removeFromArray(context.contextMenuItems, item);
  });
}

export function registerPluginExporter(context: RegistrationContext, exporter: IExporter): Disposable {
  context.exporters.push(exporter);

  return toDisposable(() => {
    removeFromArray(context.exporters, exporter);
  });
}

export function registerPluginToolbarAction(
  context: RegistrationContext,
  action: IToolbarAction,
): Disposable {
  context.toolbarActions.push(action);

  return toDisposable(() => {
    removeFromArray(context.toolbarActions, action);
  });
}
