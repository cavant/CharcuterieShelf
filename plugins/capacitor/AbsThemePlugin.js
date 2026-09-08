import { registerPlugin, WebPlugin } from '@capacitor/core'

class AbsThemePluginWeb extends WebPlugin {
  async getDynamicColors() {
    return {
      isAvailable: false
    }
  }
}

const AbsThemePlugin = registerPlugin('AbsThemePlugin', {
  web: () => new AbsThemePluginWeb()
})

export { AbsThemePlugin }
