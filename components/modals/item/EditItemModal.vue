<template>
  <modals-fullscreen-modal v-model="show">
    <div class="w-full h-full flex flex-col bg-bg text-white">
      <!-- Modal Header -->
      <div class="px-4 py-3 bg-primary border-b border-white/10 flex items-center justify-between flex-shrink-0">
        <div class="flex items-center space-x-3 min-w-0">
          <button class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 text-gray-300" @click="show = false">
            <span class="material-symbols text-2xl">arrow_back</span>
          </button>
          <div class="min-w-0">
            <h2 class="text-base font-semibold truncate">{{ title }}</h2>
            <p class="text-xs text-gray-400 truncate">{{ subtitle }}</p>
          </div>
        </div>

        <button class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 text-gray-300" @click="show = false">
          <span class="material-symbols text-2xl">close</span>
        </button>
      </div>

      <!-- Tab Navigation Bar -->
      <div class="bg-primary/60 border-b border-white/10 flex items-center px-2 overflow-x-auto flex-shrink-0">
        <button
          v-for="tab in availableTabs"
          :key="tab.id"
          class="flex items-center space-x-1 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider border-b-2 transition-colors whitespace-nowrap"
          :class="currentTab === tab.id ? 'border-yellow-400 text-yellow-400 bg-white/5' : 'border-transparent text-gray-400 hover:text-white'"
          @click="currentTab = tab.id"
        >
          <span class="material-symbols text-base">{{ tab.icon }}</span>
          <span>{{ tab.label }}</span>
        </button>
      </div>

      <!-- Tab Content Body -->
      <div class="flex-1 min-h-0 overflow-hidden relative">
        <component
          :is="activeTabComponent"
          :library-item="itemData"
          @updated="handleItemUpdated"
          @close="show = false"
        />
      </div>
    </div>
  </modals-fullscreen-modal>
</template>

<script>
import EditItemDetailsTab from './tabs/EditItemDetailsTab.vue'
import EditItemChaptersTab from './tabs/EditItemChaptersTab.vue'
import EditItemCoverTab from './tabs/EditItemCoverTab.vue'
import EditItemMatchTab from './tabs/EditItemMatchTab.vue'

export default {
  components: {
    EditItemDetailsTab,
    EditItemChaptersTab,
    EditItemCoverTab,
    EditItemMatchTab
  },
  props: {
    value: Boolean,
    libraryItem: {
      type: Object,
      default: () => ({})
    },
    initialTab: {
      type: String,
      default: 'details'
    }
  },
  data() {
    return {
      currentTab: 'details',
      itemData: null
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
    title() {
      return this.itemData?.media?.metadata?.title || 'Edit Book'
    },
    subtitle() {
      return this.itemData?.media?.metadata?.authorName || ''
    },
    availableTabs() {
      return [
        { id: 'details', label: this.$strings.HeaderDetails || 'Details', icon: 'edit_note' },
        { id: 'chapters', label: this.$strings.HeaderChapters || 'Chapters', icon: 'format_list_bulleted' },
        { id: 'cover', label: this.$strings.HeaderCover || 'Cover', icon: 'image' },
        { id: 'match', label: this.$strings.HeaderMatch || 'Match', icon: 'auto_fix_high' }
      ]
    },
    activeTabComponent() {
      switch (this.currentTab) {
        case 'chapters':
          return 'EditItemChaptersTab'
        case 'cover':
          return 'EditItemCoverTab'
        case 'match':
          return 'EditItemMatchTab'
        default:
          return 'EditItemDetailsTab'
      }
    }
  },
  watch: {
    value(val) {
      if (val) {
        this.currentTab = this.initialTab || 'details'
        this.fetchFreshItem()
      }
    },
    initialTab(tab) {
      if (tab) this.currentTab = tab
    },
    libraryItem: {
      immediate: true,
      handler(val) {
        if (val) this.itemData = { ...val }
      }
    }
  },
  methods: {
    async fetchFreshItem() {
      if (!this.libraryItem?.id) return
      try {
        const fullItem = await this.$nativeHttp.get(`/api/items/${this.libraryItem.id}?expanded=1`)
        if (fullItem) {
          this.itemData = fullItem
        }
      } catch (err) {
        console.warn('Failed to fetch expanded item data', err)
      }
    },
    handleItemUpdated(updatedItem) {
      if (updatedItem) {
        this.itemData = { ...this.itemData, ...updatedItem }
      } else {
        this.fetchFreshItem()
      }
      this.$emit('updated', this.itemData)
    }
  }
}
</script>
