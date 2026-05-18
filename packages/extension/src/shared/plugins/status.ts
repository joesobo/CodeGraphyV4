export interface IPluginStatus {
  id: string;
  packageName?: string;
  name: string;
  version: string;
  supportedExtensions: string[];
  status: 'active' | 'installed' | 'inactive' | 'unavailable';
  enabled: boolean;
  connectionCount: number;
}
