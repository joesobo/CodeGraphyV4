export interface IPluginToolbarActionItem {
  id: string;
  label: string;
  description?: string;
  index: number;
}

export interface IPluginToolbarAction {
  id: string;
  label: string;
  icon?: string;
  description?: string;
  pluginId: string;
  pluginName: string;
  index: number;
  items: IPluginToolbarActionItem[];
}
