<template>
  <div class="w-full">
    <!-- Podcast episode downloads queue -->
    <div v-if="episodeDownloadsQueued.length" class="px-4 py-2 my-2 bg-info bg-opacity-40 text-sm font-semibold rounded-md text-fg relative w-full">
      <div class="flex items-center">
        <p class="text-sm py-1">{{ $getString('MessageEpisodesQueuedForDownload', [episodeDownloadsQueued.length]) }}</p>
        <div class="flex-grow" />
        <span v-if="isAdminOrUp" class="material-symbols text-xl ml-3 cursor-pointer" @click="clearDownloadQueue">close</span>
      </div>
    </div>

    <!-- Podcast episodes currently downloading -->
    <div v-if="episodesDownloading.length" class="px-4 py-2 my-2 bg-success bg-opacity-20 text-sm font-semibold rounded-md text-fg relative w-full">
      <div v-for="episode in episodesDownloading" :key="episode.id" class="flex items-center">
        <widgets-loading-spinner />
        <p class="text-sm py-1 pl-4">{{ $strings.MessageDownloadingEpisode }} "{{ episode.episodeDisplayTitle }}"</p>
      </div>
    </div>

    <!-- RSS Feed Loading Indicator -->
    <div v-if="fetchingRSSFeed" class="px-4 py-2 my-2 bg-primary/30 text-sm rounded-md text-fg-muted relative w-full flex items-center">
      <widgets-loading-spinner class="mr-3" />
      <p class="text-sm">Loading full episode feed...</p>
    </div>

    <div class="flex items-center">
      <p class="text-lg mb-1 font-semibold">{{ $strings.HeaderEpisodes }} ({{ episodesFiltered.length }})</p>

      <div class="flex-grow" />

      <!-- Pocket Casts Podcast Settings shortcut -->
      <button class="outline-none mx-2 pt-0.5 text-fg-muted hover:text-accent" title="Podcast Settings" @click="showPodcastSettingsModal = true">
        <span class="material-symbols text-xl">tune</span>
      </button>

      <button v-if="isAdminOrUp && !fetchingRSSFeed" class="outline:none mx-1 pt-0.5 relative" @click="searchEpisodes">
        <span class="material-symbols text-xl text-fg">rss_feed</span>
      </button>
      <widgets-loading-spinner v-else-if="fetchingRSSFeed" class="mx-1" />

      <button class="outline:none mx-2 pt-0.5 relative" @click="showFilters">
        <span class="material-symbols text-xl text-fg">filter_alt</span>
        <div v-show="filterKey !== 'all' && episodesAreFiltered" class="absolute top-0 right-0 w-1.5 h-1.5 rounded-full bg-success border border-green-300 shadow-sm z-10 pointer-events-none" />
      </button>

      <div class="flex items-center border border-white border-opacity-25 rounded px-2" @click="clickSort">
        <p class="text-sm text-fg">{{ sortText }}</p>
        <span class="material-symbols ml-1 text-fg">{{ sortDesc ? 'arrow_drop_down' : 'arrow_drop_up' }}</span>
      </div>
    </div>

    <!-- Pocket Casts Filter Chips & Search Bar -->
    <div class="my-2 space-y-2">
      <div class="relative">
        <input v-model="searchQuery" type="text" placeholder="Search episodes..." class="w-full bg-primary/40 border border-border/50 rounded-xl px-3 py-1.5 pl-9 text-sm text-fg placeholder-fg-muted/60 focus:outline-none focus:border-accent" />
        <span class="material-symbols text-fg-muted/70 text-lg absolute left-2.5 top-2 pointer-events-none">search</span>
        <button v-if="searchQuery" class="absolute right-2.5 top-2 text-fg-muted hover:text-fg" @click="searchQuery = ''">
          <span class="material-symbols text-lg">close</span>
        </button>
      </div>

      <div class="flex items-center space-x-1.5 overflow-x-auto no-scrollbar py-1">
        <button
          v-for="item in filterItems"
          :key="item.value"
          class="px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors"
          :class="filterKey === item.value ? 'bg-accent text-black shadow-sm' : 'bg-secondary text-fg-muted hover:text-fg hover:bg-bg-hover'"
          @click="setFilter(item.value)"
        >
          {{ item.text }}
        </button>
      </div>
    </div>

    <!-- Episode List with Section Dividers -->
    <template v-for="(episode, index) in episodesSorted">
      <!-- Divider between downloaded and server sections -->
      <div v-if="index === downloadedSectionEndIndex && downloadedSectionEndIndex > 0 && filterKey !== 'downloaded'" :key="'divider-dl-' + episode.id" class="flex items-center py-2 px-1 opacity-60">
        <div class="flex-grow border-t border-border/60" />
        <span class="px-3 text-xs text-fg-muted font-medium uppercase tracking-wide">On Server</span>
        <div class="flex-grow border-t border-border/60" />
      </div>

      <!-- Divider between server and RSS-only sections -->
      <div v-if="index === rssSectionStartIndex && rssSectionStartIndex > 0 && rssSectionStartIndex < episodesSorted.length && filterKey !== 'downloaded'" :key="'divider-rss-' + episode.id" class="flex items-center py-2 px-1 opacity-60">
        <div class="flex-grow border-t border-border/60" />
        <span class="px-3 text-xs text-fg-muted font-medium uppercase tracking-wide">Feed Only</span>
        <div class="flex-grow border-t border-border/60" />
      </div>

      <tables-podcast-episode-row
        :episode="episode"
        :local-episode="localEpisodeMap[episode.id]"
        :library-item-id="libraryItemId"
        :local-library-item-id="localLibraryItemId"
        :is-local="isLocal"
        :is-rss-only="!!episode._rssOnly"
        :sort-key="sortKey"
        :key="episode.id || episode._rssId"
        @addToPlaylist="addEpisodeToPlaylist"
        @downloadToServer="downloadEpisodeToServer"
      />
    </template>

    <!-- Huhhh?
        Without anything below the template it will not re-render -->
    <p>&nbsp;</p>

    <modals-dialog v-model="showFiltersModal" title="Episode Filter" :items="filterItems" :selected="filterKey" @action="setFilter" />

    <modals-podcast-episodes-feed-modal v-model="showPodcastEpisodeFeed" :library-item="libraryItem" :episodes="podcastFeedEpisodes" />

    <modals-order-modal v-model="showSortModal" :order-by.sync="sortKey" :descending.sync="sortDesc" episodes />

    <modals-podcast-settings-modal v-model="showPodcastSettingsModal" :library-item="libraryItem" />
  </div>
</template>

<script>
import { Dialog } from '@capacitor/dialog'

export default {
  props: {
    libraryItem: {
      type: Object,
      default: () => {}
    },
    episodes: {
      type: Array,
      default: () => []
    },
    localLibraryItemId: String,
    localEpisodes: {
      type: Array,
      default: () => []
    },
    isLocal: Boolean // If is local then episodes and libraryItemId are local, otherwise local is passed in localLibraryItemId and localEpisodes
  },
  data() {
    return {
      episodesCopy: [],
      searchQuery: '',
      showPodcastSettingsModal: false,
      showFiltersModal: false,
      showSortModal: false,
      fetchingRSSFeed: false,
      podcastFeedEpisodes: [],
      rssFeedEpisodes: [], // Full RSS feed episodes merged into the main list
      showPodcastEpisodeFeed: false,
      episodesDownloading: [],
      episodeDownloadsQueued: []
    }
  },
  watch: {
    episodes: {
      immediate: true,
      handler() {
        this.init()
      }
    }
  },
  computed: {
    isAdminOrUp() {
      return this.$store.getters['user/getIsAdminOrUp']
    },
    socketConnected() {
      return this.$store.state.socketConnected
    },
    libraryItemId() {
      return this.libraryItem?.id || null
    },
    media() {
      return this.libraryItem?.media || {}
    },
    mediaMetadata() {
      return this.media.metadata || {}
    },
    feedUrl() {
      return this.mediaMetadata.feedUrl || null
    },
    episodesAreFiltered() {
      return this.episodesFiltered.length !== this.allEpisodesMerged.length
    },
    episodeSortItems() {
      return [
        {
          text: this.$strings.LabelPubDate,
          value: 'publishedAt'
        },
        {
          text: this.$strings.LabelTitle,
          value: 'title'
        },
        {
          text: 'Duration',
          value: 'duration'
        },
        {
          text: this.$strings.LabelSeason,
          value: 'season'
        },
        {
          text: this.$strings.LabelEpisode,
          value: 'episode'
        },
        {
          text: this.$strings.LabelFilename,
          value: 'audioFile.metadata.filename'
        }
      ]
    },
    filterItems() {
      return [
        {
          text: this.$strings.LabelShowAll,
          value: 'all'
        },
        {
          text: this.$strings.LabelIncomplete,
          value: 'incomplete'
        },
        {
          text: this.$strings.LabelInProgress,
          value: 'inProgress'
        },
        {
          text: this.$strings.LabelComplete,
          value: 'complete'
        },
        {
          text: this.$strings.LabelDownloaded,
          value: 'downloaded'
        }
      ]
    },
    // Map of server episode enclosure URLs for matching against RSS feed
    serverEpisodeEnclosureMap() {
      const map = {}
      this.episodesCopy.forEach((ep) => {
        if (ep.enclosure?.url) {
          map[ep.enclosure.url] = ep.id
        }
        // Also map by audioFile URL as fallback
        if (ep.audioFile?.metadata?.path) {
          map[ep.audioFile.metadata.path] = ep.id
        }
      })
      return map
    },
    // Merge server episodes with RSS-only episodes
    allEpisodesMerged() {
      // Start with server episodes
      const merged = [...this.episodesCopy]

      // Add RSS-only episodes (those not already on server)
      this.rssFeedEpisodes.forEach((rssEp) => {
        const enclosureUrl = rssEp.enclosure?.url
        if (enclosureUrl && !this.serverEpisodeEnclosureMap[enclosureUrl]) {
          // This RSS episode is not on the server — add it as RSS-only
          merged.push({
            // Map RSS feed episode fields to match server episode structure
            id: null,
            _rssOnly: true,
            _rssId: 'rss_' + this._hashString(enclosureUrl),
            title: rssEp.title || 'Untitled',
            subtitle: rssEp.subtitle || rssEp.description || '',
            description: rssEp.description || '',
            publishedAt: rssEp.publishedAt || null,
            season: rssEp.season || null,
            episode: rssEp.episode || null,
            episodeType: rssEp.episodeType || null,
            duration: rssEp.duration ? Number(rssEp.duration) : null,
            enclosure: rssEp.enclosure || null,
            _rssEpisodeData: rssEp // Keep original RSS data for server download
          })
        }
      })

      return merged
    },
    episodesFiltered() {
      return this.allEpisodesMerged.filter((ep) => {
        if (this.searchQuery) {
          const q = this.searchQuery.toLowerCase().trim()
          const matchesTitle = ep.title?.toLowerCase().includes(q)
          const matchesSubtitle = ep.subtitle?.toLowerCase().includes(q)
          const matchesDescription = ep.description?.toLowerCase().includes(q)
          if (!matchesTitle && !matchesSubtitle && !matchesDescription) return false
        }
        if (this.filterKey === 'downloaded') {
          return !!this.localEpisodeMap[ep.id]
        }
        // RSS-only episodes have no server progress — show them in 'all' and 'incomplete'
        if (ep._rssOnly) {
          return this.filterKey === 'all' || this.filterKey === 'incomplete'
        }
        var mediaProgress = this.getEpisodeProgress(ep)
        if (this.filterKey === 'incomplete') {
          return !mediaProgress?.isFinished
        } else if (this.filterKey === 'complete') {
          return mediaProgress?.isFinished
        } else if (this.filterKey === 'inProgress') {
          return mediaProgress && !mediaProgress.isFinished
        } else if (this.filterKey === 'all') {
          return true
        }
        return true
      })
    },
    episodesSorted() {
      const sorted = this.episodesFiltered.slice().sort((a, b) => {
        let aValue
        let bValue

        // Duration sort uses numeric comparison
        if (this.sortKey === 'duration') {
          aValue = a.duration || 0
          bValue = b.duration || 0
          if (this.sortDesc) return bValue - aValue
          return aValue - bValue
        }

        if (this.sortKey.includes('.')) {
          const getNestedValue = (ob, s) => s.split('.').reduce((o, k) => o?.[k], ob)
          aValue = getNestedValue(a, this.sortKey)
          bValue = getNestedValue(b, this.sortKey)
        } else {
          aValue = a[this.sortKey]
          bValue = b[this.sortKey]
        }

        // Sort episodes with no pub date as the oldest
        if (this.sortKey === 'publishedAt') {
          if (!aValue) aValue = Number.MAX_VALUE
          if (!bValue) bValue = Number.MAX_VALUE
        }

        if (this.sortDesc) {
          return String(bValue).localeCompare(String(aValue), undefined, { numeric: true, sensitivity: 'base' })
        }
        return String(aValue).localeCompare(String(bValue), undefined, { numeric: true, sensitivity: 'base' })
      })

      // Float downloaded episodes to the top, server episodes next, RSS-only at bottom (Pocket Casts style)
      if (this.filterKey !== 'downloaded') {
        const downloaded = sorted.filter((ep) => !ep._rssOnly && !!this.localEpisodeMap[ep.id])
        const onServer = sorted.filter((ep) => !ep._rssOnly && !this.localEpisodeMap[ep.id])
        const rssOnly = sorted.filter((ep) => !!ep._rssOnly)
        return [...downloaded, ...onServer, ...rssOnly]
      }
      return sorted
    },
    // Index in episodesSorted where downloaded episodes end and on-server begin
    downloadedSectionEndIndex() {
      const sorted = this.episodesSorted
      let count = 0
      for (const ep of sorted) {
        if (!ep._rssOnly && this.localEpisodeMap[ep.id]) {
          count++
        } else {
          break
        }
      }
      return count
    },
    // Index in episodesSorted where RSS-only episodes begin
    rssSectionStartIndex() {
      const sorted = this.episodesSorted
      let idx = sorted.length
      for (let i = 0; i < sorted.length; i++) {
        if (sorted[i]._rssOnly) {
          idx = i
          break
        }
      }
      return idx
    },
    // Map of local episodes where server episode id is key
    localEpisodeMap() {
      var epmap = {}
      this.localEpisodes.forEach((localEp) => {
        if (localEp.serverEpisodeId) {
          epmap[localEp.serverEpisodeId] = localEp
        }
      })
      return epmap
    },
    sortText() {
      if (!this.sortKey) return ''
      if (this.sortKey === 'publishedAt') {
        return this.sortDesc ? 'Newest' : 'Oldest'
      }
      if (this.sortKey === 'duration') {
        return this.sortDesc ? 'Longest' : 'Shortest'
      }
      if (this.sortKey === 'title') {
        return this.sortDesc ? 'Z → A' : 'A → Z'
      }
      const _sel = this.episodeSortItems.find((i) => i.value === this.sortKey)
      return _sel?.text || ''
    },
    filterKey() {
      return this.$store.getters['user/getUserSetting']('podcastEpisodesFilterBy') || 'all'
    },
    sortKey: {
      get() {
        return this.$store.getters['user/getUserSetting']('podcastEpisodesOrderBy') || 'publishedAt'
      },
      set(val) {
        this.$store.dispatch('user/updateUserSettings', { podcastEpisodesOrderBy: val })
      }
    },
    sortDesc: {
      get() {
        const desc = this.$store.getters['user/getUserSetting']('podcastEpisodesOrderDesc')
        if (desc == null) return this.mediaMetadata.type === 'episodic'
        return desc
      },
      set(val) {
        this.$store.dispatch('user/updateUserSettings', { podcastEpisodesOrderDesc: val })
      }
    }
  },
  methods: {
    _hashString(str) {
      // Simple hash for generating stable IDs from enclosure URLs
      let hash = 0
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i)
        hash = ((hash << 5) - hash) + char
        hash |= 0
      }
      return Math.abs(hash).toString(36)
    },
    async clearDownloadQueue() {
      const { value } = await Dialog.confirm({
        title: this.$strings.HeaderConfirm,
        message: this.$strings.MessageConfirmDeleteEpisodeDownloadQueue
      })

      if (value) {
        this.$nativeHttp
          .get(`/api/podcasts/${this.libraryItemId}/clear-queue`)
          .then(() => {
            this.$toast.success('Episode download queue cleared')
            this.episodeDownloadQueued = []
          })
          .catch((error) => {
            console.error('Failed to clear queue', error)
            this.$toast.error('Failed to clear queue')
          })
      }
    },
    async fetchRSSFeedInline() {
      // Auto-fetch the RSS feed to show all episodes inline (Pocket Casts style)
      if (!this.feedUrl || this.isLocal || this.fetchingRSSFeed) return

      this.fetchingRSSFeed = true
      const payload = await this.$nativeHttp.post(`/api/podcasts/feed`, { rssFeed: this.feedUrl }).catch((error) => {
        console.error('Failed to fetch RSS feed inline', error)
        return null
      })
      this.fetchingRSSFeed = false

      if (payload?.podcast?.episodes?.length) {
        console.log(`[EpisodesTable] Loaded ${payload.podcast.episodes.length} RSS feed episodes`)
        this.rssFeedEpisodes = payload.podcast.episodes
      }
    },
    async searchEpisodes() {
      if (!this.socketConnected) {
        return this.$toast.error(this.$strings.MessageNoNetworkConnection)
      }

      if (!this.mediaMetadata.feedUrl) {
        return this.$toast.error('Podcast does not have an RSS Feed')
      }
      this.fetchingRSSFeed = true
      const payload = await this.$nativeHttp.post(`/api/podcasts/feed`, { rssFeed: this.mediaMetadata.feedUrl }).catch((error) => {
        console.error('Failed to get feed', error)
        this.$toast.error('Failed to get podcast feed')
        return null
      })
      this.fetchingRSSFeed = false
      if (!payload) return

      console.log('Podcast feed', payload)
      const podcastfeed = payload.podcast
      if (!podcastfeed.episodes || !podcastfeed.episodes.length) {
        this.$toast.info('No episodes found in RSS feed')
        return
      }

      this.podcastFeedEpisodes = podcastfeed.episodes
      this.showPodcastEpisodeFeed = true
    },
    async downloadEpisodeToServer(rssEpisode) {
      // Download an RSS-only episode to the server so it can be streamed
      if (!rssEpisode?._rssEpisodeData) return

      const episodeData = rssEpisode._rssEpisodeData
      this.$toast.info(`Adding "${episodeData.title}" to server...`)

      try {
        await this.$nativeHttp.post(`/api/podcasts/${this.libraryItemId}/download-episodes`, [episodeData])
        this.$toast.success('Episode download started on server')
      } catch (error) {
        console.error('Failed to download episode to server', error)
        this.$toast.error('Failed to add episode to server')
      }
    },
    addEpisodeToPlaylist(episode) {
      this.$store.commit('globals/setSelectedPlaylistItems', [{ libraryItem: this.libraryItem, episode }])
      this.$store.commit('globals/setShowPlaylistsAddCreateModal', true)
    },
    setFilter(filter) {
      this.showFiltersModal = false
      this.$store.dispatch('user/updateUserSettings', { podcastEpisodesFilterBy: filter })
    },
    showFilters() {
      this.showFiltersModal = true
    },
    clickSort() {
      this.showSortModal = true
    },
    getEpisodeProgress(episode) {
      if (!episode.id) return null // RSS-only episodes have no progress
      if (this.isLocal) return this.$store.getters['globals/getLocalMediaProgressById'](this.libraryItemId, episode.id)
      return this.$store.getters['user/getUserMediaProgress'](this.libraryItemId, episode.id)
    },
    init() {
      this.episodesCopy = this.episodes.map((ep) => {
        return { ...ep }
      })
    },
    episodeDownloadQueued(episodeDownload) {
      if (episodeDownload.libraryItemId === this.libraryItemId) {
        this.episodeDownloadsQueued.push(episodeDownload)
      }
    },
    episodeDownloadStarted(episodeDownload) {
      if (episodeDownload.libraryItemId === this.libraryItemId) {
        this.episodeDownloadsQueued = this.episodeDownloadsQueued.filter((d) => d.id !== episodeDownload.id)
        this.episodesDownloading.push(episodeDownload)
      }
    },
    episodeDownloadFinished(episodeDownload) {
      if (episodeDownload.libraryItemId === this.libraryItemId) {
        this.episodeDownloadsQueued = this.episodeDownloadsQueued.filter((d) => d.id !== episodeDownload.id)
        this.episodesDownloading = this.episodesDownloading.filter((d) => d.id !== episodeDownload.id)
      }
    }
  },
  mounted() {
    if (this.$route.query['episodefilter'] === 'downloaded') {
      this.$store.dispatch('user/updateUserSettings', { podcastEpisodesFilterBy: 'downloaded' })
    }
    this.$socket.$on('episode_download_queued', this.episodeDownloadQueued)
    this.$socket.$on('episode_download_started', this.episodeDownloadStarted)
    this.$socket.$on('episode_download_finished', this.episodeDownloadFinished)

    // Auto-fetch RSS feed to show full episode catalog inline (Pocket Casts style)
    this.fetchRSSFeedInline()
  },
  beforeDestroy() {
    this.$socket.$off('episode_download_queued', this.episodeDownloadQueued)
    this.$socket.$off('episode_download_started', this.episodeDownloadStarted)
    this.$socket.$off('episode_download_finished', this.episodeDownloadFinished)
  }
}
</script>
