import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import fs from 'node:fs';
import path from 'node:path';

describe('Application ID, Branding & Native Manifest Integrity', () => {
  const buildGradlePath = path.resolve('android/app/build.gradle');
  const buildGradle = fs.readFileSync(buildGradlePath, 'utf8');

  const stringsXmlPath = path.resolve('android/app/src/main/res/values/strings.xml');
  const stringsXml = fs.readFileSync(stringsXmlPath, 'utf8');

  const manifestXmlPath = path.resolve('android/app/src/main/AndroidManifest.xml');
  const manifestXml = fs.readFileSync(manifestXmlPath, 'utf8');

  const capConfigPath = path.resolve('capacitor.config.json');
  const capConfig = JSON.parse(fs.readFileSync(capConfigPath, 'utf8'));

  const iosCapConfigPath = path.resolve('ios/App/App/capacitor.config.json');
  const iosCapConfig = JSON.parse(fs.readFileSync(iosCapConfigPath, 'utf8'));

  test('Android build.gradle strictly preserves com.CharcuterieShelf applicationId', () => {
    assert.ok(
      buildGradle.includes('applicationId "com.CharcuterieShelf"'),
      'CRITICAL: applicationId in android/app/build.gradle must strictly be "com.CharcuterieShelf"'
    );
    assert.ok(
      buildGradle.includes('"appAuthRedirectScheme": "com.CharcuterieShelf"'),
      'appAuthRedirectScheme must match "com.CharcuterieShelf"'
    );
  });

  test('Android build.gradle targets Android API 36 (Android 16)', () => {
    assert.ok(
      buildGradle.includes('targetSdkVersion rootProject.ext.targetSdkVersion') ||
      buildGradle.includes('targetSdkVersion 36'),
      'targetSdkVersion must resolve to 36'
    );
  });

  test('Android strings.xml defines proper branding names and custom URL scheme', () => {
    assert.ok(
      stringsXml.includes('<string name="app_name">CharcuterieShelf</string>'),
      'app_name must be "CharcuterieShelf"'
    );
    assert.ok(
      stringsXml.includes('<string name="package_name">com.CharcuterieShelf</string>'),
      'package_name must be "com.CharcuterieShelf"'
    );
    assert.ok(
      stringsXml.includes('<string name="custom_url_scheme">charcuterieshelf</string>'),
      'custom_url_scheme must be "charcuterieshelf"'
    );
  });

  test('Capacitor configurations in root and iOS define com.CharcuterieShelf', () => {
    assert.strictEqual(capConfig.appId, 'com.CharcuterieShelf');
    assert.strictEqual(capConfig.appName, 'CharcuterieShelf');

    assert.strictEqual(iosCapConfig.appId, 'com.CharcuterieShelf');
    assert.strictEqual(iosCapConfig.appName, 'CharcuterieShelf');
  });

  test('AndroidManifest.xml contains all essential service and security declarations', () => {
    // FileProvider for in-app APK installer
    assert.ok(
      manifestXml.includes('androidx.core.content.FileProvider'),
      'FileProvider must be declared for in-app updates'
    );
    assert.ok(
      manifestXml.includes('android:authorities="${applicationId}.fileprovider"'),
      'FileProvider authorities must match ${applicationId}.fileprovider'
    );

    // Foreground service permissions
    assert.ok(manifestXml.includes('android.permission.FOREGROUND_SERVICE'));
    assert.ok(manifestXml.includes('android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK'));
    assert.ok(manifestXml.includes('android.permission.FOREGROUND_SERVICE_DATA_SYNC'));
    assert.ok(manifestXml.includes('android.permission.REQUEST_INSTALL_PACKAGES'));
    assert.ok(manifestXml.includes('android.permission.POST_NOTIFICATIONS'));

    // MediaBrowserService for Android Auto
    assert.ok(
      manifestXml.includes('android.media.browse.MediaBrowserService'),
      'MediaBrowserService action must be declared for Android Auto'
    );

    // Automotive description metadata
    assert.ok(
      manifestXml.includes('com.google.android.gms.car.application'),
      'Automotive car application metadata must be declared'
    );
  });

  test('Required native assets and vector drawables exist', () => {
    const requiredAssets = [
      'android/app/src/main/res/drawable/icon.png',
      'android/app/src/main/res/drawable/icon_monochrome.xml',
      'android/app/src/main/res/drawable/widget_card_background.xml',
      'android/app/src/main/res/xml/automotive_app_desc.xml',
      'android/app/src/main/res/xml/media_player_widget_info.xml',
      'android/app/src/main/res/xml/file_paths.xml'
    ];

    for (const assetPath of requiredAssets) {
      assert.ok(
        fs.existsSync(path.resolve(assetPath)),
        `Required asset "${assetPath}" does not exist`
      );
    }
  });
});
