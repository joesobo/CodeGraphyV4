import type { IGraphData } from '../../graph/contracts';
import type { IGraphNodeTypeDefinition } from '../../graphControls/contracts';
import { globMatch } from '../../globMatch';
import { getDefinitionSymbolKinds } from './definitions';

export function symbolMatchesScopedDefinition(
	node: IGraphData['nodes'][number],
	definition: IGraphNodeTypeDefinition,
): boolean {
	const symbol = node.symbol;
	if (!symbol) {
		return false;
	}

	const definitionSymbolKinds = getDefinitionSymbolKinds(definition);
	return [
		!definitionSymbolKinds || definitionSymbolKinds.includes(symbol.kind),
		!definition.matchSymbolPluginKind || definition.matchSymbolPluginKind === symbol.pluginKind,
		!definition.matchSymbolSource || definition.matchSymbolSource === symbol.source,
		!definition.matchSymbolLanguage || definition.matchSymbolLanguage === symbol.language,
		!definition.matchSymbolFilePath || globMatch(symbol.filePath, definition.matchSymbolFilePath),
	].every(Boolean);
}
