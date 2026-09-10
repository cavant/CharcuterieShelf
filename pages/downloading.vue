<template>
  <div class="w-full h-full flex flex-col bg-bg overflow-hidden">
    <!-- Header -->
    <div class="flex-shrink-0 px-4 pt-4 pb-3 border-b border-border/40 bg-primary/20 backdrop-blur-md">
      <div class="flex items-center justify-between gap-2">
        <div class="flex items-center gap-3 min-w-0">
          <button
            class="w-10 h-10 rounded-full flex items-center justify-center hover:bg-bg-hover active:scale-95 transition-all text-fg"
            aria-label="Back"
            @click="$router.back()"
          >
            <span class="material-symbols text-2xl">arrow_back</span>
          </button>
          <div class="min-w-0">
            <h1 class="text-xl font-bold text-fg truncate leading-tight">Download Manager</h1>
            <p class="text-xs text-fg-muted truncate">
              {{ downloadItems.length }} item{{ downloadItems.length === 1 ? '' : 's' }} in queue
              <span v-if="failedItemsCount > 0" class="text-error font-medium ml-1">({{ failedItemsCount }} failed)</span>
            </p>
          </div>
        </div>

        <!-- Global Batch Actions -->
        <div class="flex items-center gap-1.5">
          <button
            v-if="failedItemsCount > 0"
            class="px-3 py-1.5 rounded-xl bg-accent text-primary font-semibold text-xs flex items-center gap-1 shadow-sm active:scale-95 transition-all"
            title="Retry all failed downloads"
            @click="retryAllFailed"
          >
            <span class="material-symbols text-sm">replay</span>
            <span>Retry All</span>
          </button>
          <button
            v-if="failedItemsCount > 0"
            class="px-3 py-1.5 rounded-xl bg-secondary/80 text-fg-muted hover:text-fg font-medium text-xs flex items-center gap-1 border border-border/60 active:scale-95 transition-all"
            title="Clear all failed downloads"
            @click="clearFailedDownloads"
          >
            <span class="material-symbols text-sm">clear_all</span>
            <span>Clear Failed</span>
          </button>
          <button
            v-if="downloadItems.length > 0"
            class="w-9 h-9 rounded-xl flex items-center justify-center text-fg-muted hover:text-error hover:bg-bg-hover active:scale-95 transition-all"
            title="Cancel all downloads"
            @click="confirmCancelAll"
          >
            <span class="material-symbols text-xl">delete_sweep</span>
          </button>
        </div>
      </div>

      <!-- Filter Tabs -->
      <div v-if="downloadItems.length > 0" class="flex gap-2 mt-3 overflow-x-auto no-scrollbar">
        <button
          class="px-3 py-1 rounded-full text-xs font-medium transition-all flex items-center gap-1.5"
          :class="activeFilter === 'all' ? 'bg-accent text-primary font-semibold shadow-sm' : 'bg-secondary/60 text-fg-muted hover:text-fg'"
          @click="activeFilter = 'all'"
        >
          <span>All</span>
          <span class="text-xxs px-1.5 py-0.5 rounded-full" :class="activeFilter === 'all' ? 'bg-primary/20 text-primary' : 'bg-bg text-fg-muted'">
            {{ downloadItems.length }}
          </span>
        </button>
        <button
          class="px-3 py-1 rounded-full text-xs font-medium transition-all flex items-center gap-1.5"
          :class="activeFilter === 'active' ? 'bg-accent text-primary font-semibold shadow-sm' : 'bg-secondary/60 text-fg-muted hover:text-fg'"
          @click="activeFilter = 'active'"
        >
          <span>Active & Queued</span>
          <span class="text-xxs px-1.5 py-0.5 rounded-full" :class="activeFilter === 'active' ? 'bg-primary/20 text-primary' : 'bg-bg text-fg-muted'">
            {{ activeItemsCount }}
          </span>
        </button>
        <button
          v-if="failedItemsCount > 0"
          class="px-3 py-1 rounded-full text-xs font-medium transition-all flex items-center gap-1.5"
          :class="activeFilter === 'failed' ? 'bg-error text-white font-semibold shadow-sm' : 'bg-error/10 text-error hover:bg-error/20 border border-error/30'"
          @click="activeFilter = 'failed'"
        >
          <span>Failed</span>
          <span class="text-xxs px-1.5 py-0.5 rounded-full" :class="activeFilter === 'failed' ? 'bg-white/20 text-white' : 'bg-error/20 text-error'">
            {{ failedItemsCount }}
          </span>
        </button>
      </div>
    </div>

    <!-- Content Area -->
    <div class="flex-1 overflow-y-auto px-4 py-4 space-y-3">
      <!-- Empty State -->
      <div v-if="filteredItems.length === 0" class="h-full flex flex-col items-center justify-center text-center py-16 px-6">
        <div class="w-16 h-16 rounded-3xl bg-secondary/40 border border-border/50 flex items-center justify-center text-fg-muted mb-4">
          <span class="material-symbols text-3xl">cloud_download</span>
        </div>
        <h3 class="text-lg font-bold text-fg mb-1">
          {{ downloadItems.length === 0 ? 'No Downloads in Queue' : 'No Items in this Filter' }}
        </h3>
        <p class="text-xs text-fg-muted max-w-xs mb-6">
          {{ downloadItems.length === 0 ? 'Audiobooks and podcast episodes you download for offline playback will appear here.' : 'Switch filters above to view other download tasks.' }}
        </p>
        <button
          v-if="downloadItems.length === 0"
          class="px-5 py-2.5 rounded-xl bg-accent text-primary font-bold text-sm shadow-md active:scale-95 transition-all"
          @click="$router.push('/')"
        >
          Browse Library
        </button>
      </div>

      <!-- Item Cards -->
      <div
        v-for="item in filteredItems"
        :key="item.id"
        class="rounded-2xl border transition-all duration-200 overflow-hidden shadow-sm"
        :class="isItemFailed(item) ? 'bg-error/5 border-error/30' : 'bg-secondary/30 border-border/50 hover:border-border'"
      >
        <div class="p-3.5 sm:p-4">
          <div class="flex items-start gap-3.5">
            <!-- Cover Art Thumbnail -->
            <div class="relative w-14 h-14 sm:w-16 sm:h-16 flex-shrink-0 rounded-xl overflow-hidden bg-primary shadow-inner border border-border/40">
              <img
                :src="getItemCoverUrl(item)"
                :alt="item.itemTitle"
                class="w-full h-full object-cover"
                @error="onCoverError"
              />
              <div
                v-if="isItemActive(item)"
                class="absolute inset-0 bg-accent/20 backdrop-blur-[1px] flex items-center justify-center"
              >
                <span class="material-symbols text-accent animate-spin text-xl">progress_activity</span>
              </div>
            </div>

            <!-- Item Info -->
            <div class="flex-1 min-w-0">
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0 flex-1">
                  <h4 class="font-bold text-sm sm:text-base text-fg truncate" :title="item.itemTitle">
                    {{ item.itemTitle || 'Untitled Media' }}
                  </h4>
                  <p class="text-xs text-fg-muted truncate mt-0.5">
                    {{ item.itemAuthor || (item.mediaType === 'podcast' ? 'Podcast' : 'Audiobook') }}
                  </p>
                </div>

                <!-- Single Item Action Buttons -->
                <div class="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    v-if="isItemFailed(item)"
                    class="px-2.5 py-1 rounded-xl bg-accent text-primary font-bold text-xs flex items-center gap-1 shadow-sm active:scale-95 transition-all"
                    title="Retry this download"
                    @click="retryItem(item)"
                  >
                    <span class="material-symbols text-xs">replay</span>
                    <span>Retry</span>
                  </button>
                  <button
                    class="w-8 h-8 rounded-xl flex items-center justify-center text-fg-muted hover:text-error hover:bg-bg-hover active:scale-95 transition-all"
                    :title="isItemFailed(item) ? 'Remove failed download' : 'Cancel download'"
                    @click="cancelItem(item)"
                  >
                    <span class="material-symbols text-lg">{{ isItemFailed(item) ? 'delete' : 'close' }}</span>
                  </button>
                </div>
              </div>

              <!-- Status Badge & Meta -->
              <div class="flex items-center gap-2 mt-2 flex-wrap">
                <span
                  v-if="isItemFailed(item)"
                  class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xxs font-bold bg-error/20 text-error border border-error/30"
                >
                  <span class="material-symbols text-xs">error</span>
                  <span>Failed ({{ getFailedPartsCount(item) }} file{{ getFailedPartsCount(item) === 1 ? '' : 's' }})</span>
                </span>
                <span
                  v-else-if="isItemActive(item)"
                  class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xxs font-bold bg-accent/20 text-accent border border-accent/30"
                >
                  <span class="w-1.5 h-1.5 rounded-full bg-accent animate-ping" />
                  <span>Downloading ({{ Math.round((item.itemProgress || 0) * 100) }}%)</span>
                </span>
                <span
                  v-else
                  class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xxs font-semibold bg-secondary text-fg-muted border border-border/40"
                >
                  <span class="material-symbols text-xs">schedule</span>
                  <span>Queued</span>
                </span>

                <span class="text-xxs text-fg-muted">
                  {{ getItemDownloadedBytesString(item) }} / {{ getItemTotalBytesString(item) }}
                </span>
                <span class="text-xxs text-fg-muted">• {{ item.downloadItemParts ? item.downloadItemParts.length : 0 }} parts</span>
              </div>
            </div>
          </div>

          <!-- Overall Progress Bar -->
          <div class="mt-3">
            <div class="w-full h-1.5 bg-bg/80 rounded-full overflow-hidden border border-border/30">
              <div
                class="h-full rounded-full transition-all duration-300"
                :class="isItemFailed(item) ? 'bg-error' : 'bg-accent'"
                :style="{ width: `${Math.min(100, Math.max(0, Math.round((item.itemProgress || 0) * 100)))}%` }"
              />
            </div>
          </div>

          <!-- Parts Toggle -->
          <div class="mt-2.5 pt-2 border-t border-border/30 flex items-center justify-between">
            <button
              class="text-xxs font-medium text-fg-muted hover:text-fg flex items-center gap-1 transition-colors"
              @click="toggleParts(item.id)"
            >
              <span class="material-symbols text-sm transition-transform duration-200" :class="expandedParts[item.id] ? 'rotate-180' : ''">
                expand_more
              </span>
              <span>{{ expandedParts[item.id] ? 'Hide Files' : 'Show Files' }} ({{ item.downloadItemParts ? item.downloadItemParts.length : 0 }})</span>
            </button>
            <span class="text-xxs text-fg-muted font-mono">
              {{ Math.round((item.itemProgress || 0) * 100) }}% complete
            </span>
          </div>

          <!-- Expanded Parts Details List -->
          <div v-if="expandedParts[item.id]" class="mt-2.5 pt-2 border-t border-border/20 space-y-2">
            <div
              v-for="part in item.downloadItemParts"
              :key="part.id"
              class="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-primary/20 border border-border/20"
            >
              <div class="flex items-center gap-2 min-w-0 flex-1 pr-2">
                <span v-if="part.completed" class="material-symbols text-success text-base flex-shrink-0">check_circle</span>
                <span v-else-if="part.failed" class="material-symbols text-error text-base flex-shrink-0">error</span>
                <span v-else-if="part.downloadId" class="material-symbols text-accent text-base flex-shrink-0 animate-spin">sync</span>
                <span v-else class="material-symbols text-fg-muted text-base flex-shrink-0">schedule</span>

                <div class="min-w-0 flex-1">
                  <p class="truncate text-fg font-medium text-xxs sm:text-xs" :title="part.filename">
                    {{ part.filename }}
                  </p>
                  <p v-if="part.failed" class="text-xxs text-error font-medium">Failed after max retries</p>
                  <p v-else-if="part.waitingForSpace" class="text-xxs text-warning">Waiting for free disk space</p>
                </div>
              </div>

              <div class="text-right flex-shrink-0">
                <span v-if="part.completed" class="text-xxs text-success font-semibold">Done</span>
                <span v-else-if="part.failed" class="text-xxs text-error font-semibold">Failed</span>
                <span v-else class="text-xxs text-fg-muted font-mono">{{ Math.round(part.progress || 0) }}%</span>
                <p class="text-xxs text-fg-muted">{{ $bytesPretty(part.fileSize || 0) }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { AbsDownloader } from '@/plugins/capacitor'

export default {
  data() {
    return {
      activeFilter: 'all',
      expandedParts: {}
    }
  },
  computed: {
    downloadItems() {
      return this.$store.state.globals.itemDownloads || []
    },
    activeItemsCount() {
      return this.downloadItems.filter((i) => !this.isItemFailed(i)).length
    },
    failedItemsCount() {
      return this.downloadItems.filter((i) => this.isItemFailed(i)).length
    },
    filteredItems() {
      if (this.activeFilter === 'active') {
        return this.downloadItems.filter((i) => !this.isItemFailed(i))
      }
      if (this.activeFilter === 'failed') {
        return this.downloadItems.filter((i) => this.isItemFailed(i))
      }
      return this.downloadItems
    }
  },
  methods: {
    isItemFailed(item) {
      if (item.hasFailed || item.terminalFailureAt) return true
      return item.downloadItemParts?.some((p) => p.failed) || false
    },
    isItemActive(item) {
      if (this.isItemFailed(item)) return false
      return item.downloadItemParts?.some((p) => p.downloadId != null || p.isMoving) || false
    },
    getFailedPartsCount(item) {
      return item.downloadItemParts?.filter((p) => p.failed).length || 0
    },
    getItemCoverUrl(item) {
      return this.$store.getters['globals/getLibraryItemCoverSrcById'](item.libraryItemId)
    },
    onCoverError(e) {
      e.target.src = `${this.$store.state.routerBasePath}/book_placeholder.jpg`
    },
    getItemDownloadedBytesString(item) {
      let total = 0
      item.downloadItemParts?.forEach((p) => {
        total += Number(p.bytesDownloaded || 0)
      })
      return this.$bytesPretty(total)
    },
    getItemTotalBytesString(item) {
      let total = 0
      item.downloadItemParts?.forEach((p) => {
        total += Number(p.completed ? (p.bytesDownloaded || p.fileSize || 0) : (p.fileSize || 0))
      })
      return this.$bytesPretty(total)
    },
    toggleParts(itemId) {
      this.$set(this.expandedParts, itemId, !this.expandedParts[itemId])
    },
    async retryItem(item) {
      try {
        await AbsDownloader.retryDownloadItem({ id: item.id })
        this.$toast.info(`Retrying download: ${item.itemTitle}`)
        await this.syncQueue()
      } catch (e) {
        console.error('Failed to retry download item', e)
        this.$toast.error('Failed to retry download')
      }
    },
    async cancelItem(item) {
      try {
        await AbsDownloader.cancelDownloadItem({ id: item.id })
        this.$store.commit('globals/removeItemDownload', item.id)
        this.$toast.info(`Removed download: ${item.itemTitle}`)
      } catch (e) {
        console.error('Failed to cancel download item', e)
        this.$toast.error('Failed to remove download')
      }
    },
    async retryAllFailed() {
      try {
        const res = await AbsDownloader.retryAllFailed()
        this.$toast.info(`Retrying ${res?.count || 'failed'} download(s)`)
        await this.syncQueue()
      } catch (e) {
        console.error('Failed to retry all failed downloads', e)
        this.$toast.error('Failed to retry downloads')
      }
    },
    async clearFailedDownloads() {
      try {
        const res = await AbsDownloader.clearFailedDownloads()
        this.$store.commit('globals/clearFailedItemDownloads')
        this.$toast.info(`Cleared ${res?.count || 0} failed download(s)`)
        await this.syncQueue()
      } catch (e) {
        console.error('Failed to clear failed downloads', e)
        this.$toast.error('Failed to clear downloads')
      }
    },
    async confirmCancelAll() {
      if (!confirm('Are you sure you want to cancel and remove all downloads in queue?')) return
      try {
        await AbsDownloader.cancelAllDownloads()
        this.$store.commit('globals/clearItemDownloads')
        this.$toast.info('Cancelled all downloads')
      } catch (e) {
        console.error('Failed to cancel all downloads', e)
        this.$toast.error('Failed to cancel all downloads')
      }
    },
    async syncQueue() {
      try {
        const res = await AbsDownloader.getDownloadQueue()
        if (res?.queue) {
          this.$store.commit('globals/setItemDownloads', res.queue)
        }
      } catch (e) {
        console.warn('Could not sync native download queue', e)
      }
    }
  },
  async mounted() {
    await this.syncQueue()
  }
}
</script>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>

