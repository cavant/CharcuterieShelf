<template>
  <modals-modal v-model="show" :width="500" max-width="95%" :persistent="isDownloading">
    <div class="w-full rounded-2xl bg-bg border border-border p-5 shadow-2xl text-fg">
      <!-- Modal Header -->
      <div class="flex items-center justify-between pb-3 border-b border-border">
        <div class="flex items-center space-x-3">
          <div class="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center text-accent">
            <span class="material-symbols text-2xl">system_update</span>
          </div>
          <div>
            <h3 class="text-base font-bold text-fg leading-tight">Update Available</h3>
            <p class="text-xs text-fg-muted">
              CharcuterieShelf <span class="font-mono text-accent font-semibold">{{ releaseTag }}</span>
            </p>
          </div>
        </div>
        <button
          v-if="!isDownloading"
          type="button"
          class="p-1 rounded-lg text-fg-muted hover:text-fg hover:bg-secondary transition-colors"
          @click="show = false"
        >
          <span class="material-symbols text-xl">close</span>
        </button>
      </div>

      <!-- Content -->
      <div class="py-4 space-y-4 max-h-[60vh] overflow-y-auto pr-1">
        <!-- Version comparison card -->
        <div class="bg-primary/40 rounded-xl p-3.5 border border-border/50 flex items-center justify-between">
          <div>
            <p class="text-2xs text-fg-muted uppercase font-semibold">Installed Version</p>
            <p class="text-xs font-mono text-fg font-semibold">{{ currentVersion }}</p>
          </div>
          <div class="flex items-center space-x-2 text-accent px-2">
            <span class="material-symbols text-sm">arrow_forward</span>
          </div>
          <div class="text-right">
            <p class="text-2xs text-fg-muted uppercase font-semibold">Latest Release</p>
            <p class="text-xs font-mono text-accent font-bold">{{ releaseTag }}</p>
          </div>
        </div>

        <!-- Release Notes / Changelog -->
        <div v-if="releaseNotes" class="bg-primary/30 rounded-xl p-3.5 border border-border/40">
          <div class="flex items-center justify-between mb-2">
            <p class="text-xs font-bold text-fg flex items-center gap-1.5">
              <span class="material-symbols text-sm text-accent">article</span>
              What's New in {{ releaseTag }}
            </p>
            <span v-if="releaseSizeFormatted" class="text-2xs text-fg-muted font-mono">{{ releaseSizeFormatted }}</span>
          </div>
          <div class="text-xs text-fg/80 leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap font-sans bg-bg/60 p-3 rounded-lg border border-border/30 select-text">
            {{ releaseNotes }}
          </div>
        </div>

        <!-- Unknown Sources Permission Warning (if needed) -->
        <div v-if="!canInstall && !isDownloading" class="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3.5 text-xs">
          <div class="flex items-center space-x-2 text-amber-400 font-bold mb-1">
            <span class="material-symbols text-sm">security</span>
            <span>Install Permission Required</span>
          </div>
          <p class="text-fg-muted text-2xs mb-2 leading-relaxed">
            Android requires permission to install apps from CharcuterieShelf. Please enable "Install unknown apps" in system settings.
          </p>
          <button
            type="button"
            class="px-3 py-1.5 rounded-lg bg-amber-500 text-black font-semibold text-2xs hover:brightness-105 active:scale-95 transition-transform"
            @click="openPermissionSettings"
          >
            Open Permission Settings
          </button>
        </div>

        <!-- Download Progress Area -->
        <div v-if="isDownloading" class="bg-primary/40 rounded-xl p-4 border border-border/50 space-y-2.5">
          <div class="flex items-center justify-between text-xs">
            <span class="font-semibold text-fg flex items-center gap-1.5">
              <span class="material-symbols animate-spin text-accent text-sm">progress_activity</span>
              Downloading Update...
            </span>
            <span class="font-mono font-bold text-accent">{{ downloadProgress }}%</span>
          </div>
          <div class="w-full bg-bg rounded-full h-2.5 overflow-hidden border border-border/40">
            <div
              class="bg-accent h-full rounded-full transition-all duration-200"
              :style="{ width: `${downloadProgress}%` }"
            />
          </div>
          <p class="text-2xs text-fg-muted text-center">
            The Android package installer will prompt automatically once the download finishes.
          </p>
        </div>

        <!-- Error Message -->
        <div v-if="errorMessage" class="bg-error/10 border border-error/30 rounded-xl p-3 text-xs text-error">
          <div class="flex items-center space-x-1.5 font-bold mb-0.5">
            <span class="material-symbols text-sm">error</span>
            <span>Update Failed</span>
          </div>
          <p class="text-2xs opacity-90">{{ errorMessage }}</p>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex items-center justify-between pt-3 border-t border-border">
        <button
          type="button"
          class="px-3 py-2 rounded-lg bg-secondary text-fg-muted hover:text-fg text-xs font-medium transition-colors"
          :disabled="isDownloading"
          @click="openGitHub"
        >
          View on GitHub
        </button>

        <div class="flex items-center space-x-2">
          <button
            v-if="!isDownloading"
            type="button"
            class="px-3.5 py-2 rounded-lg bg-secondary text-fg text-xs font-semibold hover:bg-bg-hover transition-colors"
            @click="dismissModal"
          >
            Later
          </button>
          <button
            type="button"
            class="px-5 py-2 rounded-lg bg-accent text-black text-xs font-bold hover:brightness-105 active:scale-95 transition-all flex items-center gap-1.5 shadow-md"
            :disabled="isDownloading || !hasApk"
            @click="startDownloadAndInstall"
          >
            <span v-if="!isDownloading" class="material-symbols text-sm">download</span>
            <span v-else class="material-symbols animate-spin text-sm">progress_activity</span>
            <span>{{ isDownloading ? 'Downloading...' : 'Download & Install' }}</span>
          </button>
        </div>
      </div>
    </div>
  </modals-modal>
</template>

<script>
export default {
  name: 'AppUpdateModal',
  data() {
    return {
      show: false,
      releaseData: null,
      canInstall: true,
      errorMessage: null,
      dismissedForSession: false
    }
  },
  computed: {
    currentVersion() {
      return this.$appUpdater?.currentVersion || this.$config.version || '0.14.2-beta'
    },
    latestRelease() {
      return this.releaseData || this.$appUpdater?.latestRelease || null
    },
    releaseTag() {
      return this.latestRelease?.tagName || 'Latest'
    },
    releaseNotes() {
      return this.latestRelease?.body?.trim() || ''
    },
    releaseSizeFormatted() {
      const size = this.latestRelease?.apkSize
      return size && this.$bytesPretty ? this.$bytesPretty(size) : ''
    },
    hasApk() {
      return !!this.latestRelease?.apkUrl
    },
    isDownloading() {
      return this.$appUpdater?.isDownloading || false
    },
    downloadProgress() {
      return this.$appUpdater?.downloadProgress || 0
    }
  },
  watch: {
    show(val) {
      if (val) {
        this.errorMessage = null
        this.checkInstallPermission()
      }
    }
  },
  methods: {
    async checkInstallPermission() {
      try {
        if (this.$appUpdater?.canRequestPackageInstalls) {
          this.canInstall = await this.$appUpdater.canRequestPackageInstalls()
        }
      } catch (e) {
        this.canInstall = true
      }
    },
    async openPermissionSettings() {
      try {
        await this.$appUpdater?.openInstallPermissionSettings()
      } catch (e) {
        console.error('Failed to open permission settings', e)
      }
    },
    async startDownloadAndInstall() {
      if (!this.hasApk) return
      this.errorMessage = null

      try {
        await this.checkInstallPermission()
        if (!this.canInstall) {
          await this.openPermissionSettings()
          return
        }

        await this.$appUpdater.downloadAndInstall()
      } catch (err) {
        console.error('[AppUpdateModal] downloadAndInstall failed:', err)
        this.errorMessage = err?.message || 'Failed to download and install update. Please try again or download directly from GitHub.'
      }
    },
    openGitHub() {
      if (this.$appUpdater?.openReleaseInBrowser) {
        this.$appUpdater.openReleaseInBrowser()
      }
    },
    dismissModal() {
      this.dismissedForSession = true
      this.show = false
    }
  },
  mounted() {
    this.$eventBus.$on('open-app-update-modal', (release) => {
      if (release) this.releaseData = release
      this.show = true
    })

    this.$eventBus.$on('app-update-available', (release) => {
      this.releaseData = release
      if (!this.dismissedForSession) {
        this.show = true
      }
    })
  },
  beforeDestroy() {
    this.$eventBus.$off('open-app-update-modal')
    this.$eventBus.$off('app-update-available')
  }
}
</script>
