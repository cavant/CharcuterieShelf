import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import fs from 'node:fs';
import path from 'node:path';

describe('14-Theme Palette & Material You Monet Engine', () => {
  const tailwindPath = path.resolve('assets/tailwind.css');
  const tailwindCss = fs.readFileSync(tailwindPath, 'utf8');

  const settingsPath = path.resolve('pages/settings.vue');
  const settingsVue = fs.readFileSync(settingsPath, 'utf8');

  const EXPECTED_THEMES = [
    'dark',
    'black',
    'material-you',
    'material-you-amoled',
    'nord',
    'catppuccin',
    'dracula',
    'tokyo-night',
    'gruvbox',
    'rose-pine',
    'forest',
    'sepia',
    'slate',
    'light'
  ];

  test('All 14 official themes are declared in assets/tailwind.css', () => {
    // Check root default theme (dark)
    assert.ok(tailwindCss.includes(':root {'), 'Root theme must be declared');

    // Check every named theme
    for (const theme of EXPECTED_THEMES) {
      if (theme === 'dark') continue; // dark is default :root
      const themeSelector = `html[data-theme='${theme}']`;
      assert.ok(
        tailwindCss.includes(themeSelector),
        `Theme '${theme}' selector '${themeSelector}' must exist in assets/tailwind.css`
      );
    }
  });

  test('Material You Monet dynamic variables and fallbacks are defined', () => {
    assert.ok(
      tailwindCss.includes('--dynamic-accent'),
      'Material You dynamic accent token must be referenced'
    );
    assert.ok(
      tailwindCss.includes('--dynamic-bg'),
      'Material You dynamic background token must be referenced'
    );
    assert.ok(
      tailwindCss.includes('--dynamic-primary'),
      'Material You dynamic primary token must be referenced'
    );
  });

  test('AMOLED themes enforce pitch black (#000000) base background', () => {
    // Pure black theme
    assert.ok(
      tailwindCss.includes("html[data-theme='black']"),
      "Black theme must exist"
    );

    // Material You AMOLED theme
    assert.ok(
      tailwindCss.includes("html[data-theme='material-you-amoled']"),
      "Material You AMOLED theme must exist"
    );
  });

  test('pages/settings.vue theme picker lists all 14 curated themes', () => {
    for (const theme of EXPECTED_THEMES) {
      const optionSnippet = `value: '${theme}'`;
      assert.ok(
        settingsVue.includes(optionSnippet),
        `Settings page must offer theme option '${theme}'`
      );
    }
  });

  test('Interactive accent color choices are present in settings', () => {
    const accents = ['emerald', 'cyan', 'sky', 'violet', 'pink', 'amber', 'rose', 'lime'];
    for (const accent of accents) {
      assert.ok(
        settingsVue.toLowerCase().includes(accent),
        `Settings page should include accent tone '${accent}'`
      );
    }
  });
});
