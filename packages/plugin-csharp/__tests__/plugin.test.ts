import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { describe, it, expect, vi } from 'vitest';
import createCSharpPlugin, {
  createCSharpPlugin as namedCreateCSharpPlugin,
  type ICSharpAnalyzeFilePlugin,
} from '../src/plugin';

describe('createCSharpPlugin', () => {
  it('exports both default and named factory functions', () => {
    expect(createCSharpPlugin).toBe(namedCreateCSharpPlugin);
  });

  it('initializes and logs plugin startup message', async () => {
    const plugin = createCSharpPlugin();
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    await plugin.initialize?.('/workspace');

    expect(logSpy).toHaveBeenCalledWith('[CodeGraphy] C# plugin initialized');

    logSpy.mockRestore();
  });

  it('lazy-initializes inside analyzeFile when initialize was not called', async () => {
    const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'csharp-plugin-lazy-'));
    const filePath = path.join(workspaceRoot, 'Program.cs');
    const content = `namespace MyApp;\npublic class Program {}`;

    fs.writeFileSync(filePath, content, 'utf-8');

    const plugin = createCSharpPlugin() as ICSharpAnalyzeFilePlugin;

    await expect(plugin.analyzeFile(filePath, content, workspaceRoot)).resolves.toEqual({
      filePath,
      relations: [],
    });

    fs.rmSync(workspaceRoot, { recursive: true, force: true });
  });

  it('keeps detectConnections compatible by deriving connections from analyzeFile relations', async () => {
    const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'csharp-plugin-compat-'));
    const namespaceFile = path.join(workspaceRoot, 'special', 'FooImpl.cs');
    const consumerFile = path.join(workspaceRoot, 'Program.cs');

    fs.mkdirSync(path.dirname(namespaceFile), { recursive: true });
    fs.writeFileSync(
      namespaceFile,
      'namespace Acme.Internal;\n\npublic class FooImpl {}',
      'utf-8',
    );
    fs.writeFileSync(
      consumerFile,
      'using Acme.Internal;\n\nnamespace Acme.App;\n\npublic class Program {\n  private FooImpl _value;\n}',
      'utf-8',
    );

    const plugin = createCSharpPlugin() as ICSharpAnalyzeFilePlugin;
    await plugin.initialize?.(workspaceRoot);

    await plugin.analyzeFile(namespaceFile, fs.readFileSync(namespaceFile, 'utf-8'), workspaceRoot);
    const analysis = await plugin.analyzeFile(
      consumerFile,
      fs.readFileSync(consumerFile, 'utf-8'),
      workspaceRoot,
    );
    const connections = await plugin.detectConnections(
      consumerFile,
      fs.readFileSync(consumerFile, 'utf-8'),
      workspaceRoot,
    );

    expect(analysis.relations).toContainEqual(
      expect.objectContaining({
        fromFilePath: consumerFile,
        toFilePath: namespaceFile.replace(/\\/g, '/'),
      }),
    );
    expect(connections).toContainEqual(
      expect.objectContaining({
        resolvedPath: namespaceFile.replace(/\\/g, '/'),
      }),
    );

    fs.rmSync(workspaceRoot, { recursive: true, force: true });
  });

  it('keeps namespace registrations across calls so later files can resolve by registered namespace map', async () => {
    const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'csharp-plugin-map-'));
    const namespaceFile = path.join(workspaceRoot, 'special', 'FooImpl.cs');
    const consumerFile = path.join(workspaceRoot, 'Program.cs');

    fs.mkdirSync(path.dirname(namespaceFile), { recursive: true });

    const namespaceContent = `
namespace Acme.Internal;

public class FooImpl {}
`;

    const consumerContent = `
using Acme.Internal;

namespace Acme.App;

public class Program {
  private FooImpl _value;
}
`;

    fs.writeFileSync(namespaceFile, namespaceContent, 'utf-8');
    fs.writeFileSync(consumerFile, consumerContent, 'utf-8');

    const plugin = createCSharpPlugin();
    await plugin.initialize?.(workspaceRoot);

    await plugin.detectConnections(namespaceFile, namespaceContent, workspaceRoot);
    const connections = await plugin.detectConnections(consumerFile, consumerContent, workspaceRoot);

    expect(connections).toContainEqual(
      expect.objectContaining({
        specifier: 'using Acme.Internal',
        resolvedPath: namespaceFile.replace(/\\/g, '/'),
      }),
    );

    plugin.onUnload?.();
    fs.rmSync(workspaceRoot, { recursive: true, force: true });
  });

  it('clears resolver state on unload so registered namespace mappings do not persist', async () => {
    const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'csharp-plugin-unload-'));
    const namespaceFile = path.join(workspaceRoot, 'special', 'FooImpl.cs');
    const consumerFile = path.join(workspaceRoot, 'Program.cs');

    fs.mkdirSync(path.dirname(namespaceFile), { recursive: true });

    const namespaceContent = `
namespace Acme.Internal;

public class FooImpl {}
`;

    const consumerContent = `
using Acme.Internal;

namespace Acme.App;

public class Program {
  private FooImpl _value;
}
`;

    fs.writeFileSync(namespaceFile, namespaceContent, 'utf-8');
    fs.writeFileSync(consumerFile, consumerContent, 'utf-8');

    const plugin = createCSharpPlugin();
    await plugin.initialize?.(workspaceRoot);

    await plugin.detectConnections(namespaceFile, namespaceContent, workspaceRoot);
    const beforeUnload = await plugin.detectConnections(consumerFile, consumerContent, workspaceRoot);
    expect(beforeUnload).toContainEqual(
      expect.objectContaining({
        specifier: 'using Acme.Internal',
        resolvedPath: namespaceFile.replace(/\\/g, '/'),
      }),
    );

    plugin.onUnload?.();

    const afterUnload = await plugin.detectConnections(consumerFile, consumerContent, workspaceRoot);
    const hasInternalUsingResolutionAfterUnload = afterUnload.some(connection => {
      return connection.specifier === 'using Acme.Internal' && connection.resolvedPath === namespaceFile.replace(/\\/g, '/');
    });

    expect(hasInternalUsingResolutionAfterUnload).toBe(false);

    fs.rmSync(workspaceRoot, { recursive: true, force: true });
  });

  it('resolves root-level C# files using default source directories', async () => {
    const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'csharp-plugin-root-dir-'));
    const helperFile = path.join(workspaceRoot, 'SharedHelper.cs');
    const consumerFile = path.join(workspaceRoot, 'Program.cs');

    const helperContent = `
namespace MyApp;

public class SharedHelper {}
`;

    const consumerContent = `
using MyApp;

namespace MyApp.App;

public class Program {
  private SharedHelper _helper;
}
`;

    fs.writeFileSync(helperFile, helperContent, 'utf-8');
    fs.writeFileSync(consumerFile, consumerContent, 'utf-8');

    const plugin = createCSharpPlugin();
    await plugin.initialize?.(workspaceRoot);

    const connections = await plugin.detectConnections(consumerFile, consumerContent, workspaceRoot);

    expect(connections).toContainEqual(
      expect.objectContaining({
        specifier: '[same namespace: MyApp.App]',
        resolvedPath: helperFile.replace(/\\/g, '/'),
      }),
    );

    fs.rmSync(workspaceRoot, { recursive: true, force: true });
  });
});
