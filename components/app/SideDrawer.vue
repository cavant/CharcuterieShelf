<template>
  <div class="fixed top-0 left-0 right-0 layout-wrapper w-full z-50 overflow-hidden pointer-events-none">
    <div class="absolute top-0 left-0 w-full h-full bg-black transition-opacity duration-200" :class="show ? 'bg-opacity-60 pointer-events-auto' : 'bg-opacity-0'" @click="clickBackground" />
    <div class="absolute top-0 right-0 w-64 h-full bg-bg transform transition-transform py-6 pointer-events-auto" :class="show ? '' : 'translate-x-64'" @click.stop>
      <div class="px-6 mb-4">
        <p v-if="user" class="text-base" v-html="$getString('HeaderWelcome', [username])" />
      </div>

      <div class="w-full overflow-y-auto">
        <template v-for="item in navItems">
          <button v-if="item.action" :key="item.text" :tabindex="show ? 0 : -1" class="w-full hover:bg-bg/60 flex items-center py-3 px-6 text-fg-muted" @click="clickAction(item.action)">
            <span class="material-symbols fill text-lg">{{ item.icon }}</span>
            <p class="pl-4">{{ item.text }}</p>
          </button>
          <nuxt-link v-else :to="item.to" :key="item.text" :tabindex="show ? 0 : -1" class="w-full hover:bg-bg/60 flex items-center py-3 px-6 text-fg" :class="currentRoutePath.startsWith(item.to) ? 'bg-bg-hover/50' : 'text-fg-muted'">
            <span class="material-symbols fill text-lg">{{ item.icon }}</span>
            <p class="pl-4">{{ item.text }}</p>
          </nuxt-link>
        </template>
      </div>
      <div class="absolute bottom-0 left-0 w-full py-6 px-6 text-fg">
        <div v-if="serverConnectionConfig" class="mb-4 flex flex-col items-center justify-center space-y-1">
          <div class="flex items-center space-x-1.5 max-w-full">
            <span v-if="serverConnectionConfig.localAddress" class="material-symbols text-xs flex-shrink-0" :class="isConnectedViaLocal ? 'text-success' : 'text-accent'">{{ isConnectedViaLocal ? 'lan' : 'cloud' }}</span>
            <p class="text-xs text-fg-muted truncate" style="word-break: break-word">{{ serverConnectionConfig.address }}</p>
          </div>
          <p v-if="serverSettings.version" class="text-2xs text-fg-muted/70">v{{ serverSettings.version }}</p>
        </div>

        <!-- Update Available Banner -->
        <button
          v-if="updateAvailable"
          class="w-full mb-3 py-2 px-3 rounded-lg bg-accent/20 border border-accent/40 text-accent text-xs font-bold flex items-center justify-between hover:bg-accent/30 active:scale-95 transition-all shadow-sm"
          @click="openAppUpdateModal"
        >
          <div class="flex items-center space-x-2">
            <span class="material-symbols text-base">system_update</span>
            <span>Update Available</span>
          </div>
          <span class="text-2xs bg-accent text-black font-extrabold px-1.5 py-0.5 rounded">
            {{ latestRelease ? latestRelease.tagName : 'NEW' }}
          </span>
        </button>

        <!-- Buy Me a Coffee Button -->
        <button class="w-full mb-3 py-1.5 px-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold flex items-center justify-center space-x-1.5 hover:bg-amber-500/20 active:scale-95 transition-all" @click="openBuyMeACoffee">
          <span>☕</span>
          <span>Buy Me a Coffee</span>
        </button>

        <div class="flex items-center">
          <div class="flex items-center space-x-1.5" :class="updateAvailable ? 'cursor-pointer' : ''" @click="updateAvailable ? openAppUpdateModal() : null">
            <p class="text-2xs font-semibold text-fg-muted">CharcuterieShelf v{{ $config.version }}</p>
            <span v-if="updateAvailable" class="flex h-2 w-2 relative">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
              <span class="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
            </span>
          </div>
          <div class="flex-grow" />
          <div v-if="user" class="flex items-center" @click="disconnect">
            <p class="text-xs pr-2">{{ $strings.ButtonDisconnect }}</p>
            <i class="material-symbols text-sm -mb-0.5">cloud_off</i>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import TouchEvent from '@/objects/TouchEvent'
import { Browser } from '@capacitor/browser'

export default {
  data() {
    return {
      touchEvent: null
    }
  },
  watch: {
    $route: {
      handler() {
        this.show = false
      }
    },
    show: {
      handler(newVal) {
        if (newVal) this.registerListener()
        else this.removeListener()
      }
    }
  },
  computed: {
    show: {
      get() {
        return this.$store.state.showSideDrawer
      },
      set(val) {
        this.$store.commit('setShowSideDrawer', val)
      }
    },
    user() {
      return this.$store.state.user.user
    },
    serverConnectionConfig() {
      return this.$store.state.user.serverConnectionConfig
    },
    serverSettings() {
      return this.$store.state.serverSettings || {}
    },
    username() {
      return this.user?.username || ''
    },
    userIsAdminOrUp() {
      return this.$store.getters['user/getIsAdminOrUp']
    },
    isConnectedViaLocal() {
      return this.$store.getters['user/getIsConnectedViaLocal']
    },
    updateAvailable() {
      return this.$appUpdater?.updateAvailable || false
    },
    latestRelease() {
      return this.$appUpdater?.latestRelease || null
    },
    navItems() {
      var items = [
        {
          icon: 'home',
          text: this.$strings.ButtonHome,
          to: '/bookshelf'
        }
      ]
      if (!this.serverConnectionConfig) {
        items = [
          {
            icon: 'cloud_off',
            text: this.$strings.ButtonConnectToServer,
            to: '/connect'
          }
        ].concat(items)
      } else {
        items.push({
          icon: 'person',
          text: this.$strings.HeaderAccount,
          to: '/account'
        })
        items.push({
          icon: 'equalizer',
          text: this.$strings.ButtonUserStats,
          to: '/stats'
        })
      }

      if (this.$platform !== 'ios') {
        items.push({
          icon: 'folder',
          iconOutlined: true,
          text: this.$strings.ButtonLocalMedia,
          to: '/localMedia/folders'
        })
      } else {
        items.push({
          icon: 'download',
          iconOutlined: false,
          text: this.$strings.HeaderDownloads,
          to: '/downloads'
        })
      }
      items.push({
        icon: 'settings',
        text: this.$strings.HeaderSettings,
        to: '/settings'
      })

      items.push({
        icon: 'bug_report',
        iconOutlined: true,
        text: this.$strings.ButtonLogs,
        to: '/logs'
      })

      if (this.serverConnectionConfig) {
        items.push({
          icon: 'language',
          text: this.$strings.ButtonGoToWebClient,
          action: 'openWebClient'
        })

        items.push({
          icon: 'login',
          text: this.$strings.ButtonSwitchServerUser,
          action: 'logout'
        })
      }

      return items
    },
    currentRoutePath() {
      return this.$route.path
    }
  },
  methods: {
    async clickAction(action) {
      await this.$hapticsImpact()
      if (action === 'logout') {
        await this.logout()
        this.$router.push('/connect')
      } else if (action === 'openWebClient') {
        this.show = false
        let path = `/library/${this.$store.state.libraries.currentLibraryId}`
        await this.$store.dispatch('user/openWebClient', path)
      }
    },
    clickBackground() {
      this.show = false
    },
    async openAppUpdateModal() {
      await this.$hapticsImpact()
      this.show = false
      this.$eventBus.$emit('open-app-update-modal', this.latestRelease)
    },
    async openBuyMeACoffee() {
      await this.$hapticsImpact()
      this.show = false
      try {
        await Browser.open({ url: 'https://buymeacoffee.com/themagicsalami' })
      } catch (e) {
        window.open('https://buymeacoffee.com/themagicsalami', '_blank')
      }
    },
    async logout() {
      await this.$store.dispatch('user/logout')
    },
    async disconnect() {
      await this.$hapticsImpact()
      await this.logout()

      // Redirect to home page
      if (this.$route.name !== 'bookshelf') {
        this.$router.replace('/bookshelf')
      }

      // If player is open and not playing locally, then close the player
      if (this.$store.getters['getIsPlayerOpen']) {
        this.$eventBus.$emit('close-stream')
      }

      // Close side drawer
      this.show = false
    },
    touchstart(e) {
      this.touchEvent = new TouchEvent(e)
    },
    touchend(e) {
      if (!this.touchEvent) return
      this.touchEvent.setEndEvent(e)
      if (this.touchEvent.isSwipeRight()) {
        this.show = false
      }
      this.touchEvent = null
    },
    registerListener() {
      document.addEventListener('touchstart', this.touchstart)
      document.addEventListener('touchend', this.touchend)
    },
    removeListener() {
      document.removeEventListener('touchstart', this.touchstart)
      document.removeEventListener('touchend', this.touchend)
    }
  },
  mounted() {},
  beforeDestroy() {
    this.show = false
  }
}
</script>
