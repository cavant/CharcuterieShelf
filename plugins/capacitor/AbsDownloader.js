import { registerPlugin, WebPlugin } from '@capacitor/core';

class AbsDownloaderWeb extends WebPlugin {
  constructor() {
    super()
  }
  async cancelDownloadItem({ id }) {
    return { success: true }
  }
  async retryDownloadItem({ id }) {
    return { success: true }
  }
  async clearFailedDownloads() {
    return { count: 0 }
  }
  async retryAllFailed() {
    return { count: 0 }
  }
  async cancelAllDownloads() {
    return { success: true }
  }
  async getDownloadQueue() {
    return { queue: [] }
  }
}

const AbsDownloader = registerPlugin('AbsDownloader', {
  web: () => new AbsDownloaderWeb()
})

export { AbsDownloader }