import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const desktopManifest = JSON.parse(readFileSync('apps/desktop/package.json', 'utf8'));
const tauriConfiguration = JSON.parse(readFileSync('apps/desktop/src-tauri/tauri.conf.json', 'utf8'));
const cargoManifest = readFileSync('apps/desktop/src-tauri/Cargo.toml', 'utf8');
const releaseWorkflow = readFileSync('.github/workflows/desktop-release.yml', 'utf8');
const releaseEntitlements = readFileSync('apps/desktop/src-tauri/Entitlements.plist', 'utf8');
const adHocConfiguration = JSON.parse(readFileSync('apps/desktop/src-tauri/tauri.ad-hoc.conf.json', 'utf8'));
const adHocEntitlements = readFileSync('apps/desktop/src-tauri/Entitlements.ad-hoc.plist', 'utf8');
const websiteLinks = readFileSync('apps/web/content/links.ts', 'utf8');
const websiteDesktopCallToAction = readFileSync('apps/web/app/_components/get-started.tsx', 'utf8');

function cargoPackageVersion() {
  const packageSection = cargoManifest.match(/^\[package\]\n([\s\S]*?)(?=^\[)/mu)?.[1];
  return packageSection?.match(/^version = "([^"]+)"$/mu)?.[1];
}

test('desktop package versions have one release identity', () => {
  assert.equal(cargoPackageVersion(), desktopManifest.version);
  assert.equal(tauriConfiguration.version, desktopManifest.version);
});

test('desktop bundle contract is macOS 26 with app and DMG assets', () => {
  assert.equal(tauriConfiguration.bundle.macOS.minimumSystemVersion, '26.0');
  assert.deepEqual(tauriConfiguration.bundle.targets, ['app', 'dmg']);
  assert.equal(tauriConfiguration.bundle.macOS.hardenedRuntime, true);
  assert.equal(tauriConfiguration.bundle.macOS.signingIdentity, undefined);
  assert.doesNotMatch(cargoManifest, /^strip = true$/mu);
  assert.doesNotMatch(releaseEntitlements, /disable-library-validation/u);
  assert.equal(adHocConfiguration.bundle.macOS.signingIdentity, '-');
  assert.match(adHocEntitlements, /disable-library-validation/u);
});

test('desktop release stays gated until signed artifacts pass verification', () => {
  assert.match(releaseWorkflow, /workflow_dispatch:/u);
  assert.match(releaseWorkflow, /runs-on: macos-26/u);
  assert.match(releaseWorkflow, /environment: desktop-release/u);
  assert.match(releaseWorkflow, /CODEGRAPHY_DESKTOP_REQUIRE_RELEASE_SIGNATURE: '1'/u);
  assert.match(releaseWorkflow, /test "\$GITHUB_REF" = "refs\/heads\/main"/u);
  assert.match(releaseWorkflow, /xcodebuild -version \| grep -q '\^Xcode 26\\\.'/u);
  assert.match(releaseWorkflow, /Verify release bundle/u);
  assert.match(releaseWorkflow, /notarytool submit "\$dmg"/u);
  assert.match(releaseWorkflow, /stapler staple "\$dmg"/u);
  assert.match(releaseWorkflow, /gh release create "\$RELEASE_TAG" --draft/u);
  assert.doesNotMatch(releaseWorkflow, /gh release edit .*--draft=false/u);
});

test('website does not advertise an unavailable desktop artifact', () => {
  assert.match(websiteLinks, /available: false/u);
  assert.match(websiteLinks, /Signed macOS download pending/u);
  assert.doesNotMatch(websiteLinks, /releases\/download/u);
  assert.match(websiteDesktopCallToAction, /Read the release status/u);
  assert.doesNotMatch(websiteDesktopCallToAction, /Download for macOS/u);
});
