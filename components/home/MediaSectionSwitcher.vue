<template>
  <div class="w-full bg-bg px-3 py-1.5 border-b border-border/40 select-none z-20">
    <div class="w-full max-w-md mx-auto flex items-center bg-secondary/80 rounded-xl p-1 border border-border/60 shadow-inner">
      <!-- Audiobooks Segment Button -->
      <button
        type="button"
        class="flex-1 py-1 px-3 flex items-center justify-center gap-1.5 rounded-lg text-xs font-semibold transition-all duration-200"
        :class="!isPodcast ? 'bg-primary text-fg shadow-sm border border-border/50' : 'text-fg-muted hover:text-fg'"
        @click="selectSection('book')"
      >
        <span class="material-symbols text-base leading-none">auto_stories</span>
        <span>{{ audiobooksLabel }}</span>
        <span v-if="!isPodcast && bookLibrariesCount > 1" class="material-symbols text-xs opacity-70 leading-none">arrow_drop_down</span>
      </button>

      <!-- Podcasts Segment Button -->
      <button
        type="button"
        class="flex-1 py-1 px-3 flex items-center justify-center gap-1.5 rounded-lg text-xs font-semibold transition-all duration-200"
        :class="isPodcast ? 'bg-primary text-fg shadow-sm border border-border/50' : 'text-fg-muted hover:text-fg'"
        @click="selectSection('podcast')"
      >
        <span class="material-symbols text-base leading-none">podcasts</span>
        <span>{{ podcastsLabel }}</span>
        <span v-if="isPodcast && podcastLibrariesCount > 1" class="material-symbols text-xs opacity-70 leading-none">arrow_drop_down</span>
      </button>
    </div>

    <!-- Create Podcast Library Modal if none exists on server -->
    <modals-modal v-model="showCreatePodcastModal" :width="440" max-width="95%">
      <div class="w-full rounded-2xl bg-bg border border-border p-5 shadow-2xl">
        <div class="flex items-center space-x-2.5 pb-3 border-b border-border">
          <span class="material-symbols text-accent text-2xl">podcasts</span>
          <div>
            <h3 class="text-base font-bold text-fg">Create Podcast Library</h3>
            <p class="text-xs text-fg-muted">Enable podcasts on your server</p>
          </div>
        </div>

        <div class="py-4 space-y-4 text-xs">
          <p class="text-fg-muted leading-relaxed">
            No podcast library was found on your server. Enter a name and server folder path to create a dedicated podcast library.
          </p>

          <div>
            <label class="block text-fg font-semibold mb-1">Library Name</label>
            <input
              v-model="newLibraryName"
              type="text"
              class="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-fg focus:outline-none focus:border-accent"
              placeholder="Podcasts"
            />
          </div>

          <div>
            <label class="block text-fg font-semibold mb-1">Server Folder Path</label>
            <input
              v-model="newLibraryPath"
              type="text"
              class="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-fg focus:outline-none focus:border-accent font-mono"
              placeholder="e.g. /podcasts or D:/Podcasts"
            />
            <p class="text-xxs text-fg-muted mt-1">Directory on your server machine where podcast audio files will be stored.</p>
          </div>
        </div>

        <div class="flex items-center justify-end space-x-2 pt-3 border-t border-border">
          <button
            type="button"
            class="px-4 py-2 rounded-lg bg-secondary text-fg-muted hover:text-fg text-xs font-medium transition-colors"
            @click="showCreatePodcastModal = false"
          >
            Cancel
          </button>
          <button
            type="button"
            class="px-4 py-2 rounded-lg bg-accent text-white text-xs font-semibold hover:opacity-90 transition-opacity flex items-center gap-1.5"
            :disabled="creatingLibrary"
            @click="createPodcastLibrary"
          >
            <span v-if="creatingLibrary" class="material-symbols animate-spin text-sm">progress_activity</span>
            <span>{{ creatingLibrary ? 'Creating...' : 'Create Library' }}</span>
          </button>
        </div>
      </div>
    </modals-modal>
  </div>
</template>

<script>
export default {
  name: 'MediaSectionSwitcher',
  data() {
    return {
      showCreatePodcastModal: false,
      newLibraryName: 'Podcasts',
      newLibraryPath: '',
      creatingLibrary: false
    }
  },
  computed: {
    currentLibrary() {
      return this.$store.getters['libraries/getCurrentLibrary']
    },
    currentLibraryMediaType() {
      return this.$store.getters['libraries/getCurrentLibraryMediaType']
    },
    isPodcast() {
      return this.currentLibraryMediaType === 'podcast'
    },
    libraries() {
      return this.$store.state.libraries.libraries || []
    },
    bookLibraries() {
      return this.libraries.filter(l => l.mediaType === 'book')
    },
    podcastLibraries() {
      return this.libraries.filter(l => l.mediaType === 'podcast')
    },
    bookLibrariesCount() {
      return this.bookLibraries.length
    },
    podcastLibrariesCount() {
      return this.podcastLibraries.length
    },
    audiobooksLabel() {
      return this.$strings.HeaderAudiobooks || 'Audiobooks'
    },
    podcastsLabel() {
      return this.$strings.HeaderPodcasts || 'Podcasts'
    }
  },
  methods: {
    async selectSection(type) {
      await this.$hapticsImpact()

      if (type === 'book') {
        if (!this.isPodcast) {
          // Already on audiobooks. If multiple book libraries exist, open library modal
          if (this.bookLibrariesCount > 1) {
            this.$store.commit('libraries/setShowModal', true)
          }
          return
        }

        // Switch to audiobooks
        const targetLib = this.bookLibraries[0]
        if (targetLib) {
          await this.$store.dispatch('libraries/fetch', targetLib.id)
          this.$eventBus.$emit('library-changed', targetLib.id)
          this.$localStore.setLastLibraryId(targetLib.id)
          if (this.$route.name !== 'bookshelf') {
            this.$router.push('/bookshelf')
          }
        }
      } else if (type === 'podcast') {
        if (this.isPodcast) {
          // Already on podcasts. If multiple podcast libraries exist, open library modal
          if (this.podcastLibrariesCount > 1) {
            this.$store.commit('libraries/setShowModal', true)
          }
          return
        }

        // Switch to podcasts
        const targetLib = this.podcastLibraries[0]
        if (targetLib) {
          await this.$store.dispatch('libraries/fetch', targetLib.id)
          this.$eventBus.$emit('library-changed', targetLib.id)
          this.$localStore.setLastLibraryId(targetLib.id)
          if (this.$route.name !== 'bookshelf') {
            this.$router.push('/bookshelf')
          }
        } else {
          // No podcast library found on server: prompt to create one
          this.suggestDefaultPodcastPath()
          this.showCreatePodcastModal = true
        }
      }
    },
    suggestDefaultPodcastPath() {
      if (this.currentLibrary && this.currentLibrary.folders && this.currentLibrary.folders.length) {
        const samplePath = this.currentLibrary.folders[0].fullPath || ''
        if (samplePath.includes('\\')) {
          // Windows backslash path e.g. D:\Audiobooks -> D:\Podcasts
          const parts = samplePath.split('\\')
          parts[parts.length - 1] = 'Podcasts'
          this.newLibraryPath = parts.join('\\')
        } else if (samplePath.includes('/')) {
          // Unix/forward slash path e.g. D:/Audiobooks -> D:/Podcasts or /audiobooks -> /podcasts
          const parts = samplePath.split('/')
          parts[parts.length - 1] = 'Podcasts'
          this.newLibraryPath = parts.join('/')
        } else {
          this.newLibraryPath = 'D:/Podcasts'
        }
      } else {
        this.newLibraryPath = 'D:/Podcasts'
      }
    },
    async createPodcastLibrary() {
      if (!this.newLibraryName || !this.newLibraryPath) {
        this.$toast.error('Please enter a library name and server folder path')
        return
      }

      this.creatingLibrary = true
      try {
        const payload = {
          name: this.newLibraryName.trim(),
          mediaType: 'podcast',
          folders: [{ fullPath: this.newLibraryPath.trim() }]
        }

        const newLib = await this.$nativeHttp.post('/api/libraries', payload)
        if (newLib && newLib.id) {
          this.$toast.success('Podcast library created!')
          this.showCreatePodcastModal = false

          // Force reload of libraries
          this.$store.commit('libraries/setLastLoad', 0)
          await this.$store.dispatch('libraries/load')

          // Switch to new podcast library
          await this.$store.dispatch('libraries/fetch', newLib.id)
          this.$eventBus.$emit('library-changed', newLib.id)
          this.$localStore.setLastLibraryId(newLib.id)
          if (this.$route.name !== 'bookshelf') {
            this.$router.push('/bookshelf')
          }
        } else {
          this.$toast.error('Failed to create podcast library')
        }
      } catch (err) {
        console.error('Failed to create podcast library:', err)
        this.$toast.error(err?.message || 'Failed to create podcast library on server')
      } finally {
        this.creatingLibrary = false
      }
    }
  }
}
</script>
