import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import { LocalStorage } from '../../plugins/localStore.js';

class MemoryPreferencesAdapter {
  constructor() {
    this.map = new Map();
  }
  async get({ key }) {
    return { value: this.map.has(key) ? this.map.get(key) : null };
  }
  async set({ key, value }) {
    this.map.set(key, String(value));
  }
  async remove({ key }) {
    this.map.delete(key);
  }
}

function createStore() {
  const vuexStore = { state: { user: {} } };
  const adapter = new MemoryPreferencesAdapter();
  return new LocalStorage(vuexStore, adapter);
}

describe('Combined Home & Podcast Automation Settings (plugins/localStore.js)', () => {
  test('defaultHomeSection defaults to "home" and persists section changes', async () => {
    const store = createStore();
    const initial = await store.getDefaultHomeSection();
    assert.strictEqual(initial, 'home', 'Should default to "home" section');

    await store.setDefaultHomeSection('book');
    const bookSection = await store.getDefaultHomeSection();
    assert.strictEqual(bookSection, 'book', 'Should persist "book" section');

    await store.setDefaultHomeSection('podcast');
    const podcastSection = await store.getDefaultHomeSection();
    assert.strictEqual(podcastSection, 'podcast', 'Should persist "podcast" section');

    await store.setDefaultHomeSection('home');
    const homeSection = await store.getDefaultHomeSection();
    assert.strictEqual(homeSection, 'home', 'Should return to "home" section');
  });

  test('knownPodcastEpisodes correctly records and retrieves episode IDs for change detection', async () => {
    const store = createStore();
    const podcastId = 'pod-12345';

    const initial = await store.getKnownPodcastEpisodes(podcastId);
    assert.strictEqual(initial, null, 'Unseeded podcast should return null');

    const seedEpisodes = ['ep-1', 'ep-2', 'ep-3'];
    await store.setKnownPodcastEpisodes(podcastId, seedEpisodes);

    const retrieved = await store.getKnownPodcastEpisodes(podcastId);
    assert.deepStrictEqual(retrieved, seedEpisodes);

    // Detect new episodes
    const currentServerEpisodes = ['ep-1', 'ep-2', 'ep-3', 'ep-4', 'ep-5'];
    const newEpisodes = currentServerEpisodes.filter(id => !retrieved.includes(id));
    assert.deepStrictEqual(newEpisodes, ['ep-4', 'ep-5'], 'Should correctly isolate new un-notified episodes');
  });

  test('globalPodcastAutomationSettings defaults and update persistence', async () => {
    const store = createStore();
    const defaults = await store.getGlobalPodcastAutomationSettings();
    assert.strictEqual(defaults.autoDownloadNew, false);
    assert.strictEqual(defaults.notifyNewEpisodes, true);
    assert.strictEqual(defaults.autoAddToQueue, false);

    await store.setGlobalPodcastAutomationSettings({
      autoDownloadNew: true,
      notifyNewEpisodes: true,
      autoAddToQueue: true,
      queuePosition: 'next'
    });

    const updated = await store.getGlobalPodcastAutomationSettings();
    assert.strictEqual(updated.autoDownloadNew, true);
    assert.strictEqual(updated.autoAddToQueue, true);
    assert.strictEqual(updated.queuePosition, 'next');
  });

  test('Podcast settings modal saves auto-download, notification, and queue configuration per-show', async () => {
    const store = createStore();
    const podcastId = 'podcast-salami-special';

    const customSettings = {
      skipFirst: 15,
      skipLast: 30,
      skipSilence: true,
      autoDelete: true,
      autoDownloadNew: true,
      notifyNewEpisodes: false,
      autoAddToQueue: true,
      queuePosition: 'next',
      customSpeed: 1.4
    };

    await store.setPodcastSettings(podcastId, customSettings);
    const loaded = await store.getPodcastSettings(podcastId);

    assert.deepStrictEqual(loaded, customSettings);
    assert.strictEqual(loaded.autoDownloadNew, true);
    assert.strictEqual(loaded.notifyNewEpisodes, false);
    assert.strictEqual(loaded.autoAddToQueue, true);
    assert.strictEqual(loaded.queuePosition, 'next');
  });
});
