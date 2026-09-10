import assert from 'node:assert/strict';
import { test, describe } from 'node:test';

// Simulation of backoff and URL resolution logic from DownloadItemManager.kt / InternalDownloadManager.kt
function calculateRetryDelayMs(retryCount) {
  const baseDelayMs = 2000;
  const maxDelayMs = 32000;
  const factor = Math.pow(2, Math.max(0, retryCount - 1));
  return Math.min(baseDelayMs * factor, maxDelayMs);
}

function resolveDownloadUrl(serverBaseUrl, serverPath) {
  if (!serverPath) return '';
  if (serverPath.startsWith('http://') || serverPath.startsWith('https://')) {
    return serverPath;
  }
  const base = serverBaseUrl.replace(/\/+$/, '');
  const path = serverPath.startsWith('/') ? serverPath : `/${serverPath}`;
  return `${base}${path}`;
}

function shouldAttachBearerToken(requestUrl, serverAddress) {
  try {
    const reqHost = new URL(requestUrl).host.toLowerCase();
    const srvHost = new URL(serverAddress).host.toLowerCase();
    return reqHost === srvHost;
  } catch {
    return false;
  }
}

describe('Resilient Download Manager & Queue Recovery Engine', () => {
  test('calculateRetryDelayMs implements exponential backoff up to 32s cap', () => {
    assert.strictEqual(calculateRetryDelayMs(1), 2000);  // 2s
    assert.strictEqual(calculateRetryDelayMs(2), 4000);  // 4s
    assert.strictEqual(calculateRetryDelayMs(3), 8000);  // 8s
    assert.strictEqual(calculateRetryDelayMs(4), 16000); // 16s
    assert.strictEqual(calculateRetryDelayMs(5), 32000); // 32s
    assert.strictEqual(calculateRetryDelayMs(6), 32000); // capped at 32s
    assert.strictEqual(calculateRetryDelayMs(10), 32000); // capped at 32s
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
  });

  test('shouldAttachBearerToken isolates authorization tokens from third-party hosts', () => {
    const serverUrl = 'https://audio.myhomelab.org';

    // Request to user's server receives auth token
    const isServerReq = shouldAttachBearerToken('https://audio.myhomelab.org/api/items/123/download', serverUrl);
    assert.strictEqual(isServerReq, true);

    // Third-party podcast CDNs must NEVER receive server authorization tokens
    assert.strictEqual(shouldAttachBearerToken('https://podtrac.com/pts/redirect.mp3/audio.mp3', serverUrl), false);
    assert.strictEqual(shouldAttachBearerToken('https://traffic.megaphone.fm/show.mp3', serverUrl), false);
    assert.strictEqual(shouldAttachBearerToken('https://media.simplecast.com/episode.mp3', serverUrl), false);
    assert.strictEqual(shouldAttachBearerToken('https://pdst.fm/e/audio.mp3', serverUrl), false);
  });

  test('Queue batch operations transition items cleanly', () => {
    let queue = [
      { id: 'item-1', status: 'downloading', progress: 45 },
      { id: 'item-2', status: 'queued', progress: 0 },
      { id: 'item-3', status: 'failed', error: 'Network timeout', retryCount: 2 },
      { id: 'item-4', status: 'failed', error: 'HTTP 502', retryCount: 1 }
    ];

    // Filter failed items
    const failed = queue.filter((i) => i.status === 'failed');
    assert.strictEqual(failed.length, 2);

    // Retry all failed
    queue = queue.map((i) => (i.status === 'failed' ? { ...i, status: 'queued', error: null } : i));
    const active = queue.filter((i) => i.status === 'queued' || i.status === 'downloading');
    assert.strictEqual(active.length, 4);

    // Clear failed (when none failed)
    queue = queue.filter((i) => i.status !== 'failed');
    assert.strictEqual(queue.length, 4);

    // Simulate failure and clear
    queue[0].status = 'failed';
    queue = queue.filter((i) => i.status !== 'failed');
    assert.strictEqual(queue.length, 3);
  });
});
