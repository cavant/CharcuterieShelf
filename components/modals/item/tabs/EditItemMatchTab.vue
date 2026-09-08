<template>
  <div class="w-full h-full flex flex-col justify-between overflow-hidden">
    <div class="overflow-y-auto px-4 py-4 space-y-4 flex-1">
      <!-- Search Form -->
      <div class="p-3 bg-primary/40 rounded-lg border border-white/10 space-y-3">
        <div class="grid grid-cols-3 gap-2">
          <div class="col-span-1">
            <ui-dropdown v-model="provider" :items="providerOptions" :label="$strings.LabelProvider" small />
          </div>
          <div class="col-span-2">
            <ui-text-input-with-label v-model="searchTitle" :label="$strings.LabelTitle" :autofocus="false" />
          </div>
        </div>
        <ui-text-input-with-label v-model="searchAuthor" :label="$strings.LabelAuthor" :autofocus="false" />
        <div class="flex justify-end">
          <ui-btn small color="bg-primary" :loading="searching" @click="runSearch">
            <span class="material-symbols text-sm mr-1">search</span>
            {{ $strings.ButtonSearch }}
          </ui-btn>
        </div>
      </div>

      <!-- Match Preview / Selected Result -->
      <div v-if="selectedMatch" class="p-4 bg-secondary rounded-lg border border-yellow-400/40 space-y-3">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-yellow-400 uppercase tracking-wide">Selected Match</span>
          <button class="text-xs text-gray-400 hover:text-white" @click="selectedMatch = null">Change</button>
        </div>

        <div class="flex space-x-3 items-start">
          <img v-if="selectedMatch.cover" :src="selectedMatch.cover" class="w-16 h-auto rounded border border-white/10 flex-shrink-0" alt="Cover" />
          <div class="flex-1 min-w-0 text-xs">
            <p class="font-semibold text-white truncate">{{ selectedMatch.title }}</p>
            <p v-if="selectedMatch.author" class="text-gray-300 truncate">by {{ selectedMatch.author }}</p>
            <p v-if="selectedMatch.publishedYear" class="text-gray-400">{{ selectedMatch.publishedYear }}</p>
          </div>
        </div>

        <div class="pt-2 border-t border-white/10">
          <p class="text-xs text-gray-300 mb-2 font-medium">Select fields to apply:</p>
          <div class="grid grid-cols-2 gap-2 text-xs">
            <label class="flex items-center space-x-2 cursor-pointer">
              <input v-model="applyFields.title" type="checkbox" class="form-checkbox text-yellow-400 rounded" />
              <span>Title</span>
            </label>
            <label class="flex items-center space-x-2 cursor-pointer">
              <input v-model="applyFields.subtitle" type="checkbox" class="form-checkbox text-yellow-400 rounded" />
              <span>Subtitle</span>
            </label>
            <label class="flex items-center space-x-2 cursor-pointer">
              <input v-model="applyFields.author" type="checkbox" class="form-checkbox text-yellow-400 rounded" />
              <span>Author</span>
            </label>
            <label class="flex items-center space-x-2 cursor-pointer">
              <input v-model="applyFields.narrator" type="checkbox" class="form-checkbox text-yellow-400 rounded" />
              <span>Narrator</span>
            </label>
            <label class="flex items-center space-x-2 cursor-pointer">
              <input v-model="applyFields.series" type="checkbox" class="form-checkbox text-yellow-400 rounded" />
              <span>Series</span>
            </label>
            <label class="flex items-center space-x-2 cursor-pointer">
              <input v-model="applyFields.description" type="checkbox" class="form-checkbox text-yellow-400 rounded" />
              <span>Description</span>
            </label>
            <label class="flex items-center space-x-2 cursor-pointer">
              <input v-model="applyFields.publisher" type="checkbox" class="form-checkbox text-yellow-400 rounded" />
              <span>Publisher / Year</span>
            </label>
            <label class="flex items-center space-x-2 cursor-pointer">
              <input v-model="applyFields.genres" type="checkbox" class="form-checkbox text-yellow-400 rounded" />
              <span>Genres</span>
            </label>
            <label class="flex items-center space-x-2 cursor-pointer">
              <input v-model="applyFields.cover" type="checkbox" class="form-checkbox text-yellow-400 rounded" />
              <span>Cover Art</span>
            </label>
          </div>
        </div>

        <div class="pt-2 flex justify-end">
          <ui-btn small color="bg-success" :loading="applying" @click="applySelectedMatch">
            Apply Match
          </ui-btn>
        </div>
      </div>

      <!-- Search Results List -->
      <div v-else-if="searchResults.length" class="space-y-2">
        <span class="text-xs text-gray-400 font-medium">Select a match below:</span>
        <div
          v-for="(result, idx) in searchResults"
          :key="idx"
          class="flex items-center space-x-3 p-2.5 rounded-lg bg-primary/30 border border-white/5 hover:border-yellow-400/50 cursor-pointer transition-colors"
          @click="selectResult(result)"
        >
          <img v-if="result.cover" :src="result.cover" class="w-12 h-16 object-cover rounded flex-shrink-0 bg-primary" alt="Thumbnail" />
          <div v-else class="w-12 h-16 bg-primary rounded flex-shrink-0 flex items-center justify-center text-gray-500">
            <span class="material-symbols text-xl">book</span>
          </div>

          <div class="flex-1 min-w-0 text-xs">
            <p class="font-semibold text-white truncate">{{ result.title }}</p>
            <p v-if="result.author" class="text-gray-300 truncate">by {{ result.author }}</p>
            <p v-if="result.series" class="text-gray-400 truncate">{{ result.series }}</p>
            <p v-if="result.publishedYear" class="text-gray-500">{{ result.publishedYear }}</p>
          </div>

          <span class="material-symbols text-gray-400 text-sm">chevron_right</span>
        </div>
      </div>
      <p v-else-if="hasSearched && !searching" class="text-xs text-gray-500 text-center py-6">
        No matches found. Try adjusting the title or provider.
      </p>
    </div>

    <!-- Footer button -->
    <div class="p-4 bg-primary border-t border-white/10 flex items-center justify-end">
      <ui-btn color="bg-secondary" @click="$emit('close')">{{ $strings.ButtonCancel }}</ui-btn>
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
      provider: 'audible',
      searchTitle: '',
      searchAuthor: '',
      searching: false,
      hasSearched: false,
      applying: false,
      searchResults: [],
      selectedMatch: null,
      providerOptions: [
        { text: 'Audible', value: 'audible' },
        { text: 'Google Books', value: 'google' },
        { text: 'Open Library', value: 'openlibrary' }
      ],
      applyFields: {
        title: true,
        subtitle: true,
        author: true,
        narrator: true,
        series: true,
        description: true,
        publisher: true,
        genres: true,
        cover: true
      }
    }
  },
  computed: {
    libraryItemId() {
      return this.libraryItem?.id
    },
    media() {
      return this.libraryItem?.media || {}
    },
    metadata() {
      return this.media.metadata || {}
    }
  },
  watch: {
    libraryItem: {
      immediate: true,
      handler() {
        this.init()
      }
    }
  },
  methods: {
    init() {
      this.searchTitle = this.metadata.title || ''
      this.searchAuthor = this.metadata.authorName || ''
      this.searchResults = []
      this.selectedMatch = null
      this.hasSearched = false
    },
    async runSearch() {
      if (!this.searchTitle) {
        this.$toast.warning('Title is required')
        return
      }

      this.searching = true
      this.hasSearched = true
      this.selectedMatch = null
      this.searchResults = []

      try {
        const q = `provider=${this.provider}&fallbackTitleOnly=1&title=${encodeURIComponent(this.searchTitle)}&author=${encodeURIComponent(this.searchAuthor || '')}`
        const results = await this.$nativeHttp.get(`/api/search/books?${q}`)
        if (Array.isArray(results)) {
          this.searchResults = results.filter((r) => !!r.title)
        }
      } catch (err) {
        console.error('Match search failed', err)
        this.$toast.error('Search failed')
      } finally {
        this.searching = false
      }
    },
    selectResult(result) {
      this.selectedMatch = { ...result }
    },
    async applySelectedMatch() {
      if (!this.selectedMatch) return

      this.applying = true
      try {
        const metaUpdate = {}
        const m = this.selectedMatch

        if (this.applyFields.title && m.title) metaUpdate.title = m.title
        if (this.applyFields.subtitle && m.subtitle) metaUpdate.subtitle = m.subtitle
        if (this.applyFields.description && m.description) metaUpdate.description = m.description
        if (this.applyFields.publisher && m.publisher) metaUpdate.publisher = m.publisher
        if (this.applyFields.publisher && m.publishedYear) metaUpdate.publishedYear = m.publishedYear
        if (this.applyFields.genres && Array.isArray(m.genres)) metaUpdate.genres = m.genres
        if (m.isbn) metaUpdate.isbn = m.isbn
        if (m.asin) metaUpdate.asin = m.asin
        if (m.language) metaUpdate.language = m.language

        if (this.applyFields.author && m.author) {
          const authors = (Array.isArray(m.author) ? m.author : m.author.split(','))
            .map((a) => a.trim())
            .filter(Boolean)
            .map((name) => ({ name }))
          metaUpdate.authors = authors
        }

        if (this.applyFields.narrator && m.narrator) {
          metaUpdate.narrators = (Array.isArray(m.narrator) ? m.narrator : m.narrator.split(','))
            .map((n) => n.trim())
            .filter(Boolean)
        }

        if (this.applyFields.series && m.series) {
          metaUpdate.series = [
            {
              name: m.series,
              sequence: m.sequence || null
            }
          ]
        }

        const updatePayload = {
          metadata: metaUpdate
        }

        const res = await this.$nativeHttp.patch(`/api/items/${this.libraryItemId}/media`, updatePayload)

        if (this.applyFields.cover && m.cover) {
          await this.$nativeHttp.post(`/api/items/${this.libraryItemId}/cover`, { url: m.cover }).catch((err) => {
            console.warn('Cover update failed during match', err)
          })
        }

        if (res) {
          this.$toast.success(this.$strings.ToastMatchSuccess || 'Book matched successfully')
          this.$emit('updated')
          this.$emit('close')
        }
      } catch (err) {
        console.error('Failed to apply match', err)
        this.$toast.error('Failed to apply match')
      } finally {
        this.applying = false
      }
    }
  }
}
</script>
