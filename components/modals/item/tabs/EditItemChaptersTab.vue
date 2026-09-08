<template>
  <div class="w-full h-full flex flex-col justify-between overflow-hidden">
    <!-- Action Bar -->
    <div class="p-3 bg-primary/40 border-b border-white/10 space-y-2">
      <div class="flex items-center justify-between flex-wrap gap-2">
        <div class="flex items-center space-x-2">
          <ui-btn small color="bg-secondary" @click="setChaptersFromTracks">
            <span class="material-symbols text-sm mr-1">audio_file</span>
            {{ $strings.ButtonSetFromTracks }}
          </ui-btn>
          <ui-btn small color="bg-secondary" @click="showShiftInput = !showShiftInput">
            <span class="material-symbols text-sm mr-1">update</span>
            {{ $strings.ButtonShiftTimes }}
          </ui-btn>
          <ui-btn small color="bg-secondary" @click="showLookupInput = !showLookupInput">
            <span class="material-symbols text-sm mr-1">search</span>
            {{ $strings.ButtonLookupAudible }}
          </ui-btn>
        </div>
        <div class="flex items-center space-x-2">
          <ui-btn small color="bg-primary" @click="addNewChapter">
            <span class="material-symbols text-sm mr-1">add</span>
            {{ $strings.ButtonAddChapter }}
          </ui-btn>
        </div>
      </div>

      <!-- Shift Times collapsible -->
      <div v-if="showShiftInput" class="flex items-center space-x-2 p-2 bg-secondary rounded-md">
        <span class="text-xs text-gray-300 font-medium whitespace-nowrap">{{ $strings.LabelTimeToShift }}:</span>
        <ui-text-input v-model="shiftSeconds" type="number" class="w-20 text-xs" placeholder="+/- sec" />
        <ui-btn small color="bg-primary" @click="applyShift">Apply</ui-btn>
        <button class="material-symbols text-gray-400 hover:text-white text-sm" @click="showShiftInput = false">close</button>
      </div>

      <!-- Lookup Chapters collapsible -->
      <div v-if="showLookupInput" class="flex items-center space-x-2 p-2 bg-secondary rounded-md">
        <span class="text-xs text-gray-300 font-medium whitespace-nowrap">ASIN:</span>
        <ui-text-input v-model="lookupAsin" class="w-28 text-xs" placeholder="B00..." />
        <ui-btn small color="bg-primary" :loading="lookingUp" @click="lookupAudibleChapters">Search</ui-btn>
        <button class="material-symbols text-gray-400 hover:text-white text-sm" @click="showLookupInput = false">close</button>
      </div>
    </div>

    <!-- Chapter List -->
    <div class="overflow-y-auto px-2 py-3 flex-1 space-y-2">
      <div v-if="!localChapters.length" class="text-center py-12 text-gray-400">
        <span class="material-symbols text-4xl mb-2">format_list_numbered</span>
        <p class="text-sm">No chapters found for this audiobook.</p>
        <p class="text-xs text-gray-500 mt-1">Tap "Set from Tracks" or "Add Chapter" to create chapters.</p>
      </div>

      <div
        v-for="(chapter, idx) in localChapters"
        :key="chapter.id !== undefined ? chapter.id : idx"
        class="flex items-center space-x-2 p-2 rounded-lg bg-primary/20 border border-white/5 hover:border-white/15"
      >
        <!-- Index -->
        <span class="text-xs font-mono text-gray-400 w-7 text-center">#{{ idx + 1 }}</span>

        <!-- Time fine-tune & display -->
        <div class="flex items-center space-x-1">
          <button
            class="w-6 h-6 rounded-full bg-secondary hover:bg-white/20 flex items-center justify-center text-gray-300 text-xs disabled:opacity-30"
            :disabled="chapter.start <= 0"
            @click="adjustChapterStart(idx, -1)"
          >
            -
          </button>
          <input
            v-model="chapter.startFormatted"
            type="text"
            class="w-20 h-7 text-xs font-mono text-center bg-secondary rounded border border-white/10 text-white focus:outline-hidden focus:border-yellow-400"
            @blur="formatAndSort(idx)"
          />
          <button
            class="w-6 h-6 rounded-full bg-secondary hover:bg-white/20 flex items-center justify-center text-gray-300 text-xs"
            @click="adjustChapterStart(idx, 1)"
          >
            +
          </button>
        </div>

        <!-- Title Input -->
        <div class="flex-1 min-w-0">
          <input
            v-model="chapter.title"
            type="text"
            class="w-full h-7 px-2 text-xs bg-secondary rounded border border-white/10 text-white focus:outline-hidden focus:border-yellow-400 truncate"
            placeholder="Chapter title"
          />
        </div>

        <!-- Row actions -->
        <div class="flex items-center space-x-1">
          <button
            class="w-7 h-7 flex items-center justify-center rounded text-gray-400 hover:text-success hover:bg-white/5"
            :title="$strings.ButtonInsertChapter"
            @click="insertChapterBelow(idx)"
          >
            <span class="material-symbols text-base">add_circle</span>
          </button>
          <button
            class="w-7 h-7 flex items-center justify-center rounded text-gray-400 hover:text-error hover:bg-white/5"
            title="Delete chapter"
            @click="deleteChapter(idx)"
          >
            <span class="material-symbols text-base">delete</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Footer buttons -->
    <div class="p-4 bg-primary border-t border-white/10 flex items-center justify-between">
      <span class="text-xs text-gray-400 font-mono">{{ localChapters.length }} chapters</span>
      <div class="flex items-center space-x-3">
        <ui-btn color="bg-secondary" @click="$emit('close')">{{ $strings.ButtonCancel }}</ui-btn>
        <ui-btn color="bg-success" :loading="saving" @click="saveChapters">{{ $strings.ButtonSave }}</ui-btn>
      </div>
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
      lookingUp: false,
      showShiftInput: false,
      showLookupInput: false,
      shiftSeconds: 0,
      lookupAsin: '',
      localChapters: []
    }
  },
  computed: {
    libraryItemId() {
      return this.libraryItem?.id
    },
    media() {
      return this.libraryItem?.media || {}
    },
    chapters() {
      return this.media.chapters || []
    },
    audioTracks() {
      return (this.media.audioFiles || []).filter((f) => !f.exclude)
    },
    totalDuration() {
      return this.media.duration || 0
    }
  },
  watch: {
    libraryItem: {
      immediate: true,
      handler() {
        this.populateChapters()
      }
    }
  },
  methods: {
    secondsToHms(sec) {
      const s = Math.max(0, Math.floor(sec || 0))
      const hours = Math.floor(s / 3600)
      const minutes = Math.floor((s % 3600) / 60)
      const seconds = s % 60
      const hStr = hours.toString().padStart(2, '0')
      const mStr = minutes.toString().padStart(2, '0')
      const sStr = seconds.toString().padStart(2, '0')
      return `${hStr}:${mStr}:${sStr}`
    },
    hmsToSeconds(hmsStr) {
      if (!hmsStr) return 0
      const clean = hmsStr.trim()
      // If direct seconds number
      if (!isNaN(clean)) return Math.max(0, parseFloat(clean))
      const parts = clean.split(':').map((p) => parseFloat(p) || 0)
      if (parts.length === 3) {
        return parts[0] * 3600 + parts[1] * 60 + parts[2]
      } else if (parts.length === 2) {
        return parts[0] * 60 + parts[1]
      }
      return 0
    },
    populateChapters() {
      this.lookupAsin = this.media.metadata?.asin || ''
      this.localChapters = (this.chapters || []).map((ch, idx) => ({
        id: ch.id !== undefined ? ch.id : idx,
        start: ch.start || 0,
        end: ch.end || 0,
        startFormatted: this.secondsToHms(ch.start || 0),
        title: ch.title || `Chapter ${idx + 1}`
      }))
    },
    formatAndSort(idx) {
      const ch = this.localChapters[idx]
      if (ch) {
        ch.start = this.hmsToSeconds(ch.startFormatted)
        ch.startFormatted = this.secondsToHms(ch.start)
      }
      this.recalculateEnds()
    },
    recalculateEnds() {
      // Sort chapters by start time
      this.localChapters.sort((a, b) => a.start - b.start)
      for (let i = 0; i < this.localChapters.length; i++) {
        this.localChapters[i].id = i
        const nextStart = i < this.localChapters.length - 1 ? this.localChapters[i + 1].start : this.totalDuration
        this.localChapters[i].end = Math.max(this.localChapters[i].start, nextStart)
      }
    },
    adjustChapterStart(idx, deltaSec) {
      const ch = this.localChapters[idx]
      if (!ch) return
      ch.start = Math.max(0, ch.start + deltaSec)
      ch.startFormatted = this.secondsToHms(ch.start)
      this.recalculateEnds()
    },
    addNewChapter() {
      const last = this.localChapters[this.localChapters.length - 1]
      const newStart = last ? last.end : 0
      this.localChapters.push({
        id: this.localChapters.length,
        start: newStart,
        end: this.totalDuration > newStart ? this.totalDuration : newStart + 60,
        startFormatted: this.secondsToHms(newStart),
        title: `Chapter ${this.localChapters.length + 1}`
      })
      this.recalculateEnds()
    },
    insertChapterBelow(idx) {
      const current = this.localChapters[idx]
      const newStart = current ? current.start + Math.floor((current.end - current.start) / 2) : 0
      this.localChapters.splice(idx + 1, 0, {
        id: idx + 1,
        start: newStart,
        end: current ? current.end : newStart + 60,
        startFormatted: this.secondsToHms(newStart),
        title: `Chapter ${idx + 2}`
      })
      this.recalculateEnds()
    },
    deleteChapter(idx) {
      this.localChapters.splice(idx, 1)
      this.recalculateEnds()
    },
    setChaptersFromTracks() {
      if (!this.audioTracks.length) {
        this.$toast.warning('No audio tracks found to build chapters from')
        return
      }
      let cumulativeTime = 0
      const generated = []
      for (let i = 0; i < this.audioTracks.length; i++) {
        const track = this.audioTracks[i]
        const dur = track.duration || 0
        const rawFilename = track.metadata?.filename || `Track ${i + 1}`
        const cleanTitle = rawFilename.replace(/\.[^/.]+$/, '')
        generated.push({
          id: i,
          start: cumulativeTime,
          end: cumulativeTime + dur,
          startFormatted: this.secondsToHms(cumulativeTime),
          title: cleanTitle
        })
        cumulativeTime += dur
      }
      this.localChapters = generated
      this.$toast.info(`Created ${generated.length} chapters from tracks`)
    },
    applyShift() {
      const shift = parseFloat(this.shiftSeconds)
      if (isNaN(shift) || shift === 0) return
      for (const ch of this.localChapters) {
        ch.start = Math.max(0, ch.start + shift)
        ch.startFormatted = this.secondsToHms(ch.start)
      }
      this.recalculateEnds()
      this.showShiftInput = false
      this.shiftSeconds = 0
      this.$toast.info(`Shifted chapters by ${shift > 0 ? '+' : ''}${shift}s`)
    },
    async lookupAudibleChapters() {
      const asin = (this.lookupAsin || '').trim()
      if (!asin) {
        this.$toast.warning('ASIN is required for Audible chapter lookup')
        return
      }
      this.lookingUp = true
      try {
        // Query server chapter search endpoint
        const res = await this.$nativeHttp.get(`/api/items/${this.libraryItemId}/chapters/search?asin=${asin}&region=us`)
        if (res?.chapters && Array.isArray(res.chapters)) {
          this.localChapters = res.chapters.map((ch, idx) => ({
            id: idx,
            start: ch.start || ch.startOffsetMs / 1000 || 0,
            end: ch.end || (ch.startOffsetMs + ch.lengthMs) / 1000 || 0,
            startFormatted: this.secondsToHms(ch.start || ch.startOffsetMs / 1000 || 0),
            title: ch.title || `Chapter ${idx + 1}`
          }))
          this.recalculateEnds()
          this.showLookupInput = false
          this.$toast.success(`Found ${res.chapters.length} chapters from Audible`)
        } else {
          this.$toast.warning('No chapters found for this ASIN')
        }
      } catch (err) {
        console.error('Chapter lookup failed', err)
        this.$toast.error('Audible chapter lookup failed')
      } finally {
        this.lookingUp = false
      }
    },
    async saveChapters() {
      this.recalculateEnds()
      const payload = {
        chapters: this.localChapters.map((ch) => ({
          id: ch.id,
          start: ch.start,
          end: ch.end,
          title: ch.title
        }))
      }

      this.saving = true
      try {
        const res = await this.$nativeHttp.post(`/api/items/${this.libraryItemId}/chapters`, payload)
        if (res) {
          this.$toast.success(this.$strings.ToastChaptersUpdated || 'Chapters updated successfully')
          this.$emit('updated')
          this.$emit('close')
        }
      } catch (err) {
        console.error('Failed to save chapters', err)
        this.$toast.error('Failed to save chapters')
      } finally {
        this.saving = false
      }
    }
  }
}
</script>
