import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import type { IAnalysisRelationshipEvidence } from '@codegraphy-dev/plugin-api';
import { handleCInclude } from '../../../src/treeSitter/runtime/analyzeCFamily/includes';

interface FakeSyntaxNode {
  childForFieldName(name: string): FakeSyntaxNode | null;
  namedChildren: FakeSyntaxNode[];
  text: string;
  type: string;
}

function node(
  type: string,
  text = '',
  namedChildren: FakeSyntaxNode[] = [],
  fields: Record<string, FakeSyntaxNode | null> = {},
): FakeSyntaxNode {
  return {
    type,
    text,
    namedChildren,
    childForFieldName: (name: string) => fields[name] ?? null,
  };
}

describe('treeSitter/analyzeCFamily/includes', () => {
  it('resolves quoted includes beside the source file before workspace-root candidates', async () => {
    const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-c-includes-'));
    const sourcePath = path.join(workspaceRoot, 'src', 'main.c');
    const localHeader = path.join(workspaceRoot, 'src', 'local.h');
    const rootHeader = path.join(workspaceRoot, 'local.h');
    await fs.mkdir(path.dirname(localHeader), { recursive: true });
    await fs.writeFile(localHeader, '#pragma once\n', 'utf-8');
    await fs.writeFile(rootHeader, '#pragma once\n', 'utf-8');
    const relations: IAnalysisRelationshipEvidence[] = [];

    handleCInclude(
      node('preproc_include', '', [], { path: node('string_literal', '"local.h"') }) as never,
      sourcePath,
      workspaceRoot,
      relations,
    );

    expect(relations).toEqual([expect.objectContaining({
      edgeType: 'import',
      sourceId: 'codegraphy.treesitter:include',
      from: { kind: 'file', filePath: sourcePath },
      timing: 'include',
      target: { kind: 'file', path: localHeader, pathKind: 'absolute', specifier: 'local.h' },
    })]);
  });

  it('resolves system includes from the workspace root and ignores unknown include shapes', async () => {
    const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-c-includes-'));
    const header = path.join(workspaceRoot, 'include', 'lib.h');
    const localHeader = path.join(workspaceRoot, 'src', 'include', 'lib.h');
    await fs.mkdir(path.dirname(header), { recursive: true });
    await fs.mkdir(path.dirname(localHeader), { recursive: true });
    await fs.writeFile(header, '#pragma once\n', 'utf-8');
    await fs.writeFile(localHeader, '#pragma once\n', 'utf-8');
    const relations: IAnalysisRelationshipEvidence[] = [];

    handleCInclude(
      node('preproc_include', '', [node('system_lib_string', '<include/lib.h>')]) as never,
      path.join(workspaceRoot, 'src', 'main.c'),
      workspaceRoot,
      relations,
    );
    handleCInclude(
      node('preproc_include', '', [node('string_literal', '"include/lib.h"')]) as never,
      path.join(workspaceRoot, 'src', 'main.c'),
      workspaceRoot,
      relations,
    );
    handleCInclude(
      node('preproc_include', '', [node('identifier', 'LIB_HEADER')]) as never,
      path.join(workspaceRoot, 'src', 'main.c'),
      workspaceRoot,
      relations,
    );
    handleCInclude(
      node('preproc_include') as never,
      path.join(workspaceRoot, 'src', 'main.c'),
      workspaceRoot,
      relations,
    );

    expect(relations).toEqual([expect.objectContaining({
      target: { kind: 'file', path: header, pathKind: 'absolute', specifier: 'include/lib.h' },
    }), expect.objectContaining({
      target: { kind: 'file', path: localHeader, pathKind: 'absolute', specifier: 'include/lib.h' },
    })]);
  });
});
