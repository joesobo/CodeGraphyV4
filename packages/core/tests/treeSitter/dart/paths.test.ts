import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { resolveDartImportPath } from '../../../src/treeSitter/runtime/analyzeDart/paths';

describe('treeSitter/analyzeDart/paths', () => {
  it('resolves relative Dart imports with and without explicit extensions', async () => {
    const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-dart-paths-'));
    const sourcePath = path.join(workspaceRoot, 'lib', 'src', 'app.dart');
    const explicitTarget = path.join(workspaceRoot, 'lib', 'model', 'user.dart');
    const implicitTarget = path.join(workspaceRoot, 'lib', 'model', 'profile.dart');
    await fs.mkdir(path.dirname(explicitTarget), { recursive: true });
    await fs.mkdir(path.dirname(sourcePath), { recursive: true });
    await fs.writeFile(explicitTarget, 'class User {}\n', 'utf-8');
    await fs.writeFile(implicitTarget, 'class Profile {}\n', 'utf-8');

    expect(resolveDartImportPath(sourcePath, workspaceRoot, '../model/user.dart')).toBe(explicitTarget);
    expect(resolveDartImportPath(sourcePath, workspaceRoot, '../model/profile')).toBe(implicitTarget);
  });

  it('resolves package imports from the nearest Dart project root', async () => {
    const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-dart-paths-'));
    const packageRoot = path.join(workspaceRoot, 'packages', 'app');
    const sourcePath = path.join(packageRoot, 'lib', 'src', 'app.dart');
    const targetPath = path.join(packageRoot, 'lib', 'model', 'user.dart');
    const extensionlessPackageNamePath = path.join(packageRoot, 'lib', 'sample_app.dart');
    const malformedPackagePath = path.join(packageRoot, 'lib', 'model', 'malformed.dart');
    await fs.mkdir(path.dirname(sourcePath), { recursive: true });
    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.writeFile(path.join(packageRoot, 'pubspec.yaml'), 'name: sample_app\n', 'utf-8');
    await fs.writeFile(targetPath, 'class User {}\n', 'utf-8');
    await fs.writeFile(extensionlessPackageNamePath, 'class SampleApp {}\n', 'utf-8');
    await fs.writeFile(malformedPackagePath, 'class Malformed {}\n', 'utf-8');

    expect(resolveDartImportPath(sourcePath, workspaceRoot, 'package:sample_app/model/user')).toBe(targetPath);
    expect(resolveDartImportPath('packages/app/lib/src/app.dart', workspaceRoot, 'package:sample_app/model/user')).toBe(targetPath);
    expect(resolveDartImportPath(sourcePath, workspaceRoot, 'package:sample_app')).toBeNull();
    expect(resolveDartImportPath(sourcePath, workspaceRoot, 'package:/model/malformed')).toBeNull();
  });

  it('ignores SDK and other scheme imports', async () => {
    const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-dart-paths-'));
    const sourcePath = path.join(workspaceRoot, 'lib', 'src', 'app.dart');
    const schemeTarget = path.join(workspaceRoot, 'lib', 'src', 'asset:icons', 'logo.svg');
    await fs.mkdir(path.dirname(schemeTarget), { recursive: true });
    await fs.writeFile(schemeTarget, '<svg />\n', 'utf-8');

    expect(resolveDartImportPath(sourcePath, workspaceRoot, 'dart:convert')).toBeNull();
    expect(resolveDartImportPath(sourcePath, workspaceRoot, 'asset:icons/logo.svg')).toBeNull();
  });
});
