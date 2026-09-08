<template>
  <div class="w-full h-full flex flex-col justify-between overflow-hidden">
    <div class="overflow-y-auto px-4 py-4 space-y-4 flex-1">
      <!-- Quick Match bar -->
      <div class="flex items-center justify-between p-3 bg-primary/40 rounded-lg border border-white/10">
        <div class="text-xs text-gray-300">
          <p class="font-medium text-white">{{ $strings.ButtonQuickMatch }}</p>
          <p>{{ details.title }} {{ primaryAuthor ? 'by ' + primaryAuthor : '' }}</p>
        </div>
        <ui-btn small color="bg-secondary" :loading="quickMatching" @click="quickMatch">
          <span class="material-symbols text-sm mr-1">auto_fix_high</span>
          {{ $strings.ButtonQuickMatch }}
        </ui-btn>
      </div>

      <!-- Title & Subtitle -->
      <div class="space-y-3">
        <ui-text-input-with-label v-model="details.title" :label="$strings.LabelTitle" :autofocus="false" />
        <ui-text-input-with-label v-model="details.subtitle" :label="$strings.LabelSubtitle" :autofocus="false" />
      </div>

      <!-- Authors & Narrators -->
      <div class="space-y-3">
        <ui-text-input-with-label v-model="authorString" :label="$strings.LabelAuthors" placeholder="Author 1, Author 2" :autofocus="false" />
        <ui-text-input-with-label v-model="narratorString" :label="$strings.LabelNarrators" placeholder="Narrator 1, Narrator 2" :autofocus="false" />
      </div>

      <!-- Series & Sequence -->
      <div class="grid grid-cols-3 gap-2">
        <div class="col-span-2">
          <ui-text-input-with-label v-model="primarySeriesName" :label="$strings.LabelSeries" placeholder="Series name" :autofocus="false" />
        </div>
        <div>
          <ui-text-input-with-label v-model="primarySeriesSequence" label="#" placeholder="1" :autofocus="false" />
        </div>
      </div>

      <!-- Description -->
      <div>
        <ui-textarea-with-label v-model="details.description" :label="$strings.LabelDescription" :rows="4" />
      </div>

      <!-- Publishing Details -->
      <div class="grid grid-cols-2 gap-2">
        <ui-text-input-with-label v-model="details.publishedYear" :label="$strings.LabelPublishYear" placeholder="YYYY" :autofocus="false" />
        <ui-text-input-with-label v-model="details.publisher" :label="$strings.LabelPublisher" :autofocus="false" />
      </div>

      <div class="grid grid-cols-3 gap-2">
        <ui-text-input-with-label v-model="details.language" :label="$strings.LabelLanguage" :autofocus="false" />
        <ui-text-input-with-label v-model="details.isbn" label="ISBN" :autofocus="false" />
        <ui-text-input-with-label v-model="details.asin" label="ASIN" :autofocus="false" />
      </div>

      <!-- Genres & Tags -->
      <div class="space-y-3">
        <ui-text-input-with-label v-model="genreString" :label="$strings.LabelGenres" placeholder="Fantasy, Sci-Fi" :autofocus="false" />
        <ui-text-input-with-label v-model="tagString" :label="$strings.LabelTags" placeholder="Audiobook, Favorite" :autofocus="false" />
      </div>

      <!-- Checkboxes -->
      <div class="flex items-center space-x-6 pt-1">
        <ui-checkbox v-model="details.explicit" :label="$strings.LabelExplicit" />
        <ui-checkbox v-model="details.abridged" :label="$strings.LabelAbridged" />
      </div>
    </div>

    <!-- Footer buttons -->
    <div class="p-4 bg-primary border-t border-white/10 flex items-center justify-end space-x-3">
      <ui-btn color="bg-secondary" @click="$emit('close')">{{ $strings.ButtonCancel }}</ui-btn>
      <ui-btn color="bg-success" :loading="saving" @click="saveDetails">{{ $strings.ButtonSave }}</ui-btn>
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
      saving: false,
      quickMatching: false,
      details: {
        title: '',
        subtitle: '',
        description: '',
        publishedYear: '',
        publisher: '',
        language: '',
        isbn: '',
        asin: '',
        explicit: false,
        abridged: false
      },
      authorString: '',
      narratorString: '',
      genreString: '',
      tagString: '',
      primarySeriesName: '',
      primarySeriesSequence: ''
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
    },
    primaryAuthor() {
      return this.authorString.split(',')[0]?.trim() || ''
    }
  },
  watch: {
    libraryItem: {
      immediate: true,
      handler() {
        this.populateFromItem()
      }
    }
  },
  methods: {
    populateFromItem() {
      const meta = this.metadata
      this.details = {
        title: meta.title || '',
        subtitle: meta.subtitle || '',
        description: meta.description || '',
        publishedYear: meta.publishedYear || '',
        publisher: meta.publisher || '',
        language: meta.language || '',
        isbn: meta.isbn || '',
        asin: meta.asin || '',
        explicit: !!meta.explicit,
        abridged: !!meta.abridged
      }

      // Authors
      if (Array.isArray(meta.authors)) {
        this.authorString = meta.authors.map((a) => a.name || a).join(', ')
      } else if (meta.authorName) {
        this.authorString = meta.authorName
      } else {
        this.authorString = ''
      }

      // Narrators
      if (Array.isArray(meta.narrators)) {
        this.narratorString = meta.narrators.join(', ')
      } else if (meta.narratorName) {
        this.narratorString = meta.narratorName
      } else {
        this.narratorString = ''
      }

      // Series
      if (Array.isArray(meta.series) && meta.series.length) {
        const s = meta.series[0]
        this.primarySeriesName = s.name || ''
        this.primarySeriesSequence = s.sequence || ''
      } else {
        this.primarySeriesName = ''
        this.primarySeriesSequence = ''
      }

      // Genres
      this.genreString = Array.isArray(meta.genres) ? meta.genres.join(', ') : ''

      // Tags
      this.tagString = Array.isArray(this.media.tags) ? this.media.tags.join(', ') : ''
    },
    async quickMatch() {
      if (!this.details.title) {
        this.$toast.warning('Title is required to match')
        return
      }
      this.quickMatching = true
      try {
        const payload = {
          provider: 'audible',
          title: this.details.title,
          author: this.primaryAuthor || null
        }
        const res = await this.$nativeHttp.post(`/api/items/${this.libraryItemId}/match`, payload)
        if (res?.updated) {
          this.$toast.success(this.$strings.ToastMatchSuccess || 'Book matched successfully')
          this.$emit('updated')
        } else if (res?.warning) {
          this.$toast.warning(res.warning)
        } else {
          this.$toast.info('No new match updates found')
        }
      } catch (err) {
        console.error('Quick match failed', err)
        this.$toast.error('Quick match failed')
      } finally {
        this.quickMatching = false
      }
    },
    async saveDetails() {
      if (!this.details.title) {
        this.$toast.warning('Title is required')
        return
      }

      this.saving = true

      try {
        // Parse authors array of objects
        const authors = this.authorString
          .split(',')
          .map((a) => a.trim())
          .filter(Boolean)
          .map((name) => ({ name }))

        // Parse narrators
        const narrators = this.narratorString
          .split(',')
          .map((n) => n.trim())
          .filter(Boolean)

        // Parse series
        const series = []
        if (this.primarySeriesName.trim()) {
          series.push({
            name: this.primarySeriesName.trim(),
            sequence: this.primarySeriesSequence.trim() || null
          })
        }

        // Parse genres
        const genres = this.genreString
          .split(',')
          .map((g) => g.trim())
          .filter(Boolean)

        // Parse tags
        const tags = this.tagString
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)

        const updatePayload = {
          metadata: {
            ...this.details,
            authors,
            narrators,
            series,
            genres
          },
          tags
        }

        const res = await this.$nativeHttp.patch(`/api/items/${this.libraryItemId}/media`, updatePayload)
        if (res) {
          this.$toast.success(this.$strings.ToastItemUpdateSuccess || 'Book updated successfully')
          this.$emit('updated', res.libraryItem || res)
          this.$emit('close')
        }
      } catch (err) {
        console.error('Failed to update book metadata', err)
        this.$toast.error('Failed to update book metadata')
      } finally {
        this.saving = false
      }
    }
  }
}
</script>
