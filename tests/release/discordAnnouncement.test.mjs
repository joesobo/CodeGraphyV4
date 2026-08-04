import assert from 'node:assert/strict';
import test from 'node:test';

import {
  announceDiscordRelease,
  buildDiscordReleasePayload,
  releaseAnnouncementEntries,
} from '../../scripts/announce-discord-release.mjs';

const repoRoot = process.cwd();

test('builds an exact package and version entry for a targeted npm release', () => {
  const entries = releaseAnnouncementEntries('core', repoRoot);

  assert.deepEqual(entries, [{
    packageName: '@codegraphy-dev/core',
    packagePath: 'packages/core',
    version: '5.0.2',
  }]);
});

test('builds the Marketplace extension entry from its private package manifest', () => {
  const entries = releaseAnnouncementEntries('extension', repoRoot);

  assert.deepEqual(entries, [{
    packageName: 'CodeGraphy VS Code Extension',
    packagePath: 'packages/extension',
    version: '5.16.2',
  }]);
});

test('links Discord announcements to the immutable changelog and workflow run', () => {
  const payload = buildDiscordReleasePayload({
    requestedTarget: 'core',
    runId: '1234',
    sha: 'abc123',
    baseDir: repoRoot,
  });

  assert.equal(payload.username, 'CodeGraphy Releases');
  assert.equal(payload.embeds[0].url, 'https://github.com/joesobo/CodeGraphyV4/actions/runs/1234');
  assert.match(payload.embeds[0].description, /@codegraphy-dev\/core 5\.0\.2/);
  assert.match(payload.embeds[0].description, /blob\/abc123\/packages\/core\/CHANGELOG\.md/);
});

test('posts the release payload to Discord without allowing mentions', async () => {
  let request;
  await announceDiscordRelease({
    webhookUrl: 'https://discord.example/webhook',
    requestedTarget: 'core',
    runId: '1234',
    sha: 'abc123',
    baseDir: repoRoot,
    fetchImpl: async (url, options) => {
      request = { url, options };
      return { ok: true };
    },
  });

  assert.equal(request.url, 'https://discord.example/webhook');
  assert.deepEqual(JSON.parse(request.options.body).allowed_mentions, { parse: [] });
});
