import type { IGroup } from '../../../../../shared/settings/groups';

export type SymbolDefaultGroup = Omit<IGroup, 'pattern' | 'isPluginDefault' | 'pluginName'> & {
  pluginId?: string;
  pluginName?: string;
};
