<template>
  <modals-modal v-model="show" :width="460" max-width="95%">
    <div class="w-full rounded-2xl bg-bg border border-border p-6 shadow-2xl">
      <!-- Modal Header -->
      <div class="flex items-center justify-between pb-4 border-b border-border">
        <div class="flex items-center space-x-2.5 truncate">
          <span class="material-symbols text-accent text-2xl">tune</span>
          <div class="truncate">
            <h3 class="text-lg font-bold text-fg truncate leading-tight">Podcast Settings</h3>
            <p class="text-xs text-fg-muted truncate">{{ title }}</p>
          </div>
        </div>
      </div>

      <!-- Settings Content -->
      <div class="py-4 space-y-6 max-h-[70vh] overflow-y-auto pr-1">
        
        <!-- Skip First (Intro) -->
        <div class="bg-primary/40 rounded-xl p-4 border border-border/50">
          <div class="flex items-center justify-between mb-1">
            <div class="flex items-center space-x-2">
              <span class="material-symbols text-fg text-lg">fast_forward</span>
              <p class="text-sm font-semibold text-fg">Skip First (Intro Skip)</p>
            </div>
            <span class="text-sm font-mono font-bold text-accent">{{ skipFirst }}s</span>
          </div>
          <p class="text-xs text-fg-muted mb-3">Automatically skip intro music and announcements when starting an episode.</p>
          <div class="flex items-center justify-center space-x-3">
            <button class="px-3 py-1.5 rounded-lg bg-secondary text-fg text-xs font-semibold hover:bg-bg-hover active:scale-95 transition-transform" @click="adjustSkipFirst(-30)">-30s</button>
            <button class="px-3 py-1.5 rounded-lg bg-secondary text-fg text-xs font-semibold hover:bg-bg-hover active:scale-95 transition-transform" @click="adjustSkipFirst(-5)">-5s</button>
            <button class="px-3 py-1.5 rounded-lg bg-secondary text-fg text-xs font-semibold hover:bg-bg-hover active:scale-95 transition-transform" @click="skipFirst = 0">Reset</button>
            <button class="px-3 py-1.5 rounded-lg bg-secondary text-fg text-xs font-semibold hover:bg-bg-hover active:scale-95 transition-transform" @click="adjustSkipFirst(5)">+5s</button>
            <button class="px-3 py-1.5 rounded-lg bg-secondary text-fg text-xs font-semibold hover:bg-bg-hover active:scale-95 transition-transform" @click="adjustSkipFirst(30)">+30s</button>
          </div>
        </div>

        <!-- Skip Last (Outro) -->
        <div class="bg-primary/40 rounded-xl p-4 border border-border/50">
          <div class="flex items-center justify-between mb-1">
            <div class="flex items-center space-x-2">
              <span class="material-symbols text-fg text-lg">skip_next</span>
              <p class="text-sm font-semibold text-fg">Skip Last (Outro Skip)</p>
            </div>
            <span class="text-sm font-mono font-bold text-accent">{{ skipLast }}s</span>
          </div>
          <p class="text-xs text-fg-muted mb-3">Skip outro credits and advance to next episode early.</p>
          <div class="flex items-center justify-center space-x-3">
            <button class="px-3 py-1.5 rounded-lg bg-secondary text-fg text-xs font-semibold hover:bg-bg-hover active:scale-95 transition-transform" @click="adjustSkipLast(-30)">-30s</button>
            <button class="px-3 py-1.5 rounded-lg bg-secondary text-fg text-xs font-semibold hover:bg-bg-hover active:scale-95 transition-transform" @click="adjustSkipLast(-5)">-5s</button>
            <button class="px-3 py-1.5 rounded-lg bg-secondary text-fg text-xs font-semibold hover:bg-bg-hover active:scale-95 transition-transform" @click="skipLast = 0">Reset</button>
            <button class="px-3 py-1.5 rounded-lg bg-secondary text-fg text-xs font-semibold hover:bg-bg-hover active:scale-95 transition-transform" @click="adjustSkipLast(5)">+5s</button>
            <button class="px-3 py-1.5 rounded-lg bg-secondary text-fg text-xs font-semibold hover:bg-bg-hover active:scale-95 transition-transform" @click="adjustSkipLast(30)">+30s</button>
          </div>
        </div>

        <!-- Trim Silence (Pocket Casts Feature) -->
        <div class="bg-primary/40 rounded-xl p-4 border border-border/50 flex items-center justify-between">
          <div class="flex-1 pr-4">
            <div class="flex items-center space-x-2 mb-1">
              <span class="material-symbols text-fg text-lg">graphic_eq</span>
              <p class="text-sm font-semibold text-fg">Trim Silence</p>
            </div>
            <p class="text-xs text-fg-muted">Skip silence gaps in speech automatically without altering pitch.</p>
          </div>
          <ui-toggle-switch v-model="skipSilence" />
        </div>

        <!-- Auto-Delete Played Episodes -->
        <div class="bg-primary/40 rounded-xl p-4 border border-border/50 flex items-center justify-between">
          <div class="flex-1 pr-4">
            <div class="flex items-center space-x-2 mb-1">
              <span class="material-symbols text-fg text-lg">auto_delete</span>
              <p class="text-sm font-semibold text-fg">Auto-Delete Played Episodes</p>
            </div>
            <p class="text-xs text-fg-muted">Automatically remove downloaded episodes from this device when playback finishes.</p>
          </div>
          <ui-toggle-switch v-model="autoDelete" />
        </div>

        <!-- Custom Playback Speed -->
        <div class="bg-primary/40 rounded-xl p-4 border border-border/50">
          <div class="flex items-center justify-between mb-1">
            <div class="flex items-center space-x-2">
              <span class="material-symbols text-fg text-lg">speed</span>
              <p class="text-sm font-semibold text-fg">Custom Playback Speed</p>
            </div>
            <span class="text-sm font-mono font-bold text-accent">{{ customSpeed ? customSpeed + 'x' : 'Global' }}</span>
          </div>
          <p class="text-xs text-fg-muted mb-3">Override default playback speed specifically for this podcast show.</p>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="rate in speedOptions"
              :key="rate.label"
              class="px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition-colors"
              :class="customSpeed === rate.value ? 'bg-accent text-black font-bold' : 'bg-secondary text-fg hover:bg-bg-hover'"
              @click="customSpeed = rate.value"
            >
              {{ rate.label }}
            </button>
          </div>
        </div>

      </div>

      <!-- Footer Buttons -->
      <div class="flex items-center justify-end space-x-3 pt-4 border-t border-border">
        <ui-btn small color="secondary" @click="show = false">Cancel</ui-btn>
        <ui-btn small color="success" @click="save">Save Settings</ui-btn>
      </div>
    </div>
  </modals-modal>
</template>

<script>
import { AbsAudioPlayer } from '@/plugins/capacitor'

export default {
  props: {
    value: Boolean,
    libraryItem: {
      type: Object,
      default: () => {}
    }
  },
  data() {
    return {
      skipFirst: 0,
      skipLast: 0,
      skipSilence: false,
      autoDelete: true,
      customSpeed: null,
      speedOptions: [
        { label: 'Global', value: null },
        { label: '0.8x', value: 0.8 },
        { label: '1.0x', value: 1.0 },
        { label: '1.1x', value: 1.1 },
        { label: '1.2x', value: 1.2 },
        { label: '1.3x', value: 1.3 },
        { label: '1.4x', value: 1.4 },
        { label: '1.5x', value: 1.5 },
        { label: '1.75x', value: 1.75 },
        { label: '2.0x', value: 2.0 }
      ]
    }
  },
  computed: {
    show: {
      get() {
        return this.value
      },
      set(val) {
        this.$emit('input', val)
      }
    },
    libraryItemId() {
      return this.libraryItem?.id || null
    },
    title() {
      return this.libraryItem?.media?.metadata?.title || 'Podcast'
    }
  },
  watch: {
    show(newVal) {
      if (newVal) {
        this.loadSettings()
      }
    }
  },
  methods: {
    adjustSkipFirst(amount) {
      this.skipFirst = Math.max(0, Math.min(300, (this.skipFirst || 0) + amount))
    },
    adjustSkipLast(amount) {
      this.skipLast = Math.max(0, Math.min(300, (this.skipLast || 0) + amount))
    },
    async loadSettings() {
      if (!this.libraryItemId) return
      const saved = await this.$localStore.getPodcastSettings(this.libraryItemId)
      if (saved) {
        this.skipFirst = saved.skipFirst || 0
        this.skipLast = saved.skipLast || 0
        this.skipSilence = !!saved.skipSilence
        this.autoDelete = saved.autoDelete !== undefined ? !!saved.autoDelete : true
        this.customSpeed = saved.customSpeed || null
      } else {
        this.skipFirst = 0
        this.skipLast = 0
        this.skipSilence = false
        this.autoDelete = true
        this.customSpeed = null
      }
    },
    async save() {
      const settings = {
        skipFirst: this.skipFirst,
        skipLast: this.skipLast,
        skipSilence: this.skipSilence,
        autoDelete: this.autoDelete,
        customSpeed: this.customSpeed
      }
      if (this.libraryItemId) {
        await this.$localStore.setPodcastSettings(this.libraryItemId, settings)
      }

      // If this podcast is currently playing, immediately apply skipSilence
      if (AbsAudioPlayer?.setSkipSilence) {
        try {
          await AbsAudioPlayer.setSkipSilence({ enabled: this.skipSilence })
        } catch (e) {
          console.warn('Failed to apply skipSilence to active player', e)
        }
      }

      this.$toast.success('Podcast settings updated')
      this.$emit('saved', settings)
      this.show = false
    }
  }
}
</script>
