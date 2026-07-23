import type { NodeShape2D } from './modes';
import type { NodeType } from '../graph/contracts';

export type LegendRuleTarget = 'node' | 'edge' | 'both';

export interface IGroup {
  id: string;
  pattern: string;
  displayLabel?: string;
  color: string;
  target?: LegendRuleTarget;
  matchNodeType?: NodeType;
  matchSymbolKind?: string;
  matchSymbolKinds?: string[];
  matchSymbolPluginKind?: string;
  matchSymbolSource?: string;
  matchSymbolLanguage?: string;
  matchSymbolFilePath?: string;
  shape2D?: NodeShape2D;
  imagePath?: string;
  imageUrl?: string;
  isPluginDefault?: boolean;
  pluginId?: string;
  pluginName?: string;
  disabled?: boolean;
}
