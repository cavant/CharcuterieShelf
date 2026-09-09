import { Preferences } from '@capacitor/preferences'

class LocalStorage {
  constructor(vuexStore) {
    this.vuexStore = vuexStore
  }

  async setUserSettings(settings) {
    try {
      await Preferences.set({ key: 'userSettings', value: JSON.stringify(settings) })
    } catch (error) {
      console.error('[LocalStorage] Failed to update user settings', error)
    }
  }

  async getUserSettings() {
    try {
      const settingsObj = await Preferences.get({ key: 'userSettings' }) || {}
      return settingsObj.value ? JSON.parse(settingsObj.value) : null
    } catch (error) {
      console.error('[LocalStorage] Failed to get user settings', error)
      return null
    }
  }

  async setServerSettings(settings) {
    try {
      await Preferences.set({ key: 'serverSettings', value: JSON.stringify(settings) })
      console.log('Saved server settings', JSON.stringify(settings))
    } catch (error) {
      console.error('[LocalStorage] Failed to update server settings', error)
    }
  }

  async getServerSettings() {
    try {
      var settingsObj = await Preferences.get({ key: 'serverSettings' }) || {}
      return settingsObj.value ? JSON.parse(settingsObj.value) : null
    } catch (error) {
      console.error('[LocalStorage] Failed to get server settings', error)
      return null
    }
  }

  async setPlayerSettings(playerSettings) {
    try {
      await Preferences.set({ key: 'playerSettings', value: JSON.stringify(playerSettings) })
    } catch (error) {
      console.error('[LocalStorage] Failed to set player settings', error)
    }
  }

  async getPlayerSettings() {
    try {
      const playerSettingsObj = await Preferences.get({ key: 'playerSettings' }) || {}
      return playerSettingsObj.value ? JSON.parse(playerSettingsObj.value) : null
    } catch (error) {
      console.error('[LocalStorage] Failed to get player settings', error)
      return false
    }
  }

  async setBookshelfListView(useIt) {
    try {
      await Preferences.set({ key: 'bookshelfListView', value: useIt ? '1' : '0' })
    } catch (error) {
      console.error('[LocalStorage] Failed to set bookshelf list view', error)
    }
  }

  async getBookshelfListView() {
    try {
      var obj = await Preferences.get({ key: 'bookshelfListView' }) || {}
      return obj.value === '1'
    } catch (error) {
      console.error('[LocalStorage] Failed to get bookshelf list view', error)
      return false
    }
  }

  async setLastLibraryId(libraryId) {
    try {
      await Preferences.set({ key: 'lastLibraryId', value: libraryId })
      console.log('[LocalStorage] Set Last Library Id', libraryId)
    } catch (error) {
      console.error('[LocalStorage] Failed to set last library id', error)
    }
  }

  async removeLastLibraryId() {
    try {
      await Preferences.remove({ key: 'lastLibraryId' })
      console.log('[LocalStorage] Remove Last Library Id')
    } catch (error) {
      console.error('[LocalStorage] Failed to remove last library id', error)
    }
  }

  async getLastLibraryId() {
    try {
      var obj = await Preferences.get({ key: 'lastLibraryId' }) || {}
      return obj.value || null
    } catch (error) {
      console.error('[LocalStorage] Failed to get last library id', error)
      return false
    }
  }

  async setTheme(theme) {
    try {
      await Preferences.set({ key: 'theme', value: theme })
      console.log('[LocalStorage] Set theme', theme)
    } catch (error) {
      console.error('[LocalStorage] Failed to set theme', error)
    }
  }

  async getTheme() {
    try {
      var obj = await Preferences.get({ key: 'theme' }) || {}
      return obj.value || null
    } catch (error) {
      console.error('[LocalStorage] Failed to get theme', error)
      return false
    }
  }

  async setLanguage(lang) {
    try {
      await Preferences.set({ key: 'lang', value: lang })
      console.log('[LocalStorage] Set lang', lang)
    } catch (error) {
      console.error('[LocalStorage] Failed to set lang', error)
    }
  }

  async getLanguage() {
    try {
      var obj = await Preferences.get({ key: 'lang' }) || {}
      return obj.value || null
    } catch (error) {
      console.error('[LocalStorage] Failed to get lang', error)
      return false
    }
  }

  async setPodcastSettings(libraryItemId, settings) {
    if (!libraryItemId) return
    try {
      await Preferences.set({ key: `podcast_settings_${libraryItemId}`, value: JSON.stringify(settings) })
    } catch (error) {
      console.error('[LocalStorage] Failed to set podcast settings', error)
    }
  }

  async getPodcastSettings(libraryItemId) {
    if (!libraryItemId) return null
    try {
      var obj = await Preferences.get({ key: `podcast_settings_${libraryItemId}` }) || {}
      return obj.value ? JSON.parse(obj.value) : null
    } catch (error) {
      console.error('[LocalStorage] Failed to get podcast settings', error)
      return null
    }
  }

  /**
   * Get preference value by key
   * 
   * @param {string} key 
   * @returns {Promise<string>}
   */
  async getPreferenceByKey(key) {
    try {
      const obj = await Preferences.get({ key }) || {}
      return obj.value || null
    } catch (error) {
      console.error(`[LocalStorage] Failed to get preference "${key}"`, error)
      return null
    }
  }

  // ── Per-User Podcast Subscription Management ──────────────────────────
  // Each user on each server has their own independent podcast subscription list.
  // Key format: podcast_subs_<serverAddress>_<userId>
  // Value: JSON array of library item IDs (strings)

  _subKey(userId, serverAddress) {
    const serverConfig = this.vuexStore?.state?.user?.serverConnectionConfig
    const stableId = serverConfig?.id || serverConfig?.remoteAddress || serverAddress || ''
    const addr = stableId.replace(/\/+$/, '').toLowerCase()
    return `podcast_subs_${addr}_${userId}`
  }

  async getUserPodcastSubscriptions(userId, serverAddress) {
    if (!userId || !serverAddress) return null
    try {
      const obj = await Preferences.get({ key: this._subKey(userId, serverAddress) }) || {}
      return obj.value ? JSON.parse(obj.value) : null
    } catch (error) {
      console.error('[LocalStorage] Failed to get podcast subscriptions', error)
      return null
    }
  }

  async setUserPodcastSubscriptions(userId, serverAddress, itemIds) {
    if (!userId || !serverAddress) return
    try {
      await Preferences.set({ key: this._subKey(userId, serverAddress), value: JSON.stringify(itemIds || []) })
    } catch (error) {
      console.error('[LocalStorage] Failed to set podcast subscriptions', error)
    }
  }

  async addUserPodcastSubscription(userId, serverAddress, itemId) {
    if (!userId || !serverAddress || !itemId) return
    const subs = (await this.getUserPodcastSubscriptions(userId, serverAddress)) || []
    if (!subs.includes(itemId)) {
      subs.push(itemId)
      await this.setUserPodcastSubscriptions(userId, serverAddress, subs)
    }
  }

  async removeUserPodcastSubscription(userId, serverAddress, itemId) {
    if (!userId || !serverAddress || !itemId) return
    const subs = (await this.getUserPodcastSubscriptions(userId, serverAddress)) || []
    const filtered = subs.filter(id => id !== itemId)
    await this.setUserPodcastSubscriptions(userId, serverAddress, filtered)
  }
}


export default ({ app, store }, inject) => {
  inject('localStore', new LocalStorage(store))
}
