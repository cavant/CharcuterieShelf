#!/usr/bin/env node

/**
 * CharcuterieShelf Full-Stack End-to-End Testing & Code Review Harness
 *
 * Runs comprehensive verification suites across:
 * - Frontend logic & key user flows (update-checker, duration, favorites, theming, download-queue)
 * - Localization syntax, ASCII sorting, and key completeness
 * - Native branding, manifests, and com.CharcuterieShelf integrity
 * - GitHub Actions CI/CD workflows and issue templates
 * - Static Nuxt bundle pre-rendering health
 * - Android Gradle environment and build readiness
 *
 * Usage:
 *   node scripts/run-qa-harness.js [--all | --unit | --i18n | --branding | --github | --build | --android | --compile]
 */

const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const args = process.argv.slice(2);
const runAll = args.length === 0 || args.includes('--all');
const runUnit = runAll || args.includes('--unit');
const runI18n = runAll || args.includes('--i18n');
const runBranding = runAll || args.includes('--branding');
const runGithub = runAll || args.includes('--github');
const runBuild = runAll || args.includes('--build');
const runAndroid = runAll || args.includes('--android');
const runCompile = args.includes('--compile');

const rootDir = path.resolve(__dirname, '..');

const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  magenta: '\x1b[35m'
};

function banner() {
  console.log(`${colors.bold}${colors.cyan}================================================================${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}    🥪📚 CharcuterieShelf Full-Stack QA & Test Harness        ${colors.reset}`);
  console.log(`${colors.gray}    Nuxt 2 • Capacitor 7 • Android Kotlin • GitHub CI/CD${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}================================================================${colors.reset}\n`);
}

const testSuites = [];

if (runUnit) {
  testSuites.push(
    { name: 'Update Checker & Semver Engine', file: 'tests/unit/update-checker.test.mjs', category: 'Frontend Unit' },
    { name: 'Playback Duration & Timestamp Parser', file: 'tests/unit/duration-parser.test.mjs', category: 'Frontend Unit' },
    { name: 'Podcast Favorites & Subscriptions Store', file: 'tests/unit/favorites-store.test.mjs', category: 'Frontend Unit' },
    { name: '14 Theme Palettes & Monet Engine', file: 'tests/unit/theming.test.mjs', category: 'Frontend Unit' },
    { name: 'Download Queue & Recovery Logic', file: 'tests/unit/download-queue.test.mjs', category: 'Frontend Unit' }
  );
}

if (runI18n) {
  testSuites.push(
    { name: 'i18n Syntax & Alphabetization (42 Locales)', file: 'tests/i18n/i18n-syntax-sort.test.mjs', category: 'Localization' }
  );
}

if (runBranding) {
  testSuites.push(
    { name: 'Application ID, Branding & Manifests', file: 'tests/branding/manifest-branding.test.mjs', category: 'Branding & Manifest' }
  );
}

if (runGithub) {
  testSuites.push(
    { name: 'GitHub CI/CD Workflows & Templates', file: 'tests/github/workflows-templates.test.mjs', category: 'CI/CD & Workflows' }
  );
}

if (runBuild) {
  testSuites.push(
    { name: 'Nuxt Static Bundle & Route Health', file: 'tests/e2e/bundle-build.test.mjs', category: 'Static Bundle' }
  );
}

if (runAndroid) {
  testSuites.push(
    { name: 'Android Shell & Gradle Environment', file: 'tests/android/gradle-build.test.mjs', category: 'Android Native' }
  );
}

async function run() {
  banner();
  const startTime = Date.now();
  let passedSuites = 0;
  let failedSuites = 0;
  const results = [];

  if (runCompile) {
    console.log(`${colors.bold}${colors.magenta}>>> Step 1: Compiling Nuxt Frontend Bundle (npm run generate)...${colors.reset}`);
    const gen = spawnSync('npm', ['run', 'generate'], { cwd: rootDir, stdio: 'inherit', shell: true });
    if (gen.status !== 0) {
      console.error(`${colors.red}❌ Nuxt compilation failed!${colors.reset}`);
      process.exit(1);
    }
  }

  console.log(`${colors.bold}Executing ${testSuites.length} Verification Test Suites:${colors.reset}\n`);

  for (const suite of testSuites) {
    const fullPath = path.join(rootDir, suite.file);
    if (!fs.existsSync(fullPath)) {
      console.error(`${colors.red}❌ Suite file missing: ${suite.file}${colors.reset}`);
      failedSuites++;
      results.push({ name: suite.name, category: suite.category, status: 'MISSING', duration: 0 });
      continue;
    }

    process.stdout.write(`  [RUN] ${suite.category} → ${suite.name} ... `);
    const suiteStart = Date.now();
    const result = spawnSync('node', ['--test', fullPath], {
      cwd: rootDir,
      encoding: 'utf8',
      shell: true
    });
    const suiteDuration = Date.now() - suiteStart;

    if (result.status === 0) {
      process.stdout.write(`${colors.green}PASSED${colors.reset} ${colors.gray}(${suiteDuration}ms)${colors.reset}\n`);
      passedSuites++;
      results.push({ name: suite.name, category: suite.category, status: 'PASSED', duration: suiteDuration });
    } else {
      process.stdout.write(`${colors.red}FAILED${colors.reset} ${colors.gray}(${suiteDuration}ms)${colors.reset}\n`);
      failedSuites++;
      results.push({
        name: suite.name,
        category: suite.category,
        status: 'FAILED',
        duration: suiteDuration,
        error: result.stderr || result.stdout
      });
    }
  }

  const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log(`\n${colors.bold}================================================================${colors.reset}`);
  console.log(`${colors.bold}                      VERIFICATION SUMMARY                      ${colors.reset}`);
  console.log(`${colors.bold}================================================================${colors.reset}`);

  for (const res of results) {
    const statusIcon = res.status === 'PASSED' ? `${colors.green}✔ PASSED${colors.reset}` : `${colors.red}✖ ${res.status}${colors.reset}`;
    const namePadded = (res.category + ': ' + res.name).padEnd(52, ' ');
    console.log(`  ${namePadded} ${statusIcon} ${colors.gray}(${res.duration}ms)${colors.reset}`);
  }

  console.log(`${colors.bold}================================================================${colors.reset}`);
  console.log(`  Total Suites:  ${results.length}`);
  console.log(`  Passed:        ${colors.green}${passedSuites}${colors.reset}`);
  console.log(`  Failed:        ${failedSuites > 0 ? colors.red : colors.green}${failedSuites}${colors.reset}`);
  console.log(`  Duration:      ${totalDuration}s`);
  console.log(`${colors.bold}================================================================${colors.reset}\n`);

  if (failedSuites > 0) {
    console.error(`${colors.bold}${colors.red}❌ QA Verification Failed! Review the failed suites above.${colors.reset}\n`);
    for (const res of results) {
      if (res.error) {
        console.error(`${colors.bold}${colors.red}--- Failure Output for ${res.name} ---${colors.reset}`);
        console.error(res.error);
      }
    }
    process.exit(1);
  } else {
    console.log(`${colors.bold}${colors.green}🎉 ALL VERIFICATION CHECKS PASSED! The app is release-ready!${colors.reset}\n`);
    process.exit(0);
  }
}

run().catch((err) => {
  console.error('Unexpected harness error:', err);
  process.exit(1);
});
