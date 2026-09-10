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

function createStore(serverConfig = null) {
  const vuexStore = {
    state: {
      user: {
        serverConnectionConfig: serverConfig
      }
    }
  };
  const adapter = new MemoryPreferencesAdapter();
  return new LocalStorage(vuexStore, adapter);
}

describe('Podcast Favorites & Subscriptions Store Engine (plugins/localStore.js)', () => {
  test('Key generator provides strict per-user and per-server isolation', () => {
    const store = createStore();

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
    const store = createStore({ id: 'stable-server-uuid', remoteAddress: 'https://wan.com' });
    const keyWithLan = store._favKey('user-1', 'http://192.168.1.50:13378');
    const keyWithWan = store._favKey('user-1', 'https://wan.com');

    // When switching between LAN and WAN, stable config ID keeps favorites synced
    assert.strictEqual(keyWithLan, 'podcast_favs_stable-server-uuid_user-1');
    assert.strictEqual(keyWithWan, 'podcast_favs_stable-server-uuid_user-1');
  });

  test('Favorites CRUD and toggle operations maintain correct array order', async () => {
    const store = createStore();
    const userId = 'tester-42';
    const server = 'https://media.test';

    // Initial state empty
    let favs = await store.getUserPodcastFavorites(userId, server);
    assert.deepStrictEqual(favs, []);

    // Add first item
    await store.addUserPodcastFavorite(userId, server, 'show-1');
    favs = await store.getUserPodcastFavorites(userId, server);
    assert.deepStrictEqual(favs, ['show-1']);

    // Add second item
    await store.addUserPodcastFavorite(userId, server, 'show-2');
    favs = await store.getUserPodcastFavorites(userId, server);
    assert.deepStrictEqual(favs, ['show-1', 'show-2']);

    // Duplicate add does not duplicate
    await store.addUserPodcastFavorite(userId, server, 'show-1');
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
    await store.removeUserPodcastFavorite(userId, server, 'show-2');
    favs = await store.getUserPodcastFavorites(userId, server);
    assert.deepStrictEqual(favs, ['show-3']);
  });

  test('Subscription operations isolate subscriptions per user and server', async () => {
    const store = createStore();
    const userId = 'tester-99';
    const server = 'https://podcast.homelab';

    let subs = await store.getUserPodcastSubscriptions(userId, server);
    assert.strictEqual(subs, null);

    await store.addUserPodcastSubscription(userId, server, 'pod-1');
    subs = await store.getUserPodcastSubscriptions(userId, server);
    assert.deepStrictEqual(subs, ['pod-1']);

    await store.addUserPodcastSubscription(userId, server, 'pod-2');
    subs = await store.getUserPodcastSubscriptions(userId, server);
    assert.deepStrictEqual(subs, ['pod-1', 'pod-2']);

    await store.removeUserPodcastSubscription(userId, server, 'pod-1');
    subs = await store.getUserPodcastSubscriptions(userId, server);
    assert.deepStrictEqual(subs, ['pod-2']);
  });

  test('Drag-and-drop reordering preserves elements and updates stored order', async () => {
    const store = createStore();
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

  test('Unplayed count badge helper formatting matching favorites.vue', () => {
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
