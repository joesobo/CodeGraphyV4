export interface IPluginRuleStatus {
  id: string;
  qualifiedId: string;
  name: string;
  description: string;
  enabled: boolean;
  connectionCount: number;
}

export interface IPluginStatus {
  id: string;
  name: string;
  version: string;
  supportedExtensions: string[];
  status: 'active' | 'installed' | 'inactive';
  enabled: boolean;
  connectionCount: number;
  rules: IPluginRuleStatus[];
}
