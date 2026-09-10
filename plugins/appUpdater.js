import Vue from 'vue'
import { AbsAppUpdater } from '@/plugins/capacitor'
import { Browser } from '@capacitor/browser'
import pkg from '@/package.json'

import { parseSemver, isNewerVersion } from '@/utils/semverUtils'

export default (context, inject) => {
  const { app, $config } = context
  const state = Vue.observable({
    currentVersion: $config?.version || app?.$config?.version || pkg.version || '0.14.8-beta',
    isChecking: false,
    updateAvailable: false,
    latestRelease: null,
    downloadProgress: 0,
    isDownloading: false,
    downloadError: null
  })

  let progressListener = null

  const updater = {
    get state() {
      return state
    },
    get currentVersion() {
      return state.currentVersion
    },
    get updateAvailable() {
      return state.updateAvailable
    },
    get latestRelease() {
      return state.latestRelease
    },
    get isChecking() {
      return state.isChecking
    },
    get isDownloading() {
      return state.isDownloading
    },
    get downloadProgress() {
      return state.downloadProgress
    },
    get downloadError() {
      return state.downloadError
    },

    async checkForUpdate(isManual = false) {
      if (state.isChecking) return { updateAvailable: state.updateAvailable, latestRelease: state.latestRelease }
      state.isChecking = true
      state.downloadError = null

      try {
        console.log('[AppUpdater] Checking for updates from GitHub (Current:', state.currentVersion, ')...')
        const response = await fetch('https://api.github.com/repos/cavant/CharcuterieShelf/releases', {
          headers: {
            Accept: 'application/vnd.github+json',
            'User-Agent': 'CharcuterieShelf-App'
          }
        })

        if (!response.ok) {
          throw new Error(`GitHub API error: ${response.status} ${response.statusText}`)
        }

        const releases = await response.json()
        const validReleases = releases.filter((r) => !r.draft)
        if (!validReleases.length) {
          console.log('[AppUpdater] No valid releases found.')
          state.updateAvailable = false
          return { updateAvailable: false }
        }

        const newest = validReleases[0]
        const apkAsset = newest.assets?.find((a) => a.name.endsWith('.apk'))
        const isNewer = isNewerVersion(state.currentVersion, newest.tag_name)

        console.log(`[AppUpdater] Latest: ${newest.tag_name} vs Current: ${state.currentVersion} => Is newer: ${isNewer}`)

        if (isNewer && apkAsset) {
          state.updateAvailable = true
          state.latestRelease = {
            tagName: newest.tag_name,
            name: newest.name || newest.tag_name,
            body: newest.body || '',
            publishedAt: newest.published_at,
            htmlUrl: newest.html_url,
            apkUrl: apkAsset.browser_download_url,
            apkName: apkAsset.name,
            apkSize: apkAsset.size
          }

          const bus = app.$eventBus || Vue.prototype.$eventBus
          bus?.$emit('app-update-available', state.latestRelease)
          return { updateAvailable: true, latestRelease: state.latestRelease }
        } else {
          state.updateAvailable = false
          return { updateAvailable: false, latestRelease: newest }
        }
      } catch (e) {
        console.error('[AppUpdater] Failed to check for updates', e)
        state.downloadError = e.message
        return { updateAvailable: false, error: e.message }
      } finally {
        state.isChecking = false
      }
    },

    async canRequestPackageInstalls() {
      try {
        const res = await AbsAppUpdater.canRequestPackageInstalls()
        return res?.canInstall ?? true
      } catch (e) {
        console.warn('[AppUpdater] canRequestPackageInstalls failed', e)
        return true
      }
    },

    async openInstallPermissionSettings() {
      try {
        await AbsAppUpdater.openInstallPermissionSettings()
      } catch (e) {
        console.error('[AppUpdater] Failed to open install permission settings', e)
      }
    },

    async downloadAndInstall(onProgressCallback) {
      if (!state.latestRelease?.apkUrl) {
        throw new Error('No APK download URL available')
      }

      state.isDownloading = true
      state.downloadProgress = 0
      state.downloadError = null

      try {
        // Remove previous listener if any
        if (progressListener) {
          await progressListener.remove()
          progressListener = null
        }

        progressListener = await AbsAppUpdater.addListener('downloadProgress', (data) => {
          state.downloadProgress = data.progress || 0
          if (onProgressCallback) {
            onProgressCallback(data)
          }
        })

        console.log('[AppUpdater] Starting download and install of', state.latestRelease.apkUrl)
        const result = await AbsAppUpdater.downloadAndInstall({
          url: state.latestRelease.apkUrl
        })

        console.log('[AppUpdater] downloadAndInstall completed', JSON.stringify(result))
        return result
      } catch (e) {
        console.error('[AppUpdater] Download and install error', e)
        state.downloadError = e.message || 'Failed to download update'
        throw e
      } finally {
        state.isDownloading = false
        if (progressListener) {
          await progressListener.remove()
          progressListener = null
        }
      }
    },

    async openReleaseInBrowser() {
      const url = state.latestRelease?.htmlUrl || 'https://github.com/cavant/CharcuterieShelf/releases/latest'
      await Browser.open({ url })
    }
  }

  inject('appUpdater', updater)
}
