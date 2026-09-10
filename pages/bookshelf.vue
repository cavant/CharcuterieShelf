<template>
  <div class="w-full h-full flex flex-col">
    <home-media-section-switcher />
    <home-bookshelf-nav-bar />
    <home-bookshelf-toolbar v-show="!hideToolbar" />
    <div id="bookshelf-wrapper" class="flex-1 min-h-0 overflow-y-auto overflow-x-hidden relative max-w-full">
      <nuxt-child />
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {}
  },
  computed: {
    hideToolbar() {
      return this.isHome || this.isLatest || this.isPodcastSearch || this.isFavorites
    },
    isHome() {
      return this.$route.name === 'bookshelf'
    },
    isLatest() {
      return this.$route.name === 'bookshelf-latest'
    },
    isPodcastSearch() {
      return this.$route.name === 'bookshelf-add-podcast'
    },
    isFavorites() {
      return this.$route.name === 'bookshelf-favorites'
    }
  }
}
</script>

<style>
#bookshelf-wrapper {
  max-width: 100vw;
}
</style>