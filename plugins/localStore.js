import { Preferences } from '@capacitor/preferences'

export class LocalStorage {
  constructor(vuexStore, preferencesAdapter = Preferences) {
    this.vuexStore = vuexStore
    this.preferences = preferencesAdapter
  }

  async setUserSettings(settings) {
    try {
      await this.preferences.set({ key: 'userSettings', value: JSON.stringify(settings) })
    } catch (error) {
      console.error('[LocalStorage] Failed to update user settings', error)
    }
  }

  async getUserSettings() {
    try {
      const settingsObj = await this.preferences.get({ key: 'userSettings' }) || {}
      return settingsObj.value ? JSON.parse(settingsObj.value) : null
    } catch (error) {
      console.error('[LocalStorage] Failed to get user settings', error)
      return null
    }
  }

  async setServerSettings(settings) {
    try {
      await this.preferences.set({ key: 'serverSettings', value: JSON.stringify(settings) })
      console.log('Saved server settings', JSON.stringify(settings))
    } catch (error) {
      console.error('[LocalStorage] Failed to update server settings', error)
    }
  }

  async getServerSettings() {
    try {
      var settingsObj = await this.preferences.get({ key: 'serverSettings' }) || {}
      return settingsObj.value ? JSON.parse(settingsObj.value) : null
    } catch (error) {
      console.error('[LocalStorage] Failed to get server settings', error)
      return null
    }
  }

  async setPlayerSettings(playerSettings) {
    try {
      await this.preferences.set({ key: 'playerSettings', value: JSON.stringify(playerSettings) })
    } catch (error) {
      console.error('[LocalStorage] Failed to set player settings', error)
    }
  }

  async getPlayerSettings() {
    try {
      const playerSettingsObj = await this.preferences.get({ key: 'playerSettings' }) || {}
      return playerSettingsObj.value ? JSON.parse(playerSettingsObj.value) : null
    } catch (error) {
      console.error('[LocalStorage] Failed to get player settings', error)
      return false
    }
  }

  async setBookshelfListView(useIt) {
    try {
      await this.preferences.set({ key: 'bookshelfListView', value: useIt ? '1' : '0' })
    } catch (error) {
      console.error('[LocalStorage] Failed to set bookshelf list view', error)
    }
  }

  async getBookshelfListView() {
    try {
      var obj = await this.preferences.get({ key: 'bookshelfListView' }) || {}
      return obj.value === '1'
    } catch (error) {
      console.error('[LocalStorage] Failed to get bookshelf list view', error)
      return false
    }
  }

  async setLastLibraryId(libraryId) {
    try {
      await this.preferences.set({ key: 'lastLibraryId', value: libraryId })
      console.log('[LocalStorage] Set Last Library Id', libraryId)
    } catch (error) {
      console.error('[LocalStorage] Failed to set last library id', error)
    }
  }

  async removeLastLibraryId() {
    try {
      await this.preferences.remove({ key: 'lastLibraryId' })
      console.log('[LocalStorage] Remove Last Library Id')
    } catch (error) {
      console.error('[LocalStorage] Failed to remove last library id', error)
    }
  }

  async getLastLibraryId() {
    try {
      var obj = await this.preferences.get({ key: 'lastLibraryId' }) || {}
      return obj.value || null
    } catch (error) {
      console.error('[LocalStorage] Failed to get last library id', error)
      return false
    }
  }

  async setTheme(theme) {
    try {
      await this.preferences.set({ key: 'theme', value: theme })
      console.log('[LocalStorage] Set theme', theme)
    } catch (error) {
      console.error('[LocalStorage] Failed to set theme', error)
    }
  }

  async getTheme() {
    try {
      var obj = await this.preferences.get({ key: 'theme' }) || {}
      return obj.value || null
    } catch (error) {
      console.error('[LocalStorage] Failed to get theme', error)
      return false
    }
  }

  async setCustomAccent(accent) {
    try {
      if (!accent) {
        await this.preferences.remove({ key: 'customAccent' })
      } else {
        await this.preferences.set({ key: 'customAccent', value: accent })
      }
      console.log('[LocalStorage] Set custom accent', accent)
    } catch (error) {
      console.error('[LocalStorage] Failed to set custom accent', error)
    }
  }

  async getCustomAccent() {
    try {
      var obj = await this.preferences.get({ key: 'customAccent' }) || {}
      return obj.value || null
    } catch (error) {
      console.error('[LocalStorage] Failed to get custom accent', error)
      return false
    }
  }

  async setLanguage(lang) {
    try {
      await this.preferences.set({ key: 'lang', value: lang })
      console.log('[LocalStorage] Set lang', lang)
    } catch (error) {
      console.error('[LocalStorage] Failed to set lang', error)
    }
  }

  async getLanguage() {
    try {
      var obj = await this.preferences.get({ key: 'lang' }) || {}
      return obj.value || null
    } catch (error) {
      console.error('[LocalStorage] Failed to get lang', error)
      return false
    }
  }

  async setPodcastSettings(libraryItemId, settings) {
    if (!libraryItemId) return
    try {
      await this.preferences.set({ key: `podcast_settings_${libraryItemId}`, value: JSON.stringify(settings) })
    } catch (error) {
      console.error('[LocalStorage] Failed to set podcast settings', error)
    }
  }

  async getPodcastSettings(libraryItemId) {
    if (!libraryItemId) return null
    try {
      var obj = await this.preferences.get({ key: `podcast_settings_${libraryItemId}` }) || {}
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
      const obj = await this.preferences.get({ key }) || {}
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
      const obj = await this.preferences.get({ key: this._subKey(userId, serverAddress) }) || {}
      return obj.value ? JSON.parse(obj.value) : null
    } catch (error) {
      console.error('[LocalStorage] Failed to get podcast subscriptions', error)
      return null
    }
  }

  async setUserPodcastSubscriptions(userId, serverAddress, itemIds) {
    if (!userId || !serverAddress) return
    try {
      await this.preferences.set({ key: this._subKey(userId, serverAddress), value: JSON.stringify(itemIds || []) })
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

  // ── Per-User Podcast Favorites Management ────────────────────────────
  // Each user on each server has their own ordered list of favorite podcasts.
  // Key format: podcast_favs_<serverAddress>_<userId>
  // Value: JSON array of library item IDs in custom user-specified order

  _favKey(userId, serverAddress) {
    const serverConfig = this.vuexStore?.state?.user?.serverConnectionConfig
    const stableId = serverConfig?.id || serverConfig?.remoteAddress || serverAddress || ''
    const addr = stableId.replace(/\/+$/, '').toLowerCase()
    return `podcast_favs_${addr}_${userId}`
  }

  async getUserPodcastFavorites(userId, serverAddress) {
    if (!userId || !serverAddress) return []
    try {
      const obj = await this.preferences.get({ key: this._favKey(userId, serverAddress) }) || {}
      return obj.value ? JSON.parse(obj.value) : []
    } catch (error) {
      console.error('[LocalStorage] Failed to get podcast favorites', error)
      return []
    }
  }

  async setUserPodcastFavorites(userId, serverAddress, itemIds) {
    if (!userId || !serverAddress) return
    try {
      await this.preferences.set({ key: this._favKey(userId, serverAddress), value: JSON.stringify(itemIds || []) })
    } catch (error) {
      console.error('[LocalStorage] Failed to set podcast favorites', error)
    }
  }

  async isUserPodcastFavorite(userId, serverAddress, itemId) {
    if (!userId || !serverAddress || !itemId) return false
    const favs = await this.getUserPodcastFavorites(userId, serverAddress)
    return favs.includes(itemId)
  }

  async toggleUserPodcastFavorite(userId, serverAddress, itemId) {
    if (!userId || !serverAddress || !itemId) return false
    const favs = await this.getUserPodcastFavorites(userId, serverAddress)
    const index = favs.indexOf(itemId)
    let isFav = false
    if (index > -1) {
      favs.splice(index, 1)
      isFav = false
    } else {
      favs.push(itemId)
      isFav = true
    }
    await this.setUserPodcastFavorites(userId, serverAddress, favs)
    return isFav
  }

  async addUserPodcastFavorite(userId, serverAddress, itemId) {
    if (!userId || !serverAddress || !itemId) return
    const favs = await this.getUserPodcastFavorites(userId, serverAddress)
    if (!favs.includes(itemId)) {
      favs.push(itemId)
      await this.setUserPodcastFavorites(userId, serverAddress, favs)
    }
  }

  async removeUserPodcastFavorite(userId, serverAddress, itemId) {
    if (!userId || !serverAddress || !itemId) return
    const favs = await this.getUserPodcastFavorites(userId, serverAddress)
    const filtered = favs.filter(id => id !== itemId)
    await this.setUserPodcastFavorites(userId, serverAddress, filtered)
  }
}

export default ({ app, store }, inject) => {
  inject('localStore', new LocalStorage(store))
}
