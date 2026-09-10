import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import { parseSemver, isNewerVersion } from '../../utils/semverUtils.js';

describe('In-App Update Checker & Semver Engine', () => {
  test('parseSemver parses standard semantic versions', () => {
    const v1 = parseSemver('0.14.7-beta');
    assert.strictEqual(v1.major, 0);
    assert.strictEqual(v1.minor, 14);
    assert.strictEqual(v1.patch, 7);
    assert.strictEqual(v1.pre, 'beta');
    assert.strictEqual(v1.preNum, 0);

    const v2 = parseSemver('v1.2.3');
    assert.strictEqual(v2.major, 1);
    assert.strictEqual(v2.minor, 2);
    assert.strictEqual(v2.patch, 3);
    assert.strictEqual(v2.pre, null);

    const v3 = parseSemver('v0.14.5-beta2');
    assert.strictEqual(v3.major, 0);
    assert.strictEqual(v3.minor, 14);
    assert.strictEqual(v3.patch, 5);
    assert.strictEqual(v3.pre, 'beta2');
    assert.strictEqual(v3.preNum, 2);
  });

  test('parseSemver gracefully handles edge cases and invalid input', () => {
    const empty = parseSemver('');
    assert.strictEqual(empty.major, 0);
    assert.strictEqual(empty.minor, 0);
    assert.strictEqual(empty.patch, 0);

    const nil = parseSemver(null);
    assert.strictEqual(nil.major, 0);

    const undef = parseSemver(undefined);
    assert.strictEqual(undef.major, 0);

    const malformed = parseSemver('not-a-version');
    assert.strictEqual(malformed.major, 0);
  });

  test('isNewerVersion correctly compares major, minor, and patch bumps', () => {
    assert.strictEqual(isNewerVersion('0.14.6', '0.14.7'), true);
    assert.strictEqual(isNewerVersion('0.14.7', '0.14.6'), false);

    assert.strictEqual(isNewerVersion('0.14.7', '0.15.0'), true);
    assert.strictEqual(isNewerVersion('0.15.0', '0.14.7'), false);

    assert.strictEqual(isNewerVersion('0.14.7', '1.0.0'), true);
    assert.strictEqual(isNewerVersion('1.0.0', '0.14.7'), false);
  });

  test('isNewerVersion correctly prioritizes GA releases over prereleases', () => {
    // A stable GA release (0.14.7) is newer than a prerelease of the same version (0.14.7-beta)
    assert.strictEqual(isNewerVersion('0.14.7-beta', '0.14.7'), true);
    assert.strictEqual(isNewerVersion('0.14.7', '0.14.7-beta'), false);

    // Identical versions are not newer
    assert.strictEqual(isNewerVersion('0.14.7-beta', '0.14.7-beta'), false);
    assert.strictEqual(isNewerVersion('0.14.7', '0.14.7'), false);
  });

  test('isNewerVersion correctly resolves numbered prereleases', () => {
    assert.strictEqual(isNewerVersion('0.14.5-beta1', '0.14.5-beta2'), true);
    assert.strictEqual(isNewerVersion('0.14.5-beta2', '0.14.5-beta1'), false);
  });

  test('Release asset selection strictly filters for Android APKs', () => {
    const mockAssets = [
      { name: 'CharcuterieShelf.aab', browser_download_url: 'https://example.com/app.aab' },
      { name: 'source_code.tar.gz', browser_download_url: 'https://example.com/src.tar.gz' },
      { name: 'CharcuterieShelf.apk', browser_download_url: 'https://example.com/CharcuterieShelf.apk' }
    ];

    const apkAsset = mockAssets.find((a) => a.name && a.name.endsWith('.apk'));
    assert.ok(apkAsset, 'Should find an APK asset');
    assert.strictEqual(apkAsset.name, 'CharcuterieShelf.apk');
    assert.strictEqual(apkAsset.browser_download_url, 'https://example.com/CharcuterieShelf.apk');
  });
});
