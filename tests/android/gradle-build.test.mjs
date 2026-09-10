import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import fs from 'node:fs';
import path from 'node:path';

describe('Android Native Shell & Gradle Build Environment', () => {
  const androidDir = path.resolve('android');

  test('Gradle wrapper scripts exist for both POSIX and Windows', () => {
    assert.ok(fs.existsSync(path.join(androidDir, 'gradlew')), 'android/gradlew must exist');
    assert.ok(fs.existsSync(path.join(androidDir, 'gradlew.bat')), 'android/gradlew.bat must exist');
  });

  test('Release keystore is present for production signing', () => {
    const keystorePath = path.join(androidDir, 'app/release-key.jks');
    assert.ok(
      fs.existsSync(keystorePath),
      'android/app/release-key.jks must exist for signed release builds'
    );
  });

  test('System Java JDK 21 prerequisite path exists', () => {
    const isWindows = process.platform === 'win32';
    const envJava = process.env.JAVA_HOME;
    const hasJdk = (isWindows && fs.existsSync('C:\\Java\\jdk-21')) ||
                   (envJava && fs.existsSync(envJava));
    assert.ok(
      hasJdk,
      `Prerequisite Java JDK 21 must exist (checked C:\\Java\\jdk-21 and JAVA_HOME: "${envJava || 'unset'}")`
    );
  });

  test('Android SDK prerequisite path exists', () => {
    const isWindows = process.platform === 'win32';
    const envSdk = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
    const hasSdk = (isWindows && fs.existsSync('C:\\Android\\Sdk')) ||
                   (envSdk && fs.existsSync(envSdk));
    assert.ok(
      hasSdk,
      `Prerequisite Android SDK must exist (checked C:\\Android\\Sdk and ANDROID_HOME: "${envSdk || 'unset'}")`
    );
  });

  test('Kotlin daemon and toolchain configuration in android/app/build.gradle', () => {
    const appGradle = fs.readFileSync(path.join(androidDir, 'app/build.gradle'), 'utf8');
    assert.ok(
      appGradle.includes('jvmToolchain(17)') || appGradle.includes('sourceCompatibility'),
      'build.gradle must specify Java/JVM toolchain compatibility'
    );
    assert.ok(
      appGradle.includes('namespace \'com.audiobookshelf.app\''),
      'Android namespace must match "com.audiobookshelf.app"'
    );
  });
});
