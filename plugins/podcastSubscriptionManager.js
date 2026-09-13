import { AbsAudioPlayer, AbsDownloader } from '@/plugins/capacitor'

class PodcastSubscriptionManager {
  constructor(app, store) {
    this.app = app
    this.store = store
    this.isChecking = false
    this.lastCheckTime = 0
    this.checkIntervalMs = 15 * 60 * 1000 // 15 minutes minimum between background checks
  }

  get localStore() {
    return this.app.$localStore
  }

  get nativeHttp() {
    return this.app.$nativeHttp
  }

  get user() {
    return this.store.state.user?.user
  }

  get serverAddress() {
    return this.store.getters['user/getServerAddress']
  }

  get networkConnected() {
    return this.store.state.networkConnected
  }

  /**
   * Main scan function: checks all subscribed podcasts for new episodes
   * and triggers auto-download, notification, and/or auto-queue according
   * to podcast and global settings.
   */
  async checkSubscribedPodcasts(force = false) {
    if (this.isChecking) return
    if (!this.user || !this.serverAddress || !this.networkConnected) return

    const now = Date.now()
    if (!force && now - this.lastCheckTime < this.checkIntervalMs) {
      return
    }

    this.isChecking = true
    this.lastCheckTime = now

    try {
      const subs = (await this.localStore.getUserPodcastSubscriptions(this.user.id, this.serverAddress)) || []
      if (!subs.length) {
        this.isChecking = false
        return
      }

      const globalAuto = await this.localStore.getGlobalPodcastAutomationSettings()

      for (const podcastId of subs) {
        try {
          await this.checkPodcast(podcastId, globalAuto)
        } catch (err) {
          console.warn(`[PodcastSubscriptionManager] Error checking podcast ${podcastId}:`, err?.message)
        }
      }
    } catch (e) {
      console.error('[PodcastSubscriptionManager] Check error:', e)
    } finally {
      this.isChecking = false
    }
  }

  async checkPodcast(podcastId, globalAuto) {
    // Fetch podcast details from server
    const podcastData = await this.nativeHttp.get(`/api/items/${podcastId}?include=rssfeed`, { connectTimeout: 12000 }).catch(() => null)
    if (!podcastData) return

    const episodes = podcastData.media?.episodes || podcastData.episodes || []
    if (!episodes.length) return

    const currentEpisodeIds = episodes.map(e => e.id)
    const known = await this.localStore.getKnownPodcastEpisodes(podcastId)

    if (!known) {
      // First time tracking this podcast: seed known episode set without triggering notifications/downloads
      await this.localStore.setKnownPodcastEpisodes(podcastId, currentEpisodeIds)
      return
    }

    // Identify newly published episodes
    const newEpisodes = episodes.filter(ep => !known.includes(ep.id))
    if (!newEpisodes.length) return

    console.log(`[PodcastSubscriptionManager] Found ${newEpisodes.length} new episodes for podcast ${podcastId}`)

    // Get per-podcast settings (falling back to global defaults)
    const podcastSettings = (await this.localStore.getPodcastSettings(podcastId)) || {}
    const autoDownload = podcastSettings.autoDownloadNew !== undefined ? !!podcastSettings.autoDownloadNew : globalAuto.autoDownloadNew
    const notify = podcastSettings.notifyNewEpisodes !== undefined ? !!podcastSettings.notifyNewEpisodes : globalAuto.notifyNewEpisodes
    const autoQueue = podcastSettings.autoAddToQueue !== undefined ? !!podcastSettings.autoAddToQueue : globalAuto.autoAddToQueue
    const queuePosition = podcastSettings.queuePosition || globalAuto.queuePosition || 'last'
    const podcastTitle = podcastData.media?.metadata?.title || 'Podcast'

    for (const ep of newEpisodes) {
      // 1. New episode system notification
      if (notify && AbsAudioPlayer?.postEpisodeNotification) {
        try {
          await AbsAudioPlayer.postEpisodeNotification({
            title: ep.title || 'New Episode',
            podcastTitle: podcastTitle,
            body: ep.subtitle || ep.description || ''
          })
        } catch (e) {
          console.warn('[PodcastSubscriptionManager] Failed to post notification:', e)
        }
      }

      // 2. Auto-download to device storage
      if (autoDownload && AbsDownloader?.downloadLibraryItem) {
        try {
          const downloadPayload = {
            libraryItemId: podcastId,
            episodeId: ep.id,
            enclosureUrl: ep.enclosure?.url || ep.audioTrack?.contentUrl || '',
            episodeTitle: ep.title || 'Episode',
            episodeDuration: ep.duration || 0,
            episodePubDate: ep.pubDate || '',
            episodePublishedAt: ep.publishedAt || Date.now(),
            episodeDescription: ep.description || '',
            episodeSubtitle: ep.subtitle || '',
            episodeSeason: ep.season || '',
            episodeNumber: ep.episode || '',
            episodeType: ep.episodeType || 'full',
            mimeType: ep.enclosure?.type || 'audio/mpeg'
          }
          await AbsDownloader.downloadLibraryItem(downloadPayload)
          console.log(`[PodcastSubscriptionManager] Auto-download queued for episode ${ep.id}`)
        } catch (e) {
          console.warn('[PodcastSubscriptionManager] Failed to trigger auto-download:', e)
        }
      }

      // 3. Auto-add to Up Next playback queue
      if (autoQueue) {
        this.store.commit('globals/addToQueue', {
          item: podcastData,
          episode: ep,
          position: queuePosition
        })
        console.log(`[PodcastSubscriptionManager] Auto-added episode ${ep.id} to queue (${queuePosition})`)
      }
    }

    // Update known episodes
    const updatedKnown = Array.from(new Set([...known, ...currentEpisodeIds]))
    await this.localStore.setKnownPodcastEpisodes(podcastId, updatedKnown)
  }

  init() {
    // Run on startup after brief settling delay
    setTimeout(() => {
      this.checkSubscribedPodcasts()
    }, 6000)

    // Listen for events that warrant re-checking
    this.app.$eventBus?.$on('podcast-subscription-changed', () => {
      setTimeout(() => this.checkSubscribedPodcasts(true), 2000)
    })
    this.app.$eventBus?.$on('abs-ui-ready', () => {
      setTimeout(() => this.checkSubscribedPodcasts(), 4000)
    })
  }
}

export default ({ app, store }, inject) => {
  if (!process.client) return
  const manager = new PodcastSubscriptionManager(app, store)
  manager.init()
  inject('podcastSubscriptionManager', manager)
}
