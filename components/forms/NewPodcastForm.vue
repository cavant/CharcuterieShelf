<template>
  <div class="w-full px-2">
    <img v-if="podcast.imageUrl" :src="podcast.imageUrl" class="h-36 w-36 object-contain mx-auto mb-2" />

    <ui-text-input-with-label v-model="podcast.title" :label="$strings.LabelTitle" class="mb-2 text-sm" @input="titleUpdated" />

    <ui-text-input-with-label v-model="podcast.author" :label="$strings.LabelAuthor" class="mb-2 text-sm" />

    <ui-text-input-with-label v-model="podcast.feedUrl" :label="$strings.LabelFeedURL" readonly class="mb-2 text-sm" />

    <ui-multi-select v-model="podcast.genres" :items="podcast.genres" :label="$strings.LabelGenres" class="mb-2 text-sm" />

    <ui-textarea-with-label v-model="podcast.description" :label="$strings.LabelDescription" :rows="3" class="mb-2 text-sm" />

    <ui-dropdown v-model="selectedFolderId" :items="folderItems" :disabled="processing" :label="$strings.LabelFolder" class="mb-2 text-sm" @input="folderUpdated" />

    <ui-text-input-with-label v-model="fullPath" :label="$strings.LabelPath" input-class="h-10" readonly class="mb-2 text-sm" />

    <div class="flex items-center py-4 px-2">
      <div class="flex items-center space-x-1.5 text-xs text-fg-muted">
        <span class="material-symbols text-success text-base">smartphone</span>
        <span>Device-only download & stream</span>
      </div>
      <div class="flex-grow" />
      <ui-btn color="success" @click="submit">{{ $strings.ButtonSubmit }}</ui-btn>
    </div>
  </div>
</template>

<script>
import Path from 'path'

export default {
  props: {
    processing: Boolean,
    podcastData: {
      type: Object,
      default: () => null
    },
    podcastFeedData: {
      type: Object,
      default: () => null
    }
  },
  data() {
    return {
      selectedFolderId: null,
      fullPath: null,
      podcast: {
        title: '',
        author: '',
        description: '',
        releaseDate: '',
        genres: [],
        feedUrl: '',
        feedImageUrl: '',
        itunesPageUrl: '',
        itunesId: '',
        itunesArtistId: '',
        autoDownloadEpisodes: false
      }
    }
  },
  computed: {
    _processing: {
      get() {
        return this.processing
      },
      set(val) {
        this.$emit('update:processing', val)
      }
    },
    title() {
      return this._podcastData.title
    },
    currentLibrary() {
      return this.$store.getters['libraries/getCurrentLibrary']
    },
    folders() {
      if (!this.currentLibrary) return []
      return this.currentLibrary.folders || []
    },
    folderItems() {
      return this.folders.map((fold) => {
        return {
          value: fold.id,
          text: fold.fullPath
        }
      })
    },
    _podcastData() {
      return this.podcastData || {}
    },
    feedMetadata() {
      if (!this.podcastFeedData) return {}
      return this.podcastFeedData.metadata || {}
    },
    episodes() {
      if (!this.podcastFeedData) return []
      return this.podcastFeedData.episodes || []
    },
    selectedFolder() {
      return this.folders.find((f) => f.id === this.selectedFolderId)
    },
    selectedFolderPath() {
      if (!this.selectedFolder) return ''
      return this.selectedFolder.fullPath
    }
  },
  methods: {
    titleUpdated() {
      this.folderUpdated()
    },
    folderUpdated() {
      if (!this.selectedFolderPath || !this.podcast.title) {
        this.fullPath = ''
        return
      }
      this.fullPath = Path.join(this.selectedFolderPath, this.$sanitizeFilename(this.podcast.title))
    },
    async submit() {
      const podcastPayload = {
        path: this.fullPath,
        folderId: this.selectedFolderId,
        libraryId: this.currentLibrary.id,
        media: {
          metadata: {
            title: this.podcast.title,
            author: this.podcast.author,
            description: this.podcast.description,
            releaseDate: this.podcast.releaseDate,
            genres: [...this.podcast.genres],
            feedUrl: this.podcast.feedUrl,
            imageUrl: this.podcast.imageUrl,
            itunesPageUrl: this.podcast.itunesPageUrl,
            itunesId: this.podcast.itunesId,
            itunesArtistId: this.podcast.itunesArtistId,
            language: this.podcast.language
          },
          autoDownloadEpisodes: false
        }
      }
      console.log('Podcast payload', podcastPayload)

      this._processing = true
      const userId = this.$store.state.user.user?.id
      const serverAddress = this.$store.getters['user/getServerAddress']

      // 1. Pre-check: if podcast already exists in library, subscribe without failing
      try {
        const existingItems = await this.$nativeHttp.get(`/api/libraries/${this.currentLibrary.id}/items?limit=1000`).catch(() => null)
        const matched = existingItems?.results?.find((it) => {
          const feed = it.media?.metadata?.feedUrl
          const title = it.media?.metadata?.title
          if (feed && this.podcast.feedUrl && feed.trim().toLowerCase() === this.podcast.feedUrl.trim().toLowerCase()) return true
          if (title && this.podcast.title && title.trim().toLowerCase() === this.podcast.title.trim().toLowerCase()) return true
          return false
        })

        if (matched) {
          console.log('[NewPodcastForm] Podcast already exists on server, subscribing user to existing item:', matched.id)
          if (userId && serverAddress) {
            await this.$localStore.addUserPodcastSubscription(userId, serverAddress, matched.id)
            this.$eventBus.$emit('podcast-subscription-changed')
          }
          this._processing = false
          this.$toast.success(this.$strings.ToastPodcastCreateSuccess || `Subscribed to "${matched.media?.metadata?.title || this.podcast.title}"`)
          this.$router.push(`/item/${matched.id}`)
          return
        }
      } catch (err) {
        console.warn('[NewPodcastForm] Pre-check library items error, continuing to POST', err)
      }

      // 2. Not in library: create on server
      this.$nativeHttp
        .post('/api/podcasts', podcastPayload)
        .then(async (libraryItem) => {
          this._processing = false
          if (userId && serverAddress && libraryItem?.id) {
            await this.$localStore.addUserPodcastSubscription(userId, serverAddress, libraryItem.id)
            this.$eventBus.$emit('podcast-subscription-changed')
          }
          this.$toast.success(this.$strings.ToastPodcastCreateSuccess)
          this.$router.push(`/item/${libraryItem.id}`)
        })
        .catch(async (error) => {
          console.warn('[NewPodcastForm] POST /api/podcasts failed, checking if already created:', error)
          // 3. Fallback: if server reported error (e.g. 400 Podcast already exists), find existing item and subscribe
          try {
            const existingItems = await this.$nativeHttp.get(`/api/libraries/${this.currentLibrary.id}/items?limit=1000`).catch(() => null)
            const matched = existingItems?.results?.find((it) => {
              const feed = it.media?.metadata?.feedUrl
              const title = it.media?.metadata?.title
              if (feed && this.podcast.feedUrl && feed.trim().toLowerCase() === this.podcast.feedUrl.trim().toLowerCase()) return true
              if (title && this.podcast.title && title.trim().toLowerCase() === this.podcast.title.trim().toLowerCase()) return true
              return false
            })
            if (matched) {
              if (userId && serverAddress) {
                await this.$localStore.addUserPodcastSubscription(userId, serverAddress, matched.id)
                this.$eventBus.$emit('podcast-subscription-changed')
              }
              this._processing = false
              this.$toast.success(`Subscribed to "${matched.media?.metadata?.title || this.podcast.title}"`)
              this.$router.push(`/item/${matched.id}`)
              return
            }
          } catch (e) {
            console.error('Fallback find failed', e)
          }

          var errorMsg = error.response && error.response.data ? error.response.data : this.$strings.ToastPodcastCreateFailed
          console.error('Failed to create podcast', error)
          this._processing = false
          this.$toast.error(errorMsg)
        })
    },
    init() {
      // Prefer using itunes podcast data but not always passed in if manually entering rss feed
      this.podcast.title = this._podcastData.title || this.feedMetadata.title || ''
      this.podcast.author = this._podcastData.artistName || this.feedMetadata.author || ''
      this.podcast.description = this._podcastData.description || this.feedMetadata.descriptionPlain || ''
      this.podcast.releaseDate = this._podcastData.releaseDate || ''
      this.podcast.genres = this._podcastData.genres || this.feedMetadata.categories || []
      this.podcast.feedUrl = this._podcastData.feedUrl || this.feedMetadata.feedUrl || ''
      this.podcast.imageUrl = this._podcastData.cover || this.feedMetadata.image || ''
      this.podcast.itunesPageUrl = this._podcastData.pageUrl || ''
      this.podcast.itunesId = this._podcastData.id || ''
      this.podcast.itunesArtistId = this._podcastData.artistId || ''
      this.podcast.language = this._podcastData.language || ''
      this.podcast.autoDownloadEpisodes = false

      if (this.folderItems[0]) {
        this.selectedFolderId = this.folderItems[0].value
        this.folderUpdated()
      }
    }
  },
  mounted() {
    this.init()
  }
}
</script>