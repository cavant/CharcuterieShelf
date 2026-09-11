import assert from 'node:assert/strict';
import { test, describe } from 'node:test';

// Simulation of DeviceSettings fallback & parsing
function resolveDeviceSettings(rawSettings = {}) {
  return {
    disableAutoRewind: !!rawSettings.disableAutoRewind,
    autoDeletePlayedPodcasts: rawSettings.autoDeletePlayedPodcasts !== undefined
      ? !!rawSettings.autoDeletePlayedPodcasts
      : true,
    languageCode: rawSettings.languageCode || 'en-us'
  };
}

// Simulation of shouldDeletePodcastDownload decision logic from PlayerNotificationService.kt
function shouldDeletePodcastDownload({ globalSettings, podcastSettingsJson }) {
  const globalAutoDelete = globalSettings?.autoDeletePlayedPodcasts !== false;
  let shouldDelete = globalAutoDelete;

  if (podcastSettingsJson) {
    try {
      const parsed = typeof podcastSettingsJson === 'string'
        ? JSON.parse(podcastSettingsJson)
        : podcastSettingsJson;
      if (parsed && typeof parsed.autoDelete === 'boolean') {
        shouldDelete = parsed.autoDelete;
      }
    } catch (e) {
      // JSON parse failure retains global setting
    }
  }

  return shouldDelete;
}

// Simulation of LocalLibraryItem podcast track & episode deletion in AbsFileSystem.kt and PlayerNotificationService.kt
function simulateDeleteTrackFromItem(localLibraryItem, trackLocalFileId) {
  const item = JSON.parse(JSON.stringify(localLibraryItem));

  // Remove matching audio track and local file
  item.localFiles = item.localFiles.filter((f) => f.id !== trackLocalFileId);
  if (item.media && item.media.episodes) {
    item.media.episodes = item.media.episodes.filter(
      (ep) => ep.audioTrack?.localFileId !== trackLocalFileId && ep.id !== trackLocalFileId
    );
  }

  const hasRemainingTracks = item.localFiles.length > 0 && (item.media?.episodes?.length || 0) > 0;

  return {
    updatedItem: hasRemainingTracks ? item : null,
    removedFromDb: !hasRemainingTracks
  };
}

describe('Podcast Auto-Delete & Manual Deletion Suite', () => {
  test('Global device settings default autoDeletePlayedPodcasts to true', () => {
    const emptySettings = resolveDeviceSettings({});
    assert.strictEqual(emptySettings.autoDeletePlayedPodcasts, true, 'Default setting must be enabled');

    const explicitDisabled = resolveDeviceSettings({ autoDeletePlayedPodcasts: false });
    assert.strictEqual(explicitDisabled.autoDeletePlayedPodcasts, false, 'User preference to disable must be respected');

    const explicitEnabled = resolveDeviceSettings({ autoDeletePlayedPodcasts: true });
    assert.strictEqual(explicitEnabled.autoDeletePlayedPodcasts, true, 'Explicit enabled must be true');
  });

  test('Per-podcast settings override global autoDelete setting', () => {
    const globalEnabled = { autoDeletePlayedPodcasts: true };
    const globalDisabled = { autoDeletePlayedPodcasts: false };

    // Default inherits global
    assert.strictEqual(
      shouldDeletePodcastDownload({ globalSettings: globalEnabled, podcastSettingsJson: null }),
      true
    );
    assert.strictEqual(
      shouldDeletePodcastDownload({ globalSettings: globalDisabled, podcastSettingsJson: null }),
      false
    );

    // Show-specific disable overrides global enabled
    assert.strictEqual(
      shouldDeletePodcastDownload({
        globalSettings: globalEnabled,
        podcastSettingsJson: JSON.stringify({ autoDelete: false })
      }),
      false,
      'Per-show disable must override global enable'
    );

    // Show-specific enable overrides global disabled
    assert.strictEqual(
      shouldDeletePodcastDownload({
        globalSettings: globalDisabled,
        podcastSettingsJson: JSON.stringify({ autoDelete: true })
      }),
      true,
      'Per-show enable must override global disable'
    );
  });

  test('Deleting an episode when other episodes remain updates LocalLibraryItem without removing container', () => {
    const sampleItem = {
      id: 'local-podcast-101',
      libraryItemId: 'server-pod-101',
      mediaType: 'podcast',
      localFiles: [
        { id: 'track-ep-1', filename: 'ep1.mp3', size: 10485760 },
        { id: 'track-ep-2', filename: 'ep2.mp3', size: 12582912 }
      ],
      media: {
        episodes: [
          { id: 'local_ep_1', serverEpisodeId: 'server-ep-1', title: 'Episode 1', audioTrack: { localFileId: 'track-ep-1' } },
          { id: 'local_ep_2', serverEpisodeId: 'server-ep-2', title: 'Episode 2', audioTrack: { localFileId: 'track-ep-2' } }
        ]
      }
    };

    const result = simulateDeleteTrackFromItem(sampleItem, 'track-ep-1');

    assert.strictEqual(result.removedFromDb, false, 'LocalLibraryItem should NOT be removed when another episode remains');
    assert.ok(result.updatedItem, 'Updated item must be returned');
    assert.strictEqual(result.updatedItem.localFiles.length, 1);
    assert.strictEqual(result.updatedItem.media.episodes.length, 1);
    assert.strictEqual(result.updatedItem.media.episodes[0].id, 'local_ep_2');
  });

  test('Deleting the final remaining episode removes the empty LocalLibraryItem from database', () => {
    const singleEpisodeItem = {
      id: 'local-podcast-202',
      libraryItemId: 'server-pod-202',
      mediaType: 'podcast',
      localFiles: [
        { id: 'track-final', filename: 'final.mp3', size: 8388608 }
      ],
      media: {
        episodes: [
          { id: 'local_ep_final', serverEpisodeId: 'server-ep-final', title: 'Final Episode', audioTrack: { localFileId: 'track-final' } }
        ]
      }
    };

    const result = simulateDeleteTrackFromItem(singleEpisodeItem, 'track-final');

    assert.strictEqual(result.removedFromDb, true, 'Empty LocalLibraryItem must be flagged for DB removal');
    assert.strictEqual(result.updatedItem, null, 'No lingering container should exist');
  });

  test('UI localEpisodeMap reactively reflects deletedLocalEpisodeIds', () => {
    const localEpisodes = [
      { id: 'loc-1', serverEpisodeId: 'srv-1', title: 'Ep 1' },
      { id: 'loc-2', serverEpisodeId: 'srv-2', title: 'Ep 2' }
    ];

    const deletedLocalEpisodeIds = [];

    const getLocalEpisodeMap = () => {
      const map = {};
      localEpisodes.forEach((ep) => {
        if (deletedLocalEpisodeIds.includes(ep.id) || (ep.serverEpisodeId && deletedLocalEpisodeIds.includes(ep.serverEpisodeId))) {
          return;
        }
        if (ep.serverEpisodeId) {
          map[ep.serverEpisodeId] = ep;
        }
      });
      return map;
    };

    // Initially both episodes mapped
    assert.strictEqual(Object.keys(getLocalEpisodeMap()).length, 2);

    // Delete first episode via event
    const deleteEvent = { localLibraryItemId: 'lli-1', localEpisodeId: 'loc-1', serverEpisodeId: 'srv-1' };
    deletedLocalEpisodeIds.push(deleteEvent.localEpisodeId);
    deletedLocalEpisodeIds.push(deleteEvent.serverEpisodeId);

    const updatedMap = getLocalEpisodeMap();
    assert.strictEqual(Object.keys(updatedMap).length, 1);
    assert.strictEqual(updatedMap['srv-1'], undefined, 'Deleted episode must no longer appear in localEpisodeMap');
    assert.ok(updatedMap['srv-2'], 'Remaining episode must stay mapped');
  });
});
