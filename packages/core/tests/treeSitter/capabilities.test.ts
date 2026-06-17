import { describe, expect, it } from 'vitest';
import {
  listTreeSitterEdgeTypeCapabilities,
  listTreeSitterGraphScopeCapabilities,
  listTreeSitterNodeTypeCapabilities,
} from '../../src/treeSitter/runtime/capabilities';

describe('pipeline/plugins/treesitter/runtime/capabilities', () => {
  it('advertises calls for languages whose example workspaces expose the Calls edge toggle', () => {
    for (const filePath of [
      'src/main.c',
      'lib/app/runner.dart',
      'src/App/Feature/Runner.hs',
      'src/main/kotlin/com/example/app/Main.kt',
      'app/runner.lua',
      'Sources/AppDelegate.m',
      'src/Main.pas',
      'src/App/Feature/Runner.php',
      'lib/app/runner.rb',
      'src/main/scala/com/example/app/Main.scala',
      'Sources/SwiftExample/main.swift',
    ]) {
      expect(listTreeSitterEdgeTypeCapabilities([filePath]), filePath).toContain('call');
    }
  });

  it('advertises TypeScript inheritance because the language supports it even without inherit evidence', () => {
    expect(listTreeSitterEdgeTypeCapabilities(['src/commented.ts'])).toEqual([
      'import',
      'type-import',
      'call',
      'inherit',
    ]);
  });

  it('advertises C includes without advertising imports for C source and header workspaces', () => {
    expect(listTreeSitterEdgeTypeCapabilities([
      'src/main.c',
      'src/logger/logger.c',
      'src/logger/logger.h',
      'src/logger/format.h',
    ])).toEqual([
      'include',
      'call',
      'contains',
    ]);
  });

  it('does not advertise C-only header capabilities for Objective-C workspaces', () => {
    expect(listTreeSitterEdgeTypeCapabilities([
      'Sources/AppDelegate.m',
      'Sources/AppDelegate.h',
      'Sources/Feature/UserCardView.h',
    ])).toEqual([
      'import',
      'call',
      'inherit',
    ]);
  });

  it('advertises language-specific C# edge capabilities', () => {
    expect(listTreeSitterEdgeTypeCapabilities(['src/Program.cs'])).toEqual([
      'using',
      'type',
      'call',
      'inherit',
      'implements',
      'contains',
    ]);
  });

  it('advertises Pascal symbol capabilities emitted by the text analyzer', () => {
    expect(listTreeSitterNodeTypeCapabilities(['src/SampleApp.pas'])).toEqual([
      'symbol:function',
      'symbol:class',
      'symbol:struct',
      'symbol:interface',
    ]);
  });

  it('advertises only supported Graph Scope rows for emitted language symbol kinds', () => {
    const expectedCapabilitiesByFile = {
      'src/main.c': [
        'symbol:function',
        'symbol:prototype',
        'symbol:struct',
        'symbol:union',
        'symbol:enum',
        'symbol:typedef',
        'symbol:global',
      ],
      'src/main.cpp': [
        'symbol:namespace',
        'symbol:class',
        'symbol:enum',
        'symbol:callable',
        'symbol:method',
        'symbol:alias',
        'symbol:template',
        'symbol:global',
        'symbol:constant',
        'symbol:field',
        'symbol:parameter',
        'symbol:local',
      ],
      'src/Program.cs': [
        'symbol:class',
        'symbol:interface',
        'symbol:struct',
        'symbol:record',
        'symbol:enum',
        'symbol:delegate',
        'symbol:method',
        'symbol:constructor',
        'symbol:property',
        'symbol:event',
        'symbol:constant',
        'symbol:field',
        'symbol:parameter',
        'symbol:local',
      ],
      'lib/app/runner.dart': ['symbol:function', 'symbol:class', 'symbol:enum'],
      'cmd/app/main.go': ['symbol:function', 'symbol:struct', 'symbol:interface', 'symbol:type'],
      'src/App/Feature/Runner.hs': ['symbol:function', 'symbol:type', 'symbol:class'],
      'src/main/java/com/example/App.java': ['symbol:function', 'symbol:class', 'symbol:interface', 'symbol:enum'],
      'src/app.js': ['symbol:function', 'symbol:class', 'symbol:constant'],
      'src/main/kotlin/com/example/app/Main.kt': ['symbol:function', 'symbol:class', 'symbol:interface', 'symbol:enum'],
      'app/runner.lua': ['symbol:function'],
      'Sources/AppDelegate.m': ['symbol:function', 'symbol:class'],
      'src/SampleApp.pas': ['symbol:function', 'symbol:class', 'symbol:struct', 'symbol:interface'],
      'src/App/Feature/Runner.php': ['symbol:function', 'symbol:class', 'symbol:interface', 'symbol:enum'],
      'src/app.py': ['symbol:function', 'symbol:class'],
      'lib/app/runner.rb': ['symbol:function', 'symbol:class'],
      'src/main.rs': ['symbol:function', 'symbol:struct', 'symbol:enum'],
      'src/main/scala/com/example/app/Main.scala': ['symbol:function', 'symbol:class', 'symbol:interface', 'symbol:type', 'symbol:enum'],
      'Sources/SwiftExample/main.swift': ['symbol:function', 'symbol:class', 'symbol:struct', 'symbol:enum'],
      'src/app.ts': ['symbol:function', 'symbol:class', 'symbol:interface', 'symbol:type', 'symbol:enum', 'symbol:constant'],
      'src/App.tsx': ['symbol:function', 'symbol:class', 'symbol:interface', 'symbol:type', 'symbol:enum', 'symbol:constant'],
    } as const;

    for (const [filePath, expectedCapabilities] of Object.entries(expectedCapabilitiesByFile)) {
      expect(listTreeSitterNodeTypeCapabilities([filePath]), filePath).toEqual(expectedCapabilities);
    }
  });

  it('advertises C++ includes without advertising imports for C++ source and header workspaces', () => {
    expect(listTreeSitterEdgeTypeCapabilities([
      'src/app.cpp',
      'src/runner.hpp',
      'src/task.hpp',
    ])).toEqual([
      'include',
      'call',
      'contains',
      'inherit',
      'overrides',
    ]);
  });

  it('does not advertise C-only header node capabilities for Objective-C workspaces', () => {
    expect(listTreeSitterNodeTypeCapabilities([
      'Sources/AppDelegate.m',
      'Sources/AppDelegate.h',
      'Sources/Feature/UserCardView.h',
    ])).toEqual([
      'symbol:function',
      'symbol:class',
    ]);
  });

  it('keeps empty and unknown capability requests empty', () => {
    expect(listTreeSitterNodeTypeCapabilities()).toEqual([]);
    expect(listTreeSitterNodeTypeCapabilities([])).toEqual([]);
    expect(listTreeSitterGraphScopeCapabilities([])).toEqual({
      nodeTypes: [],
      edgeTypes: [
        'import',
        'reference',
        'call',
        'type-import',
        'inherit',
      ],
    });
    expect(listTreeSitterEdgeTypeCapabilities(['src/readme.md'])).toEqual([]);
    expect(listTreeSitterNodeTypeCapabilities(['src/readme.md'])).toEqual([]);
  });

  it('treats standalone headers as C headers', () => {
    expect(listTreeSitterEdgeTypeCapabilities(['include/shared.h'])).toEqual([
      'include',
      'call',
      'contains',
    ]);
    expect(listTreeSitterNodeTypeCapabilities(['include/shared.h'])).toEqual([
      'symbol:function',
      'symbol:prototype',
      'symbol:struct',
      'symbol:union',
      'symbol:enum',
      'symbol:typedef',
      'symbol:global',
    ]);
  });

  it('treats headers as Objective-C when only .mm Objective-C sources share a workspace', () => {
    expect(listTreeSitterEdgeTypeCapabilities([
      'Sources/AppDelegate.mm',
      'Sources/AppDelegate.h',
    ])).toEqual([
      'import',
      'call',
      'inherit',
    ]);
    expect(listTreeSitterNodeTypeCapabilities([
      'Sources/AppDelegate.mm',
      'Sources/AppDelegate.h',
    ])).toEqual([
      'symbol:function',
      'symbol:class',
    ]);
  });

  it('does not treat non-header C++ files as Objective-C in mixed workspaces', () => {
    expect(listTreeSitterEdgeTypeCapabilities([
      'Sources/AppDelegate.m',
      'src/task.cpp',
    ])).toEqual([
      'import',
      'call',
      'inherit',
      'include',
      'contains',
      'overrides',
    ]);
    expect(listTreeSitterNodeTypeCapabilities([
      'Sources/AppDelegate.m',
      'src/task.cpp',
    ])).toEqual([
      'symbol:function',
      'symbol:class',
      'symbol:namespace',
      'symbol:enum',
      'symbol:callable',
      'symbol:method',
      'symbol:alias',
      'symbol:template',
      'symbol:global',
      'symbol:constant',
      'symbol:field',
      'symbol:parameter',
      'symbol:local',
    ]);
  });

  it('treats headers as C when C and Objective-C sources share a workspace', () => {
    expect(listTreeSitterEdgeTypeCapabilities([
      'src/main.c',
      'Sources/AppDelegate.m',
      'include/shared.h',
    ])).toEqual([
      'include',
      'call',
      'contains',
      'import',
      'inherit',
    ]);
    expect(listTreeSitterNodeTypeCapabilities([
      'src/main.c',
      'Sources/AppDelegate.m',
      'include/shared.h',
    ])).toEqual([
      'symbol:function',
      'symbol:prototype',
      'symbol:struct',
      'symbol:union',
      'symbol:enum',
      'symbol:typedef',
      'symbol:global',
      'symbol:class',
    ]);
  });
});
