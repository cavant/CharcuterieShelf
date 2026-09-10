import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import {
  MAX_DOWNLOAD_RETRIES,
  calculateRetryDelayMs,
  resolveDownloadUrl,
  shouldAttachBearerToken,
  isItemFailed,
  isItemActive,
  getFailedPartsCount,
  getQueueCounts
} from '../../utils/downloadQueueUtils.js';

describe('Resilient Download Manager & Queue Recovery Engine', () => {
  test('calculateRetryDelayMs matches Kotlin DownloadItemManager.kt exponential backoff and cap', () => {
    // Exact Kotlin: (1000L * (1 shl (part.retryCount - 1))).coerceAtMost(30000L)
    assert.strictEqual(calculateRetryDelayMs(1), 1000);  // 1s
    assert.strictEqual(calculateRetryDelayMs(2), 2000);  // 2s
    assert.strictEqual(calculateRetryDelayMs(3), 4000);  // 4s
    assert.strictEqual(calculateRetryDelayMs(4), 8000);  // 8s
    assert.strictEqual(calculateRetryDelayMs(5), 16000); // 16s

    // Max retries is 5 in DownloadItemManager.kt: retry 6+ is terminal failure
    assert.strictEqual(MAX_DOWNLOAD_RETRIES, 5);
    assert.strictEqual(calculateRetryDelayMs(6), null, 'Exceeding MAX_RETRIES must yield null (terminal failure)');
    assert.strictEqual(calculateRetryDelayMs(10), null);

    // Edge cases
    assert.strictEqual(calculateRetryDelayMs(0), 0);
    assert.strictEqual(calculateRetryDelayMs(-1), 0);
  });

  test('resolveDownloadUrl prevents server URL prepend on external podcast CDNs', () => {
    const serverUrl = 'http://192.168.1.69:13378';

    // External podcast CDN enclosure URL
    const externalEnclosure = 'https://chrt.fm/track/12345/traffic.megaphone.fm/show.mp3';
    const resolvedExternal = resolveDownloadUrl(serverUrl, externalEnclosure);
    assert.strictEqual(resolvedExternal, externalEnclosure);
    assert.ok(!resolvedExternal.includes('192.168.1.69'), 'External URL must never contain server address');

    // Local server library audio file
    const localPath = '/api/items/book-123/file/part-1/download';
    const resolvedLocal = resolveDownloadUrl(serverUrl, localPath);
    assert.strictEqual(resolvedLocal, 'http://192.168.1.69:13378/api/items/book-123/file/part-1/download');

    // Local server cover image appends ?raw=1 (matching DownloadItemPart.kt)
    const coverPath = '/api/items/book-123/cover';
    const resolvedCover = resolveDownloadUrl(serverUrl, coverPath);
    assert.strictEqual(resolvedCover, 'http://192.168.1.69:13378/api/items/book-123/cover?raw=1');
  });

  test('shouldAttachBearerToken isolates authorization tokens from third-party hosts', () => {
    const serverUrl = 'https://audio.myhomelab.org';
    const localUrl = 'http://192.168.1.50:13378';

    // Request to user's remote or local server receives auth token
    assert.strictEqual(shouldAttachBearerToken('https://audio.myhomelab.org/api/items/123/download', serverUrl, '', localUrl), true);
    assert.strictEqual(shouldAttachBearerToken('http://192.168.1.50:13378/api/items/123/download', serverUrl, '', localUrl), true);

    // Third-party podcast CDNs must NEVER receive server authorization tokens
    assert.strictEqual(shouldAttachBearerToken('https://podtrac.com/pts/redirect.mp3/audio.mp3', serverUrl), false);
    assert.strictEqual(shouldAttachBearerToken('https://traffic.megaphone.fm/show.mp3', serverUrl), false);
    assert.strictEqual(shouldAttachBearerToken('https://media.simplecast.com/episode.mp3', serverUrl), false);
    assert.strictEqual(shouldAttachBearerToken('https://pdst.fm/e/audio.mp3', serverUrl), false);
  });

  test('isItemFailed and isItemActive accurately reflect part states', () => {
    const activeItem = {
      id: 'book-1',
      downloadItemParts: [
        { id: 'part-1', completed: true, failed: false },
        { id: 'part-2', completed: false, failed: false, downloadId: 101 }
      ]
    };
    assert.strictEqual(isItemFailed(activeItem), false);
    assert.strictEqual(isItemActive(activeItem), true);
    assert.strictEqual(getFailedPartsCount(activeItem), 0);

    const failedItem = {
      id: 'book-2',
      downloadItemParts: [
        { id: 'part-1', completed: true, failed: false },
        { id: 'part-2', completed: false, failed: true }
      ]
    };
    assert.strictEqual(isItemFailed(failedItem), true);
    assert.strictEqual(isItemActive(failedItem), false);
    assert.strictEqual(getFailedPartsCount(failedItem), 1);

    const queuedItem = {
      id: 'book-3',
      downloadItemParts: [
        { id: 'part-1', completed: false, failed: false, downloadId: null }
      ]
    };
    assert.strictEqual(isItemFailed(queuedItem), false);
    assert.strictEqual(isItemActive(queuedItem), false);

    const terminalItem = {
      id: 'book-4',
      terminalFailureAt: 12345678,
      downloadItemParts: []
    };
    assert.strictEqual(isItemFailed(terminalItem), true);
  });

  test('getQueueCounts accurately aggregates queue statistics', () => {
    const items = [
      { id: '1', downloadItemParts: [{ downloadId: 1 }] },
      { id: '2', downloadItemParts: [{ failed: true }] },
      { id: '3', downloadItemParts: [{ downloadId: null }] },
      { id: '4', hasFailed: true }
    ];

    const counts = getQueueCounts(items);
    assert.strictEqual(counts.total, 4);
    assert.strictEqual(counts.failed, 2);
    assert.strictEqual(counts.active, 1);
    assert.strictEqual(counts.queued, 1);
  });
});
