import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import { parseDuration, secondsToTimestamp } from '../../utils/playbackUtils.js';

describe('Podcast & Audio Playback Duration Utilities', () => {
  test('parseDuration correctly parses standard HH:MM:SS timestamps', () => {
    assert.strictEqual(parseDuration('01:23:45'), 5025);
    assert.strictEqual(parseDuration('1:00:00'), 3600);
    assert.strictEqual(parseDuration('00:01:30'), 90);
  });

  test('parseDuration correctly parses MM:SS and M:SS timestamps', () => {
    assert.strictEqual(parseDuration('45:30'), 2730);
    assert.strictEqual(parseDuration('05:12'), 312);
    assert.strictEqual(parseDuration('5:02'), 302);
    assert.strictEqual(parseDuration('0:45'), 45);
  });

  test('parseDuration correctly accepts numeric strings and raw numbers', () => {
    assert.strictEqual(parseDuration('3600'), 3600);
    assert.strictEqual(parseDuration(1800), 1800);
    assert.strictEqual(parseDuration(0), 0);
  });

  test('parseDuration safely returns 0 on invalid, malformed, or empty input', () => {
    assert.strictEqual(parseDuration(''), 0);
    assert.strictEqual(parseDuration(null), 0);
    assert.strictEqual(parseDuration(undefined), 0);
    assert.strictEqual(parseDuration('not:a:number'), 0);
    assert.strictEqual(parseDuration('::'), 0);
    assert.strictEqual(parseDuration(NaN), 0);
  });

  test('secondsToTimestamp formats seconds into readable time strings', () => {
    assert.strictEqual(secondsToTimestamp(0), '0:00');
    assert.strictEqual(secondsToTimestamp(45), '0:45');
    assert.strictEqual(secondsToTimestamp(65), '1:05');
    assert.strictEqual(secondsToTimestamp(3665), '1:01:05');
    assert.strictEqual(secondsToTimestamp(7200), '2:00:00');
  });

  test('secondsToTimestamp safely handles invalid or negative input', () => {
    assert.strictEqual(secondsToTimestamp(null), '0:00');
    assert.strictEqual(secondsToTimestamp(undefined), '0:00');
    assert.strictEqual(secondsToTimestamp(-10), '0:00');
    assert.strictEqual(secondsToTimestamp(NaN), '0:00');
  });
});
