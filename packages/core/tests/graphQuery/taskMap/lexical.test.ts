import { describe, expect, it } from 'vitest';
import type { GraphQueryData } from '../../../src/graphQuery/data';
import {
  createTaskMapDocuments,
  rankTaskMapDocument,
  selectTaskMapTerms,
} from '../../../src/graphQuery/taskMap/lexical';

const data: GraphQueryData = {
  graphData: {
    nodes: [
      { id: 'src/task.ts', label: 'task.ts', nodeType: 'file' },
      { id: 'src/unload.ts', label: 'unload.ts', nodeType: 'file' },
    ],
    edges: [],
  },
  sourceText: {
    files: [
      { filePath: 'src/task.ts', content: 'export function runPluginAfterTaskFailed() {}' },
      { filePath: 'src/unload.ts', content: 'export function unloadPlugin() {}' },
    ],
    filesScanned: 2,
    filesSkipped: 0,
  },
};

describe('core/graphQuery task map lexical ranking', () => {
  it('matches common inflections symmetrically without substring matches', () => {
    const documents = createTaskMapDocuments(data);
    const terms = selectTaskMapTerms('running plugin fail loading', documents);
    const frequencies = new Map(terms.map(term => [
      term,
      documents.filter(document => rankTaskMapDocument(document, [term], new Map([[term, 1]]), 2).score > 0).length,
    ]));

    expect(terms).toEqual(['running', 'plugin', 'fail']);
    expect(rankTaskMapDocument(documents[0]!, terms, frequencies, 2).matchedTerms)
      .toEqual(['running', 'plugin', 'fail']);
    expect(rankTaskMapDocument(documents[1]!, ['loading'], new Map([['loading', 1]]), 2).matchedTerms)
      .toEqual([]);
  });
});
