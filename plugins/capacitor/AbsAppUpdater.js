import { registerPlugin, WebPlugin } from '@capacitor/core'
import { Browser } from '@capacitor/browser'

class AbsAppUpdaterWeb extends WebPlugin {
  async canRequestPackageInstalls() {
    return { canInstall: true }
  }

  async openInstallPermissionSettings() {
    return true
  }

  async installApk(options) {
    console.log('[AbsAppUpdaterWeb] installApk called with', options)
    return { success: true }
  }

  async downloadAndInstall(options) {
    console.log('[AbsAppUpdaterWeb] downloadAndInstall called with', options)
    if (options?.url) {
      await Browser.open({ url: options.url })
    }
    return { success: true }
  }
}

const AbsAppUpdater = registerPlugin('AbsAppUpdater', {
  web: () => new AbsAppUpdaterWeb()
})

export { AbsAppUpdater }
