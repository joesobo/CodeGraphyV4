import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { analyzeFileWithTreeSitter } from '../../../src/treeSitter/runtime/analyze';

const tempRoots: string[] = [];

async function createWorkspace(files: Record<string, string>): Promise<string> {
  const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-treesitter-pascal-'));
  tempRoots.push(workspaceRoot);

  for (const [relativePath, content] of Object.entries(files)) {
    const absolutePath = path.join(workspaceRoot, relativePath);
    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    await fs.writeFile(absolutePath, content, 'utf8');
  }

  return workspaceRoot;
}

afterEach(async () => {
  await Promise.all(
    tempRoots.splice(0).map((workspaceRoot) =>
      fs.rm(workspaceRoot, { recursive: true, force: true }),
    ),
  );
});

describe('treeSitter/analyzePascal', () => {
  it('extracts Pascal unit uses relationships and useful symbols', async () => {
    const workspaceRoot = await createWorkspace({
      'src/RunnerSupport.pas': [
        'unit RunnerSupport;',
        'interface',
        'type',
        '  TBaseRunner = class',
        '  end;',
        'implementation',
        'end.',
      ].join('\n'),
    });
    const filePath = path.join(workspaceRoot, 'src/SampleApp.pas');
    const source = [
      'unit SampleApp;',
      'interface',
      'uses RunnerSupport;',
      'type',
      '  TAppRunner = class(TBaseRunner)',
      '  public',
      '    procedure Start; override;',
      '    procedure Run;',
      '  end;',
      'implementation',
      'procedure TAppRunner.Start;',
      'begin',
      'end;',
      'procedure TAppRunner.Run;',
      'begin',
      'end;',
      'end.',
    ].join('\n');

    const result = await analyzeFileWithTreeSitter(filePath, source, workspaceRoot);

    expect(result).not.toBeNull();
    expect(result?.relations).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: 'import',
        sourceId: 'codegraphy.treesitter:import',
        specifier: 'RunnerSupport',
        fromFilePath: filePath,
        resolvedPath: path.join(workspaceRoot, 'src/RunnerSupport.pas'),
      }),
      expect.objectContaining({
        kind: 'inherit',
        sourceId: 'codegraphy.treesitter:inherit',
        specifier: 'TBaseRunner',
        fromFilePath: filePath,
      }),
      expect.objectContaining({
        kind: 'overrides',
        sourceId: 'codegraphy.treesitter:override',
        specifier: 'Start',
        fromFilePath: filePath,
        fromSymbolId: `${filePath}:method:Start`,
        resolvedPath: path.join(workspaceRoot, 'src/RunnerSupport.pas'),
      }),
    ]));
    expect(result?.symbols).toEqual(expect.arrayContaining([
      expect.objectContaining({ filePath, kind: 'class', name: 'TAppRunner' }),
      expect.objectContaining({ filePath, kind: 'method', name: 'Run' }),
    ]));
  });

  it('extracts Pascal call relationships from used unit types and typed receivers', async () => {
    const workspaceRoot = await createWorkspace({
      'src/SampleApp.pas': 'unit SampleApp;\ninterface\ntype TAppRunner = class end;\nimplementation\nend.',
      'src/OrderRepository.pas': 'unit OrderRepository;\ninterface\ntype TOrderRepository = class end;\nimplementation\nend.',
      'src/PricingService.pas': 'unit PricingService;\ninterface\ntype TPricingService = class end;\nimplementation\nend.',
      'src/ReceiptView.pas': 'unit ReceiptView;\ninterface\ntype TReceiptView = class end;\nimplementation\nend.',
    });

    const mainPath = path.join(workspaceRoot, 'src/Main.pas');
    const mainSource = [
      'program Main;',
      'uses SampleApp;',
      'var',
      '  App: TAppRunner;',
      'begin',
      '  App := TAppRunner.Create;',
      '  App.Start;',
      'end.',
    ].join('\n');
    const samplePath = path.join(workspaceRoot, 'src/SampleApp.pas');
    const sampleSource = [
      'unit SampleApp;',
      'interface',
      'uses OrderRepository, PricingService, ReceiptView;',
      'type',
      '  TAppRunner = class',
      '  private',
      '    Repository: TOrderRepository;',
      '    Pricing: TPricingService;',
      '    View: TReceiptView;',
      '  public',
      '    procedure Run;',
      '  end;',
      'implementation',
      'procedure TAppRunner.Run;',
      'begin',
      '  Repository := TOrderRepository.Create;',
      '  Pricing := TPricingService.Create;',
      '  View := TReceiptView.Create;',
      '  Repository.CurrentOrder;',
      '  Pricing.TotalFor(nil);',
      '  View.Render(nil, 0);',
      'end;',
      'end.',
    ].join('\n');

    const mainResult = await analyzeFileWithTreeSitter(mainPath, mainSource, workspaceRoot);
    const sampleResult = await analyzeFileWithTreeSitter(samplePath, sampleSource, workspaceRoot);

    expect(mainResult?.relations).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: 'call',
        sourceId: 'codegraphy.treesitter:call',
        specifier: 'SampleApp',
        fromFilePath: mainPath,
        resolvedPath: path.join(workspaceRoot, 'src/SampleApp.pas'),
      }),
    ]));
    expect(sampleResult?.relations).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: 'call',
        sourceId: 'codegraphy.treesitter:call',
        specifier: 'OrderRepository',
        fromFilePath: samplePath,
        resolvedPath: path.join(workspaceRoot, 'src/OrderRepository.pas'),
      }),
      expect.objectContaining({
        kind: 'call',
        sourceId: 'codegraphy.treesitter:call',
        specifier: 'PricingService',
        fromFilePath: samplePath,
        resolvedPath: path.join(workspaceRoot, 'src/PricingService.pas'),
      }),
      expect.objectContaining({
        kind: 'call',
        sourceId: 'codegraphy.treesitter:call',
        specifier: 'ReceiptView',
        fromFilePath: samplePath,
        resolvedPath: path.join(workspaceRoot, 'src/ReceiptView.pas'),
      }),
    ]));
  });
});
