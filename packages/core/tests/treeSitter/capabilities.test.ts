import { describe, expect, it } from 'vitest';
import { listTreeSitterEdgeTypeCapabilities } from '../../src/treeSitter/runtime/capabilities';

describe('pipeline/plugins/treesitter/runtime/capabilities', () => {
  it('advertises calls for languages whose example workspaces expose the Calls edge toggle', () => {
    for (const filePath of [
      'src/main.c',
      'src/Program.cs',
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
});
