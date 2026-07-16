import * as fs from 'node:fs/promises';
import * as path from 'node:path';

export async function createPackage(
  root: string,
  packageName: string,
  packageJson: Record<string, unknown>,
  descriptor?: Record<string, unknown>,
): Promise<void> {
  const packageRoot = path.join(root, ...packageName.split('/'));
  await fs.mkdir(packageRoot, { recursive: true });
  await fs.writeFile(
    path.join(packageRoot, 'package.json'),
    `${JSON.stringify({ name: packageName, ...packageJson }, null, 2)}\n`,
    'utf-8',
  );
  if (descriptor) {
    await fs.writeFile(
      path.join(packageRoot, 'codegraphy.json'),
      `${JSON.stringify(descriptor, null, 2)}\n`,
      'utf-8',
    );
  }
}
