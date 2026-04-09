export interface IPluginStatus {
  id: string;
  name: string;
  version: string;
  supportedExtensions: string[];
  status: 'active' | 'installed' | 'inactive';
  enabled: boolean;
  connectionCount: number;
}
