<template>
  <div class="w-full h-full flex flex-col justify-between overflow-hidden">
    <div class="overflow-y-auto px-4 py-4 space-y-6 flex-1">
      <!-- Current Cover Preview & Actions -->
      <div class="flex items-start space-x-4">
        <div class="w-28 flex-shrink-0 bg-primary/40 rounded-lg overflow-hidden border border-white/10 shadow-md">
          <img
            :src="coverUrl"
            class="w-full h-auto object-cover"
            alt="Book Cover"
          />
        </div>

        <div class="flex-1 space-y-2">
          <p class="text-xs text-gray-400">Manage cover art for this book. You can upload a photo from your device, enter a web image link, or search online providers.</p>
          
          <div class="flex items-center space-x-2 pt-2">
            <!-- Native file upload button -->
            <label class="cursor-pointer">
              <input
                ref="fileInput"
                type="file"
                accept="image/*"
                class="hidden"
                @change="handleFileUpload"
              />
              <span class="inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded bg-secondary hover:bg-white/20 text-white border border-white/10 transition-colors">
                <span class="material-symbols text-sm mr-1">upload_file</span>
                {{ $strings.ButtonUploadCover }}
              </span>
            </label>

            <!-- Remove cover button -->
            <ui-btn
              v-if="hasCover && userCanDelete"
              small
              color="bg-error/30 text-error border border-error/40"
              :loading="removing"
              @click="removeCover"
            >
              <span class="material-symbols text-sm mr-1">delete</span>
              {{ $strings.ButtonRemoveCover }}
            </ui-btn>
          </div>
        </div>
      </div>

      <!-- Image URL input form -->
      <div class="p-3 bg-primary/30 rounded-lg border border-white/10 space-y-2">
        <span class="text-xs text-gray-300 font-medium">Set Cover from Web URL</span>
        <div class="flex items-center space-x-2">
          <ui-text-input
            v-model="imageUrl"
            placeholder="https://example.com/cover.jpg"
            class="flex-1 text-xs"
          />
          <ui-btn
            small
            color="bg-success"
            :disabled="!imageUrl"
            :loading="uploadingUrl"
            @click="submitImageUrl"
          >
            Submit
          </ui-btn>
        </div>
      </div>

      <!-- Search Online Providers -->
      <div class="space-y-3">
        <span class="text-xs text-gray-300 font-semibold uppercase tracking-wider">Search Online Covers</span>
        <div class="flex items-center space-x-2">
          <ui-dropdown
            v-model="provider"
            :items="providerOptions"
            small
            class="w-32"
          />
          <ui-btn
            small
            color="bg-primary"
            :loading="searching"
            @click="searchCovers"
          >
            <span class="material-symbols text-sm mr-1">search</span>
            Search Covers
          </ui-btn>
        </div>

        <!-- Cover Search Results Grid -->
        <div v-if="coversFound.length" class="grid grid-cols-3 sm:grid-cols-4 gap-3 pt-2">
          <div
            v-for="(cover, idx) in coversFound"
            :key="idx"
            class="relative rounded-md overflow-hidden border-2 border-transparent hover:border-yellow-400 cursor-pointer shadow-sm group"
            @click="selectFoundCover(cover)"
          >
            <img :src="cover" class="w-full h-auto object-cover" alt="Cover option" />
            <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              <span class="material-symbols text-white text-2xl">check_circle</span>
            </div>
          </div>
        </div>
        <p v-else-if="hasSearched && !searching" class="text-xs text-gray-500 py-2">No online covers found.</p>
      </div>
    </div>

    <!-- Footer button -->
    <div class="p-4 bg-primary border-t border-white/10 flex items-center justify-end">
      <ui-btn color="bg-secondary" @click="$emit('close')">{{ $strings.ButtonBack }}</ui-btn>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    libraryItem: {
      type: Object,
      required: true
    }
  },
  data() {
    return {
      imageUrl: '',
      coverTimestamp: Date.now(),
      uploadingUrl: false,
      removing: false,
      searching: false,
      hasSearched: false,
      provider: 'audible',
      coversFound: [],
      providerOptions: [
        { text: 'Audible', value: 'audible' },
        { text: 'Google Books', value: 'google' },
        { text: 'Open Library', value: 'openlibrary' }
      ]
    }
  },
  watch: {
    libraryItem() {
      this.coverTimestamp = Date.now()
    }
  },
  computed: {
    libraryItemId() {
      return this.libraryItem?.id
    },
    media() {
      return this.libraryItem?.media || {}
    },
    hasCover() {
      return !!this.media.coverPath
    },
    coverUrl() {
      const serverAddress = this.$store.getters['user/getServerAddress'] || ''
      const token = this.$store.getters['user/getToken'] || ''
      if (this.libraryItemId) {
        return `${serverAddress}/api/items/${this.libraryItemId}/cover?token=${token}&ts=${this.coverTimestamp}`
      }
      return ''
    },
    userCanDelete() {
      return this.$store.getters['user/getUserCanDelete']
    }
  },
  methods: {
    async handleFileUpload(event) {
      const file = event.target?.files?.[0]
      if (!file) return

      const formData = new FormData()
      formData.append('cover', file)

      try {
        this.$toast.info('Uploading cover...')
        const serverAddress = this.$store.getters['user/getServerAddress'] || ''
        const token = this.$store.getters['user/getToken'] || ''

        const response = await fetch(`${serverAddress}/api/items/${this.libraryItemId}/cover`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: formData
        })

        if (response.ok) {
          this.coverTimestamp = Date.now()
          this.$toast.success(this.$strings.ToastCoverUpdated || 'Cover updated successfully')
          this.$emit('updated')
        } else {
          this.$toast.error('Failed to upload cover')
        }
      } catch (err) {
        console.error('Failed to upload cover', err)
        this.$toast.error('Failed to upload cover')
      } finally {
        if (this.$refs.fileInput) this.$refs.fileInput.value = ''
      }
    },
    async submitImageUrl() {
      if (!this.imageUrl) return
      this.uploadingUrl = true
      try {
        const res = await this.$nativeHttp.post(`/api/items/${this.libraryItemId}/cover`, {
          url: this.imageUrl
        })
        if (res) {
          this.coverTimestamp = Date.now()
          this.$toast.success(this.$strings.ToastCoverUpdated || 'Cover updated successfully')
          this.imageUrl = ''
          this.$emit('updated')
        }
      } catch (err) {
        console.error('Failed to set cover URL', err)
        this.$toast.error('Failed to set cover from URL')
      } finally {
        this.uploadingUrl = false
      }
    },
    async removeCover() {
      this.removing = true
      try {
        await this.$nativeHttp.delete(`/api/items/${this.libraryItemId}/cover`)
        this.coverTimestamp = Date.now()
        this.$toast.success('Cover removed')
        this.$emit('updated')
      } catch (err) {
        console.error('Failed to remove cover', err)
        this.$toast.error('Failed to remove cover')
      } finally {
        this.removing = false
      }
    },
    async searchCovers() {
      this.searching = true
      this.hasSearched = true
      this.coversFound = []

      const title = this.media.metadata?.title || ''
      const author = this.media.metadata?.authorName || ''

      try {
        // Query server provider cover search or search book provider
        const query = `provider=${this.provider}&title=${encodeURIComponent(title)}&author=${encodeURIComponent(author)}`
        const results = await this.$nativeHttp.get(`/api/search/books?${query}`)
        if (Array.isArray(results)) {
          const covers = results.map((r) => r.cover).filter(Boolean)
          this.coversFound = [...new Set(covers)]
        }
        if (!this.coversFound.length) {
          this.$toast.info('No covers found from ' + this.provider)
        }
      } catch (err) {
        console.error('Cover search failed', err)
        this.$toast.error('Search failed')
      } finally {
        this.searching = false
      }
    },
    async selectFoundCover(coverUrl) {
      try {
        this.$toast.info('Applying cover...')
        const res = await this.$nativeHttp.post(`/api/items/${this.libraryItemId}/cover`, {
          url: coverUrl
        })
        if (res) {
          this.coverTimestamp = Date.now()
          this.$toast.success(this.$strings.ToastCoverUpdated || 'Cover updated successfully')
          this.$emit('updated')
        }
      } catch (err) {
        console.error('Failed to apply selected cover', err)
        this.$toast.error('Failed to apply cover')
      }
    }
  }
}
</script>
