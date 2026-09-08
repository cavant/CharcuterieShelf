<template>
  <div class="w-full h-full p-4 overflow-y-auto">
    <!-- Active Connection Status -->
    <div v-if="hasLocalConfig" class="mb-4 p-3 bg-primary rounded-lg border border-fg/10">
      <div class="flex items-center justify-between">
        <span class="text-xs text-fg-muted font-semibold uppercase tracking-wider">{{ $strings.LabelConnectionMode || 'Connection Mode' }}</span>
        <div v-if="isConnectedViaLocal" class="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-xs bg-success/20 text-success font-medium">
          <span class="material-symbols text-xs">lan</span>
          <span>{{ $strings.LabelConnectedLocal || 'Connected via LAN' }}</span>
        </div>
        <div v-else class="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-xs bg-accent/20 text-accent font-medium">
          <span class="material-symbols text-xs">cloud</span>
          <span>{{ $strings.LabelConnectedRemote || 'Connected via Remote' }}</span>
        </div>
      </div>
      <div class="mt-2 text-xs text-fg-muted space-y-1">
        <div v-if="remoteAddress" class="flex items-center justify-between">
          <span>{{ $strings.LabelRemoteAddress || 'Remote' }}:</span>
          <span class="text-fg font-mono truncate max-w-[200px]">{{ remoteAddress }}</span>
        </div>
        <div v-if="localAddress" class="flex items-center justify-between">
          <span>{{ $strings.LabelLocalAddress || 'Local' }}:</span>
          <span class="text-fg font-mono truncate max-w-[200px]">{{ localAddress }}</span>
        </div>
      </div>
    </div>

    <ui-text-input-with-label :value="serverAddress" :label="$strings.LabelHost" disabled class="my-2" />

    <ui-text-input-with-label :value="username" :label="$strings.LabelUsername" disabled class="my-2" />

    <div v-if="serverVersion" class="text-sm text-fg">
      <p>Server version: v{{ serverVersion }}</p>
    </div>

    <div class="mt-4 flex flex-col space-y-3">
      <ui-btn class="flex items-center justify-center space-x-2" @click="showEditModal = true">
        <span class="material-symbols text-base">settings_ethernet</span>
        <span>{{ $strings.ButtonEditConnection || 'Configure Local & Remote Connection' }}</span>
      </ui-btn>

      <ui-btn color="primary flex items-center justify-between gap-2 ml-auto text-base mt-4" @click="logout">
        {{ $strings.ButtonSwitchServerUser }}
        <span class="material-symbols" style="font-size: 1.1rem">logout</span>
      </ui-btn>
    </div>

    <div class="flex justify-center items-center my-4 left-0 right-0 bottom-0 absolute">
      <p class="text-sm text-fg">{{ $strings.MessageReportBugsAndContribute }} <a class="underline" href="https://github.com/cavant/CharcuterieShelf" target="_blank">GitHub</a></p>
      <a href="https://github.com/cavant/CharcuterieShelf" target="_blank" class="text-fg hover:scale-150 hover:rotate-6 transform duration-500 ml-2">
        <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" width="24" height="24" viewBox="0 0 24 24">
          <path
            d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"
          />
        </svg>
      </a>
    </div>

    <modals-edit-server-connection-modal v-model="showEditModal" :server-connection-config="serverConnectionConfig" @updated="onConnectionUpdated" />
  </div>
</template>

<script>
export default {
  asyncData({ redirect, store }) {
    if (!store.state.socketConnected) {
      return redirect('/connect')
    }
    return {}
  },
  data() {
    return {
      showEditModal: false
    }
  },
  computed: {
    username() {
      if (!this.user) return ''
      return this.user.username
    },
    user() {
      return this.$store.state.user.user
    },
    serverConnectionConfig() {
      return this.$store.state.user.serverConnectionConfig || {}
    },
    serverAddress() {
      return this.serverConnectionConfig.address
    },
    serverVersion() {
      // Saved in server connection config after 0.9.81
      return this.serverConnectionConfig.version
    },
    hasLocalConfig() {
      return !!this.serverConnectionConfig.localAddress
    },
    isConnectedViaLocal() {
      return this.$store.getters['user/getIsConnectedViaLocal']
    },
    remoteAddress() {
      return this.$store.getters['user/getRemoteAddress']
    },
    localAddress() {
      return this.$store.getters['user/getLocalAddress']
    }
  },
  methods: {
    async logout() {
      await this.$hapticsImpact()
      await this.$store.dispatch('user/logout')
      this.$router.push('/connect')
    },
    async onConnectionUpdated(updatedConfig) {
      console.log('[Account] Connection updated:', updatedConfig)
      await this.$store.dispatch('checkServerNetworkSwitch')
    }
  },
  mounted() {}
}
</script>
