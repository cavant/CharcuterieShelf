import assert from 'node:assert/strict';
import { test, describe } from 'node:test';

// Simulation of LocalStorage key resolution and store operations from plugins/localStore.js
class MockFavoritesStore {
  constructor(serverConfig = null) {
    this.serverConfig = serverConfig;
    this.storage = new Map();
  }

  _favKey(userId, serverAddress) {
    const stableId = this.serverConfig?.id || this.serverConfig?.remoteAddress || serverAddress || '';
    const addr = stableId.replace(/\/+$/, '').toLowerCase();
    return `podcast_favs_${addr}_${userId}`;
  }

  _subKey(userId, serverAddress) {
    const stableId = this.serverConfig?.id || this.serverConfig?.remoteAddress || serverAddress || '';
    const addr = stableId.replace(/\/+$/, '').toLowerCase();
    return `podcast_subs_${addr}_${userId}`;
  }

  async getUserPodcastFavorites(userId, serverAddress) {
    if (!userId || !serverAddress) return [];
    const val = this.storage.get(this._favKey(userId, serverAddress));
    return val ? JSON.parse(val) : [];
  }

  async setUserPodcastFavorites(userId, serverAddress, itemIds) {
    if (!userId || !serverAddress) return;
    this.storage.set(this._favKey(userId, serverAddress), JSON.stringify(itemIds || []));
  }

  async toggleUserPodcastFavorite(userId, serverAddress, itemId) {
    if (!userId || !serverAddress || !itemId) return false;
    const favs = await this.getUserPodcastFavorites(userId, serverAddress);
    const index = favs.indexOf(itemId);
    let isFav = false;
    if (index > -1) {
      favs.splice(index, 1);
      isFav = false;
    } else {
      favs.push(itemId);
      isFav = true;
    }
    await this.setUserPodcastFavorites(userId, serverAddress, favs);
    return isFav;
  }

  async addPodcastFavorite(userId, serverAddress, itemId) {
    if (!userId || !serverAddress || !itemId) return;
    const favs = await this.getUserPodcastFavorites(userId, serverAddress);
    if (!favs.includes(itemId)) {
      favs.push(itemId);
      await this.setUserPodcastFavorites(userId, serverAddress, favs);
    }
  }

  async removePodcastFavorite(userId, serverAddress, itemId) {
    if (!userId || !serverAddress || !itemId) return;
    const favs = await this.getUserPodcastFavorites(userId, serverAddress);
    const filtered = favs.filter((id) => id !== itemId);
    await this.setUserPodcastFavorites(userId, serverAddress, filtered);
  }
}

describe('Podcast Favorites & Subscriptions Store Engine', () => {
  test('Key generator provides strict per-user and per-server isolation', () => {
    const store = new MockFavoritesStore();

    const user1ServerA = store._favKey('user-1', 'https://audio.example.com');
    const user2ServerA = store._favKey('user-2', 'https://audio.example.com');
    const user1ServerB = store._favKey('user-1', 'https://other.example.com/');

    assert.notStrictEqual(user1ServerA, user2ServerA, 'Different users must not share keys');
    assert.notStrictEqual(user1ServerA, user1ServerB, 'Different servers must not share keys');

    // Trailing slashes should be normalized
    const normalKey = store._favKey('user-1', 'https://audio.example.com/');
    assert.strictEqual(user1ServerA, normalKey, 'Trailing slashes must be stripped');
  });

  test('Key generator prioritizes server connection config ID', () => {
    const store = new MockFavoritesStore({ id: 'stable-server-uuid', remoteAddress: 'https://wan.com' });
    const keyWithLan = store._favKey('user-1', 'http://192.168.1.50:13378');
    const keyWithWan = store._favKey('user-1', 'https://wan.com');

    // When switching between LAN and WAN, stable config ID keeps favorites synced
    assert.strictEqual(keyWithLan, 'podcast_favs_stable-server-uuid_user-1');
    assert.strictEqual(keyWithWan, 'podcast_favs_stable-server-uuid_user-1');
  });

  test('Favorites CRUD and toggle operations maintain correct array order', async () => {
    const store = new MockFavoritesStore();
    const userId = 'tester-42';
    const server = 'https://media.test';

    // Initial state empty
    let favs = await store.getUserPodcastFavorites(userId, server);
    assert.deepStrictEqual(favs, []);

    // Add first item
    await store.addPodcastFavorite(userId, server, 'show-1');
    favs = await store.getUserPodcastFavorites(userId, server);
    assert.deepStrictEqual(favs, ['show-1']);

    // Add second item
    await store.addPodcastFavorite(userId, server, 'show-2');
    favs = await store.getUserPodcastFavorites(userId, server);
    assert.deepStrictEqual(favs, ['show-1', 'show-2']);

    // Duplicate add does not duplicate
    await store.addPodcastFavorite(userId, server, 'show-1');
    favs = await store.getUserPodcastFavorites(userId, server);
    assert.deepStrictEqual(favs, ['show-1', 'show-2']);

    // Toggle off existing item
    const res1 = await store.toggleUserPodcastFavorite(userId, server, 'show-1');
    assert.strictEqual(res1, false);
    favs = await store.getUserPodcastFavorites(userId, server);
    assert.deepStrictEqual(favs, ['show-2']);

    // Toggle on item
    const res2 = await store.toggleUserPodcastFavorite(userId, server, 'show-3');
    assert.strictEqual(res2, true);
    favs = await store.getUserPodcastFavorites(userId, server);
    assert.deepStrictEqual(favs, ['show-2', 'show-3']);

    // Remove item
    await store.removePodcastFavorite(userId, server, 'show-2');
    favs = await store.getUserPodcastFavorites(userId, server);
    assert.deepStrictEqual(favs, ['show-3']);
  });

  test('Drag-and-drop reordering preserves elements and updates stored order', async () => {
    const store = new MockFavoritesStore();
    const userId = 'tester-42';
    const server = 'https://media.test';

    const initialOrder = ['show-a', 'show-b', 'show-c', 'show-d'];
    await store.setUserPodcastFavorites(userId, server, initialOrder);

    // Simulate drag show-d to index 0
    const reordered = [...initialOrder];
    const [movedItem] = reordered.splice(3, 1);
    reordered.splice(0, 0, movedItem);

    assert.deepStrictEqual(reordered, ['show-d', 'show-a', 'show-b', 'show-c']);

    await store.setUserPodcastFavorites(userId, server, reordered);
    const persisted = await store.getUserPodcastFavorites(userId, server);
    assert.deepStrictEqual(persisted, ['show-d', 'show-a', 'show-b', 'show-c']);
  });

  test('Unplayed count badge helper formats correctly', () => {
    const getBadge = (count) => {
      if (!count || count <= 0) return null;
      return count > 99 ? '99' : String(count);
    };

    assert.strictEqual(getBadge(0), null);
    assert.strictEqual(getBadge(-5), null);
    assert.strictEqual(getBadge(null), null);
    assert.strictEqual(getBadge(1), '1');
    assert.strictEqual(getBadge(15), '15');
    assert.strictEqual(getBadge(99), '99');
    assert.strictEqual(getBadge(100), '99');
    assert.strictEqual(getBadge(500), '99');
  });
});
