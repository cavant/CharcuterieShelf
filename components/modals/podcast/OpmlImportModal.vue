<template>
  <modals-modal v-model="show" :width="560" max-width="95%" :processing="processing">
    <div class="w-full rounded-2xl bg-bg border border-border p-5 shadow-2xl text-fg">
      <!-- Modal Header -->
      <div class="flex items-center justify-between pb-3 border-b border-border">
        <div class="flex items-center space-x-2.5 truncate">
          <span class="material-symbols text-accent text-2xl">podcasts</span>
          <div class="truncate">
            <h3 class="text-base font-bold text-fg truncate">Pocket Casts OPML Import</h3>
            <p class="text-xs text-fg-muted truncate">Subscribe to podcasts from an OPML or XML feed list</p>
          </div>
        </div>
      </div>

      <!-- Step 1: File / Text Input -->
      <div v-if="step === 1" class="py-4 space-y-4">
        <!-- Input Method Tabs -->
        <div class="flex rounded-xl bg-secondary p-1 border border-border/60">
          <button
            type="button"
            class="flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all"
            :class="inputMethod === 'file' ? 'bg-primary text-fg shadow-sm' : 'text-fg-muted hover:text-fg'"
            @click="inputMethod = 'file'"
          >
            Upload OPML File
          </button>
          <button
            type="button"
            class="flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all"
            :class="inputMethod === 'text' ? 'bg-primary text-fg shadow-sm' : 'text-fg-muted hover:text-fg'"
            @click="inputMethod = 'text'"
          >
            Paste OPML / XML Text
          </button>
        </div>

        <!-- File Upload Area -->
        <div v-if="inputMethod === 'file'" class="space-y-3">
          <div
            class="border-2 border-dashed border-border rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer hover:border-accent hover:bg-secondary/40 transition-colors text-center"
            @click="triggerFileInput"
            @dragover.prevent
            @drop.prevent="handleDrop"
          >
            <input
              ref="fileInput"
              type="file"
              accept=".opml,.xml,.txt,text/xml,application/xml"
              class="hidden"
              @change="handleFileSelect"
            />
            <span class="material-symbols text-4xl text-accent mb-2">upload_file</span>
            <p v-if="!selectedFileName" class="text-sm font-semibold text-fg">
              Tap to choose OPML export file
            </p>
            <p v-else class="text-sm font-semibold text-success flex items-center gap-1">
              <span class="material-symbols text-base">check_circle</span>
              {{ selectedFileName }}
            </p>
            <p class="text-xs text-fg-muted mt-1">
              Supports .opml, .xml, or .txt files exported from Pocket Casts
            </p>
          </div>
        </div>

        <!-- Text Input Area -->
        <div v-else class="space-y-2">
          <label class="block text-xs font-semibold text-fg-muted">Paste Pocket Casts OPML XML</label>
          <textarea
            v-model="opmlRawText"
            rows="7"
            class="w-full bg-secondary border border-border rounded-xl p-3 text-xs font-mono text-fg focus:outline-none focus:border-accent"
            placeholder="&lt;?xml version=&quot;1.0&quot; encoding=&quot;UTF-8&quot;?&gt;&#10;&lt;opml version=&quot;1.0&quot;&gt;&#10;  &lt;body&gt;&#10;    &lt;outline text=&quot;Podcast Name&quot; xmlUrl=&quot;https://...&quot; /&gt;&#10;  &lt;/body&gt;&#10;&lt;/opml&gt;"
          ></textarea>
        </div>

        <!-- Parse Button -->
        <div class="flex items-center justify-end space-x-2 pt-2 border-t border-border">
          <button
            type="button"
            class="px-4 py-2 rounded-lg bg-secondary text-fg-muted hover:text-fg text-xs font-medium"
            @click="show = false"
          >
            Cancel
          </button>
          <button
            type="button"
            class="px-5 py-2 rounded-lg bg-accent text-white text-xs font-semibold hover:opacity-90 flex items-center gap-1.5"
            :disabled="parsing || (!selectedFileName && !opmlRawText.trim())"
            @click="parseFeeds"
          >
            <span v-if="parsing" class="material-symbols animate-spin text-sm">progress_activity</span>
            <span>{{ parsing ? 'Parsing Feeds...' : 'Preview Feeds' }}</span>
            <span v-if="!parsing" class="material-symbols text-sm">arrow_forward</span>
          </button>
        </div>
      </div>

      <!-- Step 2: Feed Selection & Target Options -->
      <div v-else-if="step === 2" class="py-4 space-y-4">
        <!-- Feeds Header & Controls -->
        <div class="flex items-center justify-between">
          <div>
            <span class="text-xs font-bold text-fg">
              {{ selectedFeeds.length }} of {{ parsedFeeds.length }} Feeds Selected
            </span>
          </div>
          <div class="flex items-center space-x-2">
            <button
              type="button"
              class="text-xxs px-2.5 py-1 rounded bg-secondary hover:bg-primary text-fg font-medium"
              @click="selectAll"
            >
              Select All
            </button>
            <button
              type="button"
              class="text-xxs px-2.5 py-1 rounded bg-secondary hover:bg-primary text-fg-muted hover:text-fg font-medium"
              @click="deselectAll"
            >
              Deselect All
            </button>
          </div>
        </div>

        <!-- Filter Search Bar -->
        <div class="relative">
          <input
            v-model="filterTerm"
            type="text"
            placeholder="Filter parsed feeds..."
            class="w-full bg-secondary border border-border rounded-lg pl-8 pr-3 py-1.5 text-xs text-fg focus:outline-none focus:border-accent"
          />
          <span class="material-symbols absolute left-2 top-2 text-base text-fg-muted pointer-events-none">search</span>
        </div>

        <!-- Scrollable Feed List -->
        <div class="max-h-56 overflow-y-auto rounded-xl border border-border bg-secondary/50 p-2 space-y-1 divide-y divide-border/30">
          <div
            v-for="(feed, idx) in filteredFeeds"
            :key="feed.feedUrl + idx"
            class="pt-1.5 first:pt-0 flex items-start space-x-2.5 cursor-pointer py-1 px-1 rounded hover:bg-primary/40"
            @click="toggleFeed(feed)"
          >
            <input
              type="checkbox"
              :checked="isFeedSelected(feed)"
              class="mt-0.5 rounded text-accent focus:ring-0 cursor-pointer"
              @click.stop="toggleFeed(feed)"
            />
            <div class="flex-1 min-w-0">
              <p class="text-xs font-semibold text-fg truncate">{{ feed.title || 'Untitled Podcast' }}</p>
              <p class="text-xxs font-mono text-fg-muted truncate">{{ feed.feedUrl }}</p>
            </div>
          </div>
          <p v-if="!filteredFeeds.length" class="text-center text-xs text-fg-muted py-4">
            No feeds match filter
          </p>
        </div>

        <!-- Target Library & Folder Settings -->
        <div class="bg-secondary/60 rounded-xl p-3 border border-border/70 space-y-3 text-xs">
          <!-- Library Selection -->
          <div v-if="podcastLibraries.length > 1">
            <label class="block font-semibold text-fg mb-1">Target Podcast Library</label>
            <select
              v-model="selectedLibraryId"
              class="w-full bg-primary border border-border rounded-lg px-2.5 py-1.5 text-fg text-xs focus:outline-none focus:border-accent"
            >
              <option v-for="lib in podcastLibraries" :key="lib.id" :value="lib.id">
                {{ lib.name }}
              </option>
            </select>
          </div>
          <div v-else-if="targetLibrary" class="flex items-center justify-between">
            <span class="text-fg-muted font-medium">Target Library:</span>
            <span class="text-fg font-semibold">{{ targetLibrary.name }}</span>
          </div>

          <!-- Folder Selection -->
          <div v-if="folderOptions.length > 1">
            <label class="block font-semibold text-fg mb-1">Server Destination Folder</label>
            <select
              v-model="selectedFolderId"
              class="w-full bg-primary border border-border rounded-lg px-2.5 py-1.5 text-fg text-xs font-mono focus:outline-none focus:border-accent"
            >
              <option v-for="folder in folderOptions" :key="folder.id" :value="folder.id">
                {{ folder.fullPath }}
              </option>
            </select>
          </div>
          <div v-else-if="folderOptions.length === 1" class="flex items-center justify-between">
            <span class="text-fg-muted font-medium">Destination Folder:</span>
            <span class="text-fg font-mono truncate max-w-[240px]">{{ folderOptions[0].fullPath }}</span>
          </div>

          <div class="flex items-center justify-between pt-1">
            <div>
              <p class="font-semibold text-fg">Device-Only Storage</p>
              <p class="text-xxs text-fg-muted">Episodes stream or download to device storage only; server disk is untouched</p>
            </div>
            <span class="material-symbols text-success text-lg">smartphone</span>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex items-center justify-between pt-2 border-t border-border">
          <button
            type="button"
            class="px-3 py-2 rounded-lg bg-secondary text-fg-muted hover:text-fg text-xs font-medium flex items-center gap-1"
            :disabled="processing"
            @click="step = 1"
          >
            <span class="material-symbols text-sm">arrow_back</span>
            <span>Back</span>
          </button>
          <button
            type="button"
            class="px-5 py-2 rounded-lg bg-accent text-white text-xs font-semibold hover:opacity-90 flex items-center gap-1.5 shadow-md"
            :disabled="processing || !selectedFeeds.length || !selectedFolderId"
            @click="submitImport"
          >
            <span v-if="processing" class="material-symbols animate-spin text-sm">progress_activity</span>
            <span>{{ processing ? 'Importing Feeds...' : `Import ${selectedFeeds.length} Podcasts` }}</span>
          </button>
        </div>
      </div>
    </div>
  </modals-modal>
</template>

<script>
export default {
  name: 'OpmlImportModal',
  props: {
    value: Boolean
  },
  data() {
    return {
      internalShow: false,
      step: 1,
      inputMethod: 'file',
      selectedFileName: '',
      opmlRawText: '',
      parsing: false,
      processing: false,
      parsedFeeds: [],
      selectedFeeds: [],
      filterTerm: '',
      selectedLibraryId: '',
      selectedFolderId: '',
      autoDownloadEpisodes: false
    }
  },
  computed: {
    show: {
      get() {
        return this.value !== undefined ? this.value : this.internalShow
      },
      set(val) {
        this.internalShow = val
        this.$emit('input', val)
      }
    },
    libraries() {
      return this.$store.state.libraries.libraries || []
    },
    podcastLibraries() {
      return this.libraries.filter(l => l.mediaType === 'podcast')
    },
    currentLibrary() {
      return this.$store.getters['libraries/getCurrentLibrary']
    },
    targetLibrary() {
      if (this.selectedLibraryId) {
        return this.libraries.find(l => l.id === this.selectedLibraryId) || null
      }
      if (this.currentLibrary && this.currentLibrary.mediaType === 'podcast') {
        return this.currentLibrary
      }
      return this.podcastLibraries[0] || null
    },
    folderOptions() {
      return (this.targetLibrary && this.targetLibrary.folders) || []
    },
    filteredFeeds() {
      if (!this.filterTerm.trim()) return this.parsedFeeds
      const term = this.filterTerm.toLowerCase()
      return this.parsedFeeds.filter(
        f => (f.title && f.title.toLowerCase().includes(term)) || (f.feedUrl && f.feedUrl.toLowerCase().includes(term))
      )
    }
  },
  watch: {
    targetLibrary: {
      immediate: true,
      handler(lib) {
        if (lib && lib.folders && lib.folders.length) {
          if (!this.selectedFolderId || !lib.folders.some(f => f.id === this.selectedFolderId)) {
            this.selectedFolderId = lib.folders[0].id
          }
        }
      }
    },
    show(val) {
      if (val) {
        this.initModal()
      }
    }
  },
  methods: {
    initModal() {
      this.step = 1
      this.selectedFileName = ''
      this.opmlRawText = ''
      this.parsedFeeds = []
      this.selectedFeeds = []
      this.filterTerm = ''
      this.parsing = false
      this.processing = false

      if (this.targetLibrary) {
        this.selectedLibraryId = this.targetLibrary.id
        if (this.targetLibrary.folders && this.targetLibrary.folders.length) {
          this.selectedFolderId = this.targetLibrary.folders[0].id
        }
      }
    },
    triggerFileInput() {
      if (this.$refs.fileInput) {
        this.$refs.fileInput.click()
      }
    },
    handleFileSelect(ev) {
      const file = ev.target.files && ev.target.files[0]
      if (file) {
        this.readFile(file)
      }
    },
    handleDrop(ev) {
      const file = ev.dataTransfer.files && ev.dataTransfer.files[0]
      if (file) {
        this.readFile(file)
      }
    },
    readFile(file) {
      this.selectedFileName = file.name
      const reader = new FileReader()
      reader.onload = (e) => {
        this.opmlRawText = e.target.result || ''
      }
      reader.readAsText(file)
    },
    clientParseOpml(text) {
      const feeds = []
      try {
        const parser = new DOMParser()
        const doc = parser.parseFromString(text, 'text/xml')
        const outlines = doc.querySelectorAll('outline')

        outlines.forEach((el) => {
          const xmlUrl = el.getAttribute('xmlUrl') || el.getAttribute('xmlurl') || el.getAttribute('url')
          if (xmlUrl) {
            const title = el.getAttribute('title') || el.getAttribute('text') || xmlUrl
            feeds.push({
              title: title.trim(),
              feedUrl: xmlUrl.trim(),
              htmlUrl: el.getAttribute('htmlUrl') || el.getAttribute('htmlurl') || ''
            })
          }
        })
      } catch (err) {
        console.error('Client OPML DOMParser error:', err)
      }
      return feeds
    },
    async parseFeeds() {
      const text = this.opmlRawText.trim()
      if (!text) {
        this.$toast.error('Please upload an OPML file or paste OPML XML')
        return
      }

      this.parsing = true
      let parsed = []

      // Try server parse first
      try {
        const serverResult = await this.$nativeHttp.post('/api/podcasts/opml/parse', { opmlText: text }).catch(() => null)
        if (serverResult && Array.isArray(serverResult.feeds) && serverResult.feeds.length) {
          parsed = serverResult.feeds
        }
      } catch (e) {
        console.warn('Server OPML parse failed, using client fallback', e)
      }

      // Fallback to client-side DOMParser if server returned empty or failed
      if (!parsed.length) {
        parsed = this.clientParseOpml(text)
      }

      this.parsing = false

      if (!parsed.length) {
        this.$toast.error('No podcast feeds found in the provided OPML file')
        return
      }

      // Deduplicate by feedUrl
      const seen = new Set()
      const deduped = []
      for (const feed of parsed) {
        if (feed.feedUrl && !seen.has(feed.feedUrl)) {
          seen.add(feed.feedUrl)
          deduped.push(feed)
        }
      }

      this.parsedFeeds = deduped
      this.selectedFeeds = [...deduped]
      this.step = 2

      // Check destination library
      if (!this.targetLibrary) {
        this.$toast.warning('No podcast library found. Please create or select a podcast library.')
      }
    },
    isFeedSelected(feed) {
      return this.selectedFeeds.some(f => f.feedUrl === feed.feedUrl)
    },
    toggleFeed(feed) {
      const idx = this.selectedFeeds.findIndex(f => f.feedUrl === feed.feedUrl)
      if (idx >= 0) {
        this.selectedFeeds.splice(idx, 1)
      } else {
        this.selectedFeeds.push(feed)
      }
    },
    selectAll() {
      this.selectedFeeds = [...this.parsedFeeds]
    },
    deselectAll() {
      this.selectedFeeds = []
    },
    async submitImport() {
      if (!this.targetLibrary) {
        this.$toast.error('No target podcast library selected')
        return
      }
      if (!this.selectedFolderId) {
        this.$toast.error('Please select a destination folder on your server')
        return
      }
      if (!this.selectedFeeds.length) {
        this.$toast.error('Please select at least one podcast feed to import')
        return
      }

      this.processing = true
      try {
        const payload = {
          feeds: this.selectedFeeds.map(f => f.feedUrl),
          folderId: this.selectedFolderId,
          libraryId: this.targetLibrary.id,
          autoDownloadEpisodes: false
        }

        await this.$nativeHttp.post('/api/podcasts/opml/create', payload)
        this.$toast.success(`Successfully queued ${this.selectedFeeds.length} podcasts for import!`)
        this.show = false

        // Notify app and refresh library
        this.$eventBus.$emit('podcast-added')
        this.$eventBus.$emit('library-changed', this.targetLibrary.id)

        // Automatically add imported podcasts to user subscriptions
        const userId = this.$store.state.user.user?.id
        const serverAddress = this.$store.getters['user/getServerAddress']
        if (userId && serverAddress) {
          setTimeout(async () => {
            try {
              const res = await this.$nativeHttp.get(`/api/libraries/${this.targetLibrary.id}/items?limit=1000`)
              if (res && res.results) {
                const allIds = res.results.map((r) => r.id)
                const currentSubs = (await this.$localStore.getUserPodcastSubscriptions(userId, serverAddress)) || []
                const mergedSubs = Array.from(new Set([...currentSubs, ...allIds]))
                await this.$localStore.setUserPodcastSubscriptions(userId, serverAddress, mergedSubs)
                this.$eventBus.$emit('podcast-subscription-changed')
              }
            } catch (e) {
              console.error('Failed to sync subscriptions after OPML import', e)
            }
          }, 3000)
        }
      } catch (err) {
        console.error('Failed to import OPML feeds:', err)
        this.$toast.error(err?.message || 'Failed to create podcasts on server')
      } finally {
        this.processing = false
      }
    }
  },
  mounted() {
    this.$eventBus.$on('open-opml-modal', () => {
      this.show = true
    })
  },
  beforeDestroy() {
    this.$eventBus.$off('open-opml-modal')
  }
}
</script>
