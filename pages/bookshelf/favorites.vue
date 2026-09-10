<template>
  <div class="w-full h-full flex flex-col relative select-none">
    <!-- Top Toolbar -->
    <div class="w-full px-3 py-2.5 bg-bg border-b border-border/40 flex items-center justify-between z-20 flex-shrink-0">
      <div class="flex items-center space-x-2">
        <span class="material-symbols text-amber-400 fill text-xl">star</span>
        <h1 class="text-base font-bold text-fg leading-none">{{ $strings.LabelFavorites || 'Favorites' }}</h1>
        <span v-if="filteredItems.length" class="text-xs px-2 py-0.5 rounded-full bg-secondary text-fg-muted font-medium">
          {{ filteredItems.length }}
        </span>
      </div>

      <div class="flex items-center space-x-1.5">
        <!-- Search filter toggle -->
        <button
          type="button"
          class="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
          :class="showSearch || searchQuery ? 'bg-primary text-accent' : 'text-fg-muted hover:text-fg hover:bg-secondary'"
          :title="$strings.LabelSearch || 'Search'"
          @click="toggleSearch"
        >
          <span class="material-symbols text-lg">search</span>
        </button>

        <!-- Batch Add / Pick Favorites modal -->
        <button
          type="button"
          class="w-8 h-8 rounded-lg flex items-center justify-center text-fg-muted hover:text-fg hover:bg-secondary transition-colors"
          title="Add Podcasts to Favorites"
          @click="openAddModal"
        >
          <span class="material-symbols text-xl">playlist_add</span>
        </button>

        <!-- Reorder Toggle Button -->
        <button
          v-if="favoriteItems.length > 1"
          type="button"
          class="h-8 px-2.5 rounded-lg flex items-center space-x-1 text-xs font-semibold transition-all duration-200"
          :class="isReordering ? 'bg-accent text-white shadow-md' : 'bg-secondary text-fg hover:bg-primary border border-border/60'"
          @click="toggleReorder"
        >
          <span class="material-symbols text-base leading-none">{{ isReordering ? 'done' : 'swap_vert' }}</span>
          <span>{{ isReordering ? 'Done' : 'Reorder' }}</span>
        </button>
      </div>
    </div>

    <!-- Collapsible Search Bar -->
    <div v-show="showSearch" class="w-full px-3 py-2 bg-secondary/80 border-b border-border/40 flex items-center space-x-2 flex-shrink-0">
      <div class="relative flex-1">
        <span class="material-symbols absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-muted text-base">search</span>
        <input
          ref="searchInput"
          v-model="searchQuery"
          type="text"
          placeholder="Filter favorite shows..."
          class="w-full bg-primary/70 border border-border/60 rounded-lg pl-8 pr-8 py-1.5 text-xs text-fg placeholder-fg-muted focus:outline-none focus:border-accent"
        />
        <button
          v-if="searchQuery"
          type="button"
          class="absolute right-2 top-1/2 -translate-y-1/2 text-fg-muted hover:text-fg"
          @click="searchQuery = ''"
        >
          <span class="material-symbols text-sm">close</span>
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading && !favoriteItems.length" class="flex-1 flex flex-col items-center justify-center p-6">
      <widgets-loading-spinner />
      <p class="text-xs text-fg-muted mt-3">Loading your favorites...</p>
    </div>

    <!-- Main Favorites Content -->
    <div v-else-if="favoriteItems.length" class="flex-1 min-h-0 flex flex-col overflow-hidden">
      <!-- Reorder Instructions Notice -->
      <div v-if="isReordering && favoriteItems.length > 1" class="w-full py-1.5 px-3 bg-accent/10 border-b border-accent/20 flex items-center justify-center space-x-1.5 text-xs text-accent flex-shrink-0 animate-pulse">
        <span class="material-symbols text-sm">drag_indicator</span>
        <span>Drag icons to reorder in whatever arrangement you like</span>
      </div>

      <!-- Main Grid Container -->
      <div class="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-3">
        <!-- Reorder Mode Grid (Draggable) -->
        <draggable
          v-if="isReordering"
          v-model="favoriteItems"
          v-bind="dragOptions"
          class="grid grid-cols-3 gap-2.5 sm:gap-3"
          tag="div"
          @start="onDragStart"
          @end="onDragEnd"
        >
          <div
            v-for="item in favoriteItems"
            :key="item.id"
            class="podcast-tile relative aspect-square rounded-2xl overflow-hidden bg-secondary shadow-md cursor-grab active:cursor-grabbing border border-border/40 group select-none transition-transform duration-150 scale-98 shadow-xl ring-2 ring-accent animate-subtle-wobble"
            @contextmenu.prevent
          >
            <!-- Cover Art Image -->
            <img
              :src="getCoverSrc(item)"
              :alt="getItemTitle(item)"
              class="w-full h-full object-cover pointer-events-none select-none"
              loading="lazy"
              @error="onImageError($event, item)"
            />

            <!-- Fallback Cover if no image -->
            <div
              v-if="!item.media?.coverPath && !item.coverContentUrl"
              class="absolute inset-0 bg-primary/90 p-2 flex flex-col items-center justify-center text-center pointer-events-none"
            >
              <span class="material-symbols text-fg-muted text-2xl mb-1">podcasts</span>
              <p class="text-xxs font-semibold text-fg line-clamp-2">{{ getItemTitle(item) }}</p>
            </div>

            <!-- Pocket Casts Style Unplayed Episode Count Badge (Top-Right) -->
            <div
              v-if="getUnplayedBadge(item)"
              class="absolute top-1.5 right-1.5 min-w-[22px] h-[22px] px-1.5 rounded-full bg-accent text-white flex items-center justify-center font-bold text-xs shadow-lg border border-black/20 pointer-events-none z-10"
            >
              {{ getUnplayedBadge(item) }}
            </div>

            <!-- Reorder Mode: Drag Overlay & Quick Remove Button -->
            <div class="absolute inset-0 bg-black/20 pointer-events-none flex items-center justify-center z-10">
              <span class="material-symbols text-white/80 text-2xl drop-shadow">drag_indicator</span>
            </div>
            <button
              type="button"
              class="absolute top-1 left-1 w-6 h-6 rounded-full bg-error text-white flex items-center justify-center shadow-md z-20 hover:scale-110 active:scale-95 transition-transform"
              title="Remove from favorites"
              @click.stop="removeFavorite(item)"
            >
              <span class="material-symbols text-xs font-bold">close</span>
            </button>
          </div>
        </draggable>

        <!-- Normal Viewing Grid (when not reordering) -->
        <div
          v-else
          class="grid grid-cols-3 gap-2.5 sm:gap-3"
        >
          <div
            v-for="item in displayedItems"
            :key="item.id"
            class="podcast-tile relative aspect-square rounded-2xl overflow-hidden bg-secondary shadow-md cursor-pointer border border-border/40 group select-none transition-transform duration-150 active:scale-95"
            @click="onTileClick(item)"
            @contextmenu.prevent="onTileLongPress(item)"
          >
            <!-- Cover Art Image -->
            <img
              :src="getCoverSrc(item)"
              :alt="getItemTitle(item)"
              class="w-full h-full object-cover pointer-events-none select-none"
              loading="lazy"
              @error="onImageError($event, item)"
            />

            <!-- Fallback Cover if no image -->
            <div
              v-if="!item.media?.coverPath && !item.coverContentUrl"
              class="absolute inset-0 bg-primary/90 p-2 flex flex-col items-center justify-center text-center pointer-events-none"
            >
              <span class="material-symbols text-fg-muted text-2xl mb-1">podcasts</span>
              <p class="text-xxs font-semibold text-fg line-clamp-2">{{ getItemTitle(item) }}</p>
            </div>

            <!-- Pocket Casts Style Unplayed Episode Count Badge (Top-Right) -->
            <div
              v-if="getUnplayedBadge(item)"
              class="absolute top-1.5 right-1.5 min-w-[22px] h-[22px] px-1.5 rounded-full bg-accent text-white flex items-center justify-center font-bold text-xs shadow-lg border border-black/20 pointer-events-none z-10"
            >
              {{ getUnplayedBadge(item) }}
            </div>
          </div>

          <div v-if="!displayedItems.length" class="col-span-3 py-12 text-center text-xs text-fg-muted">
            No favorite podcasts match "{{ searchQuery }}".
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else-if="!isLoading" class="flex-1 flex flex-col items-center justify-center p-6 text-center">
      <div class="w-16 h-16 rounded-2xl bg-amber-400/15 border border-amber-400/30 text-amber-400 flex items-center justify-center mb-4">
        <span class="material-symbols text-3xl fill">star</span>
      </div>
      <h2 class="text-base font-bold text-fg mb-1">{{ $strings.LabelNoFavorites || 'No Favorite Podcasts Yet' }}</h2>
      <p class="text-xs text-fg-muted max-w-xs mb-5 leading-relaxed">
        {{ $strings.MessageFavoritesDescription || 'Star your favorite podcasts to customize and reorder your top shows here.' }}
      </p>

      <div class="flex flex-col sm:flex-row gap-2.5 w-full max-w-xs">
        <ui-btn
          v-if="subscribedPodcastIds.length"
          color="accent"
          class="w-full flex items-center justify-center text-xs font-semibold py-2.5"
          :loading="populatingFromSubs"
          @click="addFromSubscriptions"
        >
          <span class="material-symbols text-base mr-1.5">subscriptions</span>
          <span>Add Subscribed Shows ({{ subscribedPodcastIds.length }})</span>
        </ui-btn>

        <ui-btn
          color="primary"
          class="w-full flex items-center justify-center text-xs font-semibold py-2.5"
          @click="openAddModal"
        >
          <span class="material-symbols text-base mr-1.5">playlist_add</span>
          <span>Select Favorites</span>
        </ui-btn>
      </div>
    </div>

    <!-- Batch Add / Manage Favorites Modal -->
    <modals-modal v-model="showAddModal" :width="500" max-width="95%">
      <div class="w-full max-h-[80vh] flex flex-col rounded-2xl bg-bg border border-border shadow-2xl overflow-hidden">
        <!-- Modal Header -->
        <div class="px-4 py-3 border-b border-border flex items-center justify-between flex-shrink-0">
          <div class="flex items-center space-x-2">
            <span class="material-symbols text-amber-400 fill text-xl">star</span>
            <h3 class="text-sm font-bold text-fg">Manage Favorite Podcasts</h3>
          </div>
          <button
            type="button"
            class="w-7 h-7 rounded-lg text-fg-muted hover:text-fg flex items-center justify-center"
            @click="showAddModal = false"
          >
            <span class="material-symbols text-base">close</span>
          </button>
        </div>

        <!-- Modal Search -->
        <div class="p-3 border-b border-border/50 bg-secondary/50 flex-shrink-0">
          <div class="relative">
            <span class="material-symbols absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-muted text-base">search</span>
            <input
              v-model="modalSearchQuery"
              type="text"
              placeholder="Search all podcasts..."
              class="w-full bg-primary border border-border rounded-lg pl-8 pr-3 py-1.5 text-xs text-fg placeholder-fg-muted focus:outline-none focus:border-accent"
            />
          </div>
        </div>

        <!-- Modal Podcast List -->
        <div class="flex-1 overflow-y-auto p-2 divide-y divide-border/30">
          <div
            v-for="item in filteredAllPodcasts"
            :key="item.id"
            class="py-2 px-2.5 rounded-xl flex items-center justify-between hover:bg-secondary/70 transition-colors"
          >
            <div class="flex items-center space-x-3 min-w-0 pr-3">
              <!-- Thumbnail -->
              <div class="w-11 h-11 rounded-lg overflow-hidden bg-secondary flex-shrink-0 border border-border/40">
                <img :src="getCoverSrc(item)" class="w-full h-full object-cover" loading="lazy" />
              </div>
              <!-- Meta -->
              <div class="min-w-0">
                <p class="text-xs font-semibold text-fg truncate">{{ getItemTitle(item) }}</p>
                <p class="text-xxs text-fg-muted truncate">{{ getItemAuthor(item) || 'Podcast' }}</p>
              </div>
            </div>

            <!-- Star Toggle Button -->
            <button
              type="button"
              class="w-9 h-9 rounded-xl flex items-center justify-center transition-all flex-shrink-0"
              :class="isItemFavorite(item.id) ? 'bg-amber-400/20 text-amber-400 border border-amber-400/40' : 'bg-secondary text-fg-muted hover:text-fg hover:bg-primary'"
              @click="toggleFavoriteItem(item)"
            >
              <span class="material-symbols text-xl" :class="{ 'fill': isItemFavorite(item.id) }">star</span>
            </button>
          </div>

          <div v-if="!filteredAllPodcasts.length" class="py-8 text-center text-xs text-fg-muted">
            No podcasts found matching your search.
          </div>
        </div>

        <!-- Modal Footer -->
        <div class="px-4 py-3 border-t border-border bg-secondary/40 flex items-center justify-between flex-shrink-0">
          <p class="text-xxs text-fg-muted">{{ favoriteIds.length }} podcast(s) favorited</p>
          <ui-btn small color="primary" @click="showAddModal = false">Done</ui-btn>
        </div>
      </div>
    </modals-modal>
  </div>
</template>

<script>
import draggable from 'vuedraggable'

export default {
  name: 'PodcastFavorites',
  components: {
    draggable
  },
  data() {
    return {
      isLoading: false,
      isReordering: false,
      isPersistingLocally: false,
      showSearch: false,
      searchQuery: '',
      showAddModal: false,
      modalSearchQuery: '',
      allLibraryPodcasts: [],
      favoriteItems: [],
      favoriteIds: [],
      subscribedPodcastIds: [],
      populatingFromSubs: false,
      longPressTimer: null
    }
  },
  computed: {
    user() {
      return this.$store.state.user.user
    },
    currentLibraryId() {
      return this.$store.state.libraries.currentLibraryId
    },
    serverAddress() {
      return this.$store.getters['user/getServerAddress']
    },
    dragOptions() {
      return {
        animation: 200,
        ghostClass: 'opacity-40',
        chosenClass: 'scale-105',
        dragClass: 'shadow-2xl',
        draggable: '.podcast-tile',
        delay: 50,
        delayOnTouchOnly: true,
        touchStartThreshold: 5
      }
    },
    filteredItems() {
      if (!this.searchQuery.trim()) return this.favoriteItems
      const q = this.searchQuery.trim().toLowerCase()
      return this.favoriteItems.filter((item) => {
        const title = this.getItemTitle(item).toLowerCase()
        const author = this.getItemAuthor(item).toLowerCase()
        return title.includes(q) || author.includes(q)
      })
    },
    displayedItems() {
      return this.filteredItems
    },
    filteredAllPodcasts() {
      if (!this.modalSearchQuery.trim()) return this.allLibraryPodcasts
      const q = this.modalSearchQuery.trim().toLowerCase()
      return this.allLibraryPodcasts.filter((item) => {
        const title = this.getItemTitle(item).toLowerCase()
        const author = this.getItemAuthor(item).toLowerCase()
        return title.includes(q) || author.includes(q)
      })
    }
  },
  methods: {
    getItemTitle(item) {
      return item.media?.metadata?.title || item.title || 'Untitled'
    },
    getItemAuthor(item) {
      return item.media?.metadata?.author || item.author || ''
    },
    getCoverSrc(item) {
      if (item.coverContentUrl) return item.coverContentUrl
      return this.$store.getters['globals/getLibraryItemCoverSrc'](item, '/book_placeholder.jpg', false)
    },
    onImageError(event, item) {
      if (event.target) {
        event.target.src = '/book_placeholder.jpg'
      }
    },
    getUnplayedBadge(item) {
      const count = item.numEpisodesIncomplete
      if (!count || count <= 0) return null
      return count > 99 ? '99' : String(count)
    },
    isItemFavorite(itemId) {
      return this.favoriteIds.includes(itemId)
    },
    toggleSearch() {
      this.showSearch = !this.showSearch
      if (this.showSearch) {
        this.$nextTick(() => {
          this.$refs.searchInput?.focus()
        })
      } else {
        this.searchQuery = ''
      }
    },
    async toggleReorder() {
      await this.$hapticsImpact()
      this.isReordering = !this.isReordering
      if (this.isReordering) {
        this.showSearch = false
        this.searchQuery = ''
      } else {
        await this.persistFavoritesOrder()
      }
    },
    openAddModal() {
      this.modalSearchQuery = ''
      this.showAddModal = true
    },
    onDragStart() {
      this.$hapticsImpact()
    },
    async onDragEnd() {
      await this.$hapticsImpact()
      await this.persistFavoritesOrder()
    },
    async persistFavoritesOrder() {
      if (!this.user?.id || !this.serverAddress) return
      const orderIds = this.favoriteItems.map((item) => item.id)
      this.favoriteIds = [...orderIds]
      this.isPersistingLocally = true
      try {
        await this.$localStore.setUserPodcastFavorites(this.user.id, this.serverAddress, orderIds)
        this.$eventBus.$emit('podcast-favorites-changed')
      } finally {
        this.$nextTick(() => {
          this.isPersistingLocally = false
        })
      }
    },
    onTileClick(item) {
      if (this.isReordering) return
      this.$router.push(`/item/${item.id}`)
    },
    async onTileLongPress(item) {
      await this.$hapticsImpact()
      this.showSearch = false
      this.searchQuery = ''
      this.isReordering = true
    },
    async removeFavorite(item) {
      await this.$hapticsImpact()
      this.favoriteItems = this.favoriteItems.filter((i) => i.id !== item.id)
      this.favoriteIds = this.favoriteIds.filter((id) => id !== item.id)
      await this.persistFavoritesOrder()
      this.$toast.info(`Removed "${this.getItemTitle(item)}" from Favorites`)
    },
    async toggleFavoriteItem(item) {
      await this.$hapticsImpact()
      if (!this.user?.id || !this.serverAddress) return
      const isFav = await this.$localStore.toggleUserPodcastFavorite(this.user.id, this.serverAddress, item.id)
      if (isFav) {
        this.favoriteIds.push(item.id)
        if (!this.favoriteItems.some((i) => i.id === item.id)) {
          this.favoriteItems.push(item)
        }
        this.$toast.success(`Added "${this.getItemTitle(item)}" to Favorites`)
      } else {
        this.favoriteIds = this.favoriteIds.filter((id) => id !== item.id)
        this.favoriteItems = this.favoriteItems.filter((i) => i.id !== item.id)
        this.$toast.info(`Removed "${this.getItemTitle(item)}" from Favorites`)
      }
      this.$eventBus.$emit('podcast-favorites-changed')
    },
    async addFromSubscriptions() {
      if (!this.user?.id || !this.serverAddress || !this.subscribedPodcastIds.length) return
      this.populatingFromSubs = true
      await this.$hapticsImpact()
      const newOrder = [...this.favoriteIds]
      this.subscribedPodcastIds.forEach((id) => {
        if (!newOrder.includes(id)) {
          newOrder.push(id)
        }
      })
      await this.$localStore.setUserPodcastFavorites(this.user.id, this.serverAddress, newOrder)
      this.$eventBus.$emit('podcast-favorites-changed')
      await this.loadFavorites()
      this.populatingFromSubs = false
      this.$toast.success(`Added ${this.subscribedPodcastIds.length} subscribed shows to Favorites`)
    },
    async loadFavorites() {
      if (!this.currentLibraryId) return
      this.isLoading = true

      // 1. Fetch library items from server
      const payload = await this.$nativeHttp
        .get(`/api/libraries/${this.currentLibraryId}/items?limit=1000&minified=1&include=rssfeed,numEpisodesIncomplete`)
        .catch((error) => {
          console.error('[Favorites] Failed to fetch library items', error)
          return null
        })

      let serverItems = payload?.results || []

      // 2. Fetch local SQLite podcast items
      const localItems = (await this.$db.getLocalLibraryItems('podcast')) || []

      // Merge local items with server items
      const itemMap = new Map()
      serverItems.forEach((it) => itemMap.set(it.id, it))
      localItems.forEach((lit) => {
        if (!itemMap.has(lit.id)) {
          itemMap.set(lit.id, lit)
        }
      })
      this.allLibraryPodcasts = Array.from(itemMap.values())

      // 3. Load user favorites IDs from local store
      if (this.user?.id && this.serverAddress) {
        const savedIds = (await this.$localStore.getUserPodcastFavorites(this.user.id, this.serverAddress)) || []
        this.favoriteIds = savedIds

        // Load subscriptions to facilitate seeding
        const subs = (await this.$localStore.getUserPodcastSubscriptions(this.user.id, this.serverAddress)) || []
        this.subscribedPodcastIds = subs

        // Reconstruct items in the saved custom order
        const ordered = []
        savedIds.forEach((id) => {
          const item = itemMap.get(id)
          if (item) {
            ordered.push(item)
          }
        })
        this.favoriteItems = ordered
      }

      this.isLoading = false
    },
    libraryChanged(libraryId) {
      if (this.$store.getters['libraries/getCurrentLibraryMediaType'] === 'podcast') {
        this.loadFavorites()
      } else {
        this.$router.replace('/bookshelf')
      }
    },
    itemUpdated(item) {
      if (!item) return
      const idx = this.favoriteItems.findIndex((i) => i.id === item.id)
      if (idx > -1) {
        this.$set(this.favoriteItems, idx, { ...this.favoriteItems[idx], ...item })
      }
    }
  },
  mounted() {
    this.loadFavorites()
    this.onFavoritesChanged = () => {
      if (this.isPersistingLocally || this.isReordering) return
      this.loadFavorites()
    }
    this.$eventBus.$on('library-changed', this.libraryChanged)
    this.$eventBus.$on('podcast-favorites-changed', this.onFavoritesChanged)
    this.$eventBus.$on('podcast-subscription-changed', this.loadFavorites)
    if (this.$socket) {
      this.$socket.$on('item_updated', this.itemUpdated)
    }
  },
  beforeDestroy() {
    this.$eventBus.$off('library-changed', this.libraryChanged)
    this.$eventBus.$off('podcast-favorites-changed', this.onFavoritesChanged)
    this.$eventBus.$off('podcast-subscription-changed', this.loadFavorites)
    if (this.$socket) {
      this.$socket.$off('item_updated', this.itemUpdated)
    }
  }
}
</script>

<style scoped>
@keyframes subtle-wobble {
  0% { transform: rotate(0deg); }
  25% { transform: rotate(-0.8deg); }
  75% { transform: rotate(0.8deg); }
  100% { transform: rotate(0deg); }
}
.animate-subtle-wobble {
  animation: subtle-wobble 0.35s infinite ease-in-out;
}
</style>
