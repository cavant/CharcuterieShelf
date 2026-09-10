import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import fs from 'node:fs';
import path from 'node:path';

describe('i18n Localization Integrity & Alphabetization', () => {
  const stringsDir = path.resolve('strings');
  const files = fs.readdirSync(stringsDir).filter((f) => f.endsWith('.json'));

  test('Finds all localization files in strings directory', () => {
    assert.ok(files.length >= 40, `Expected at least 40 translation files, found ${files.length}`);
    assert.ok(files.includes('en-us.json'), 'en-us.json must be present');
  });

  for (const file of files) {
    test(`Locale file "${file}" is valid JSON, ends with newline, and keys are sorted`, () => {
      const filePath = path.join(stringsDir, file);
      const content = fs.readFileSync(filePath, 'utf8');

      // Check trailing newline
      assert.ok(content.endsWith('\n'), `${file} must end with a trailing newline`);

      // Check parseable JSON
      let json;
      try {
        json = JSON.parse(content);
      } catch (err) {
        assert.fail(`${file} is not valid JSON: ${err.message}`);
      }

      // Check alphabetical ordering of keys (standard UTF-16 / ASCII code unit sort)
      const keys = Object.keys(json);
      for (let i = 0; i < keys.length - 1; i++) {
        if (keys[i] > keys[i + 1]) {
          assert.fail(
            `${file}: Key "${keys[i]}" should not precede "${keys[i + 1]}" (ASCII alphabetical order required)`
          );
        }
      }
    });
  }

  test('Primary locale "en-us.json" contains required CharcuterieShelf keys', () => {
    const enUsPath = path.join(stringsDir, 'en-us.json');
    const enUs = JSON.parse(fs.readFileSync(enUsPath, 'utf8'));

    const requiredKeys = [
      'LabelFavorites',
      'LabelThemeBlack',
      'LabelThemeLight'
    ];

    for (const key of requiredKeys) {
      assert.ok(enUs[key], `en-us.json must define translation key "${key}"`);
    }
  });
});
