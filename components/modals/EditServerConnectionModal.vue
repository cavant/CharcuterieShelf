<template>
  <modals-modal v-model="show" :width="'90%'" :max-width="'480px'" height="auto">
    <template #outer>
      <div class="absolute top-5 left-4 z-40">
        <p class="text-white text-xl sm:text-2xl font-semibold truncate">{{ $strings.HeaderServerConnection || 'Server Connection' }}</p>
      </div>
    </template>
    <div class="w-full overflow-hidden flex items-center justify-center py-2" @click="show = false">
      <div ref="container" class="w-full rounded-lg bg-primary border border-white border-opacity-20 overflow-y-auto p-4 sm:p-6" style="max-height: 85vh" @click.stop>
        
        <!-- Active status badge -->
        <div v-if="serverConfig && serverConfig.id" class="mb-4 p-3 rounded-lg bg-white bg-opacity-5 flex items-center space-x-3">
          <span class="material-symbols text-2xl" :class="isConnectedViaLocal ? 'text-success' : 'text-accent'">{{ isConnectedViaLocal ? 'lan' : 'cloud' }}</span>
          <div class="flex-grow overflow-hidden">
            <p class="text-xs text-fg-muted uppercase font-bold tracking-wider">{{ $strings.LabelConnectionMode || 'Active Connection' }}</p>
            <p class="text-sm font-semibold truncate text-fg">{{ currentActiveAddress }}</p>
            <p class="text-xs" :class="isConnectedViaLocal ? 'text-success' : 'text-accent'">
              {{ isConnectedViaLocal ? ($strings.LabelConnectedLocal || 'Connected via LAN') : ($strings.LabelConnectedRemote || 'Connected via Remote') }}
            </p>
          </div>
        </div>

        <form @submit.prevent="saveConnectionSettings">
          <!-- Remote / Primary Server Address -->
          <div class="mb-4">
            <ui-text-input-with-label
              v-model="remoteAddress"
              :label="$strings.LabelRemoteAddress || 'Remote Server Address'"
              placeholder="https://audiobookshelf.example.com"
              type="url"
              class="w-full"
            />
            <div class="flex justify-end mt-1">
              <button type="button" class="text-xs text-accent hover:underline flex items-center space-x-1" :disabled="testingRemote" @click="testRemote">
                <span v-if="testingRemote" class="material-symbols animate-spin text-xs">progress_activity</span>
                <span>{{ testRemoteResult ? testRemoteResult : ($strings.ButtonTestRemote || 'Test Remote') }}</span>
              </button>
            </div>
          </div>

          <!-- Local Connection Toggle -->
          <div class="flex items-center justify-between py-2 border-t border-b border-white border-opacity-10 my-4">
            <div>
              <p class="text-sm font-medium text-fg">{{ $strings.LabelEnableLocalConnection || 'Local Network Connection (LAN)' }}</p>
              <p class="text-xs text-fg-muted">{{ $strings.LabelEnableLocalConnectionHelp || 'Use direct local IP on home network for faster downloads and streaming' }}</p>
            </div>
            <ui-toggle-switch v-model="enableLocal" />
          </div>

          <!-- Local Connection Fields -->
          <div v-show="enableLocal" class="space-y-4 mb-4 pt-1">
            <!-- Local Address -->
            <div>
              <ui-text-input-with-label
                v-model="localAddress"
                :label="$strings.LabelLocalAddress || 'Local Server Address (IP:Port)'"
                placeholder="http://192.168.1.100:13378"
                type="url"
                class="w-full"
              />
              <div class="flex justify-end mt-1">
                <button type="button" class="text-xs text-accent hover:underline flex items-center space-x-1" :disabled="testingLocal" @click="testLocal">
                  <span v-if="testingLocal" class="material-symbols animate-spin text-xs">progress_activity</span>
                  <span>{{ testLocalResult ? testLocalResult : ($strings.ButtonTestLocal || 'Test Local') }}</span>
                </button>
              </div>
            </div>

            <!-- Local Networks (SSIDs) -->
            <div>
              <ui-text-input-with-label
                v-model="localNetworks"
                :label="$strings.LabelLocalNetworks || 'Local Wi-Fi Networks (SSIDs)'"
                placeholder="Home-WiFi, Home-5G"
                class="w-full"
              />
              <p class="text-xs text-fg-muted mt-1 leading-normal">
                {{ $strings.LabelLocalNetworksHelp || 'Comma-separated list of Wi-Fi names (SSIDs). Local connection will only be used when connected to these Wi-Fi networks.' }}
              </p>
              <div class="flex justify-start mt-2">
                <ui-btn type="button" :padding-x="2" :padding-y="1" class="text-xs flex items-center space-x-1" @click="detectCurrentNetwork">
                  <span class="material-symbols text-sm">wifi_find</span>
                  <span>{{ $strings.ButtonDetectCurrentNetwork || 'Use Current Wi-Fi' }}</span>
                </ui-btn>
              </div>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="flex items-center justify-end space-x-3 mt-6 pt-4 border-t border-white border-opacity-10">
            <ui-btn type="button" color="secondary" @click="show = false">{{ $strings.ButtonCancel }}</ui-btn>
            <ui-btn type="submit" color="success" :loading="saving">{{ $strings.ButtonSave }}</ui-btn>
          </div>
        </form>

      </div>
    </div>
  </modals-modal>
</template>

<script>
export default {
  props: {
    value: Boolean,
    serverConnectionConfig: {
      type: Object,
      default: () => null
    }
  },
  data() {
    return {
      remoteAddress: '',
      enableLocal: false,
      localAddress: '',
      localNetworks: '',
      saving: false,
      testingRemote: false,
      testRemoteResult: null,
      testingLocal: false,
      testLocalResult: null
    }
  },
  watch: {
    show(val) {
      if (val) this.init()
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
    serverConfig() {
      return this.serverConnectionConfig || this.$store.state.user.serverConnectionConfig || null
    },
    currentActiveAddress() {
      return this.serverConfig?.address || this.remoteAddress || ''
    },
    isConnectedViaLocal() {
      if (!this.serverConfig?.localAddress) return false
      return this.serverConfig.address === this.serverConfig.localAddress
    }
  },
  methods: {
    init() {
      const config = this.serverConfig || {}
      this.remoteAddress = config.remoteAddress || config.address || ''
      this.localAddress = config.localAddress || ''
      this.localNetworks = config.localNetworks || ''
      this.enableLocal = !!config.localAddress
      this.testRemoteResult = null
      this.testLocalResult = null
    },
    async testRemote() {
      if (!this.remoteAddress) return
      this.testingRemote = true
      this.testRemoteResult = null
      const start = Date.now()
      const reachable = await this.$serverAddressResolver.pingAddress(this.remoteAddress, this.serverConfig?.customHeaders, 4000)
      this.testingRemote = false
      const elapsed = Date.now() - start
      this.testRemoteResult = reachable ? `✓ OK (${elapsed}ms)` : '✗ Failed'
    },
    async testLocal() {
      if (!this.localAddress) return
      this.testingLocal = true
      this.testLocalResult = null
      const start = Date.now()
      const reachable = await this.$serverAddressResolver.pingAddress(this.localAddress, this.serverConfig?.customHeaders, 2000)
      this.testingLocal = false
      const elapsed = Date.now() - start
      this.testLocalResult = reachable ? `✓ OK (${elapsed}ms)` : '✗ Unreachable'
    },
    async detectCurrentNetwork() {
      let info = null
      if (this.$db?.getNetworkInfo) {
        try {
          info = await this.$db.getNetworkInfo({ requestPermission: true })
        } catch (e) {
          console.warn('getNetworkInfo failed', e)
        }
      }
      if (!info && this.$serverAddressResolver) {
        info = await this.$serverAddressResolver.getCurrentNetworkInfo()
      }

      const currentSsid = info?.ssid || info?.wifiSSID
      if (currentSsid && currentSsid !== '<unknown ssid>') {
        const existing = this.localNetworks ? this.localNetworks.split(',').map((s) => s.trim()).filter(Boolean) : []
        if (!existing.includes(currentSsid)) {
          existing.push(currentSsid)
        }
        this.localNetworks = existing.join(', ')
        this.$toast.info(`Added Wi-Fi: ${currentSsid}`)
      } else {
        this.$toast.warning('Could not read Wi-Fi network name. Please ensure Location permission is granted or enter SSID manually.')
      }
    },
    async saveConnectionSettings() {
      if (!this.remoteAddress && !this.localAddress) {
        this.$toast.error('At least one server address must be provided')
        return
      }

      this.saving = true

      try {
        const cleanRemote = (this.remoteAddress || '').trim().replace(/\/$/, '')
        const cleanLocal = (this.localAddress || '').trim().replace(/\/$/, '')
        const cleanNetworks = (this.localNetworks || '').trim()

        const baseConfig = this.serverConfig || {}
        const updatedConfig = {
          ...baseConfig,
          remoteAddress: cleanRemote,
          localAddress: this.enableLocal && cleanLocal ? cleanLocal : null,
          localNetworks: this.enableLocal && cleanNetworks ? cleanNetworks : null
        }

        // Resolve active address immediately based on current network
        let activeAddress = cleanRemote
        if (this.enableLocal && cleanLocal && this.$serverAddressResolver) {
          const resolution = await this.$serverAddressResolver.resolve(updatedConfig)
          activeAddress = resolution.activeAddress || cleanRemote
        }
        updatedConfig.address = activeAddress
        updatedConfig.name = `${cleanRemote || activeAddress} (${updatedConfig.username || ''})`

        const savedConfig = await this.$db.setServerConnectionConfig(updatedConfig)

        // If currently connected server, update store and socket
        const currentId = this.$store.getters['user/getServerConnectionConfigId']
        if (currentId === baseConfig.id || !currentId) {
          this.$store.commit('user/setServerConnectionConfig', savedConfig || updatedConfig)
          if (this.$socket && updatedConfig.token) {
            this.$socket.connect(activeAddress, updatedConfig.token)
          }
        }

        this.$toast.success('Server connection settings updated')
        this.$emit('updated', savedConfig || updatedConfig)
        this.show = false
      } catch (err) {
        console.error('Failed to save connection settings', err)
        this.$toast.error('Failed to save connection settings')
      } finally {
        this.saving = false
      }
    }
  }
}
</script>
