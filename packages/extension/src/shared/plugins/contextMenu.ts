export interface IPluginContextMenuItem {
  label: string;
  when: 'node' | 'edge' | 'both';
  icon?: string;
  group?: string;
  pluginId: string;
  index: number;
}
