import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { resolveReleaseTargets } from './release.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repositoryUrl = 'https://github.com/joesobo/CodeGraphyV4';

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

function extensionTarget(baseDir) {
  const packagePath = 'packages/extension';
  const manifest = readJson(path.join(baseDir, packagePath, 'package.json'));

  return {
    packageName: 'CodeGraphy VS Code Extension',
    packagePath,
    version: manifest.version,
  };
}

function packagePathForName(packageName, baseDir) {
  for (const workspaceRoot of ['apps', 'packages']) {
    const workspacePath = path.join(baseDir, workspaceRoot);
    for (const entry of readdirSync(workspacePath, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const packagePath = `${workspaceRoot}/${entry.name}`;
      const manifestPath = path.join(baseDir, packagePath, 'package.json');
      if (!existsSync(manifestPath)) continue;
      const manifest = readJson(manifestPath);
      if (manifest.name === packageName) return packagePath;
    }
  }

  throw new Error(`Cannot find workspace package ${packageName}.`);
}

export function releaseAnnouncementEntries(requestedTarget, baseDir = repoRoot) {
  return resolveReleaseTargets(requestedTarget, baseDir).map((target) => {
    if (target.kind === 'extension') {
      return extensionTarget(baseDir);
    }

    return {
      packageName: target.packageName,
      packagePath: packagePathForName(target.packageName, baseDir),
      version: target.version,
    };
  });
}

export function buildDiscordReleasePayload({
  requestedTarget,
  runId,
  sha,
  baseDir = repoRoot,
}) {
  const entries = releaseAnnouncementEntries(requestedTarget, baseDir);
  const lines = entries.map(({ packageName, packagePath, version }) => {
    const changelogUrl = `${repositoryUrl}/blob/${sha}/${packagePath}/CHANGELOG.md`;
    return `• **${packageName} ${version}** — [changelog](${changelogUrl})`;
  });
  const runUrl = `${repositoryUrl}/actions/runs/${runId}`;

  return {
    allowed_mentions: { parse: [] },
    avatar_url: `${repositoryUrl}/raw/main/assets/icon.png`,
    username: 'CodeGraphy Releases',
    embeds: [
      {
        color: 0x88b1ff,
        description: lines.join('\n'),
        footer: { text: `Release target: ${requestedTarget}` },
        timestamp: new Date().toISOString(),
        title: entries.length === 1 ? 'A new CodeGraphy release is live' : 'New CodeGraphy releases are live',
        url: runUrl,
      },
    ],
  };
}

export async function announceDiscordRelease({
  webhookUrl,
  requestedTarget,
  runId,
  sha,
  baseDir = repoRoot,
  fetchImpl = fetch,
}) {
  if (!webhookUrl) {
    throw new Error('DISCORD_WEBHOOK_URL is required.');
  }

  const response = await fetchImpl(webhookUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(buildDiscordReleasePayload({ requestedTarget, runId, sha, baseDir })),
  });

  if (!response.ok) {
    throw new Error(`Discord release announcement failed with HTTP ${response.status}.`);
  }
}

const isMain = process.argv[1]
  && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isMain) {
  const requestedTarget = process.argv[2];
  if (!requestedTarget) {
    throw new Error('Usage: node scripts/announce-discord-release.mjs <release-target>');
  }

  await announceDiscordRelease({
    webhookUrl: process.env.DISCORD_WEBHOOK_URL,
    requestedTarget,
    runId: process.env.GITHUB_RUN_ID,
    sha: process.env.GITHUB_SHA,
  });
}
