import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import fs from 'node:fs';
import path from 'node:path';

describe('GitHub Actions CI/CD Workflows & Issue Templates Integrity', () => {
  const workflowsDir = path.resolve('.github/workflows');
  const issueTemplatesDir = path.resolve('.github/ISSUE_TEMPLATE');

  test('All workflow files exist and declare explicit permissions', () => {
    const requiredWorkflows = [
      'build-apk.yml',
      'deploy-apk.yml',
      'i18n-check.yml',
      'close_blank_issues.yaml',
      'close-issues-on-release.yml'
    ];

    for (const file of requiredWorkflows) {
      const filePath = path.join(workflowsDir, file);
      assert.ok(fs.existsSync(filePath), `Workflow file "${file}" must exist`);

      const content = fs.readFileSync(filePath, 'utf8');
      assert.ok(
        content.includes('permissions:'),
        `Workflow "${file}" must define explicit permissions for security and consistency`
      );
    }
  });

  test('Android build workflows make gradlew executable and use Java 21', () => {
    const buildApk = fs.readFileSync(path.join(workflowsDir, 'build-apk.yml'), 'utf8');
    const deployApk = fs.readFileSync(path.join(workflowsDir, 'deploy-apk.yml'), 'utf8');

    // Chmod gradlew
    assert.ok(buildApk.includes('chmod +x ./android/gradlew'), 'build-apk must make gradlew executable');
    assert.ok(deployApk.includes('chmod +x ./android/gradlew'), 'deploy-apk must make gradlew executable');

    // Java 21
    assert.ok(buildApk.includes('java-version: 21'), 'build-apk must use Java 21');
    assert.ok(deployApk.includes('java-version: 21'), 'deploy-apk must use Java 21');

    // QA harness execution
    assert.ok(buildApk.includes('run-qa-harness.js'), 'build-apk must execute QA test harness');
    assert.ok(deployApk.includes('run-qa-harness.js'), 'deploy-apk must execute QA test harness');
  });

  test('deploy-apk.yml uses delimiter-safe sed syntax for date and commit replacement', () => {
    const deployApk = fs.readFileSync(path.join(workflowsDir, 'deploy-apk.yml'), 'utf8');
    assert.ok(
      deployApk.includes('s|__DATE__|') || deployApk.includes('s/__DATE__/'),
      'deploy-apk must substitute __DATE__'
    );
    assert.ok(
      deployApk.includes('s|__COMMIT__|') || deployApk.includes('s/__COMMIT__/'),
      'deploy-apk must substitute __COMMIT__'
    );
  });

  test('close_blank_issues.yaml whitelists closed test requests from being auto-closed', () => {
    const closeBlank = fs.readFileSync(path.join(workflowsDir, 'close_blank_issues.yaml'), 'utf8');
    assert.ok(
      closeBlank.toLowerCase().includes('tester request'),
      'close_blank_issues.yaml must whitelist "tester request"'
    );
    assert.ok(
      closeBlank.includes('tester-request'),
      'close_blank_issues.yaml must recognize "tester-request" label'
    );
  });

  test('Dedicated Google Play tester_request.yml issue template exists and contains email field', () => {
    const testerTemplatePath = path.join(issueTemplatesDir, 'tester_request.yml');
    assert.ok(fs.existsSync(testerTemplatePath), 'tester_request.yml template must exist');

    const content = fs.readFileSync(testerTemplatePath, 'utf8');
    assert.ok(content.includes('id: email'), 'Tester request template must collect Google Play email');
    assert.ok(content.includes('tester-request'), 'Tester request template must have tester-request label');
  });

  test('Bug report and feature request templates reference CharcuterieShelf versions', () => {
    const bugReport = fs.readFileSync(path.join(issueTemplatesDir, 'bug_report.yml'), 'utf8');
    const featureReq = fs.readFileSync(path.join(issueTemplatesDir, 'feature_request.yml'), 'utf8');

    assert.ok(bugReport.includes('0.14.10-beta'), 'bug_report.yml must list current version 0.14.10-beta');
    assert.ok(featureReq.includes('0.14.10-beta'), 'feature_request.yml must list current version 0.14.10-beta');
  });

  test('ISSUE_TEMPLATE/config.yml provides direct support email and live portal link', () => {
    const configYml = fs.readFileSync(path.join(issueTemplatesDir, 'config.yml'), 'utf8');
    assert.ok(
      configYml.includes('support@themagicsalami.net'),
      'config.yml must direct users to support@themagicsalami.net'
    );
    assert.ok(
      configYml.includes('https://cavant.github.io/CharcuterieShelf/'),
      'config.yml must link to the live tester portal'
    );
  });
});
