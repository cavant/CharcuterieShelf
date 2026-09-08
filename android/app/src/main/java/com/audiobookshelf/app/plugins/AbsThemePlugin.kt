package com.audiobookshelf.app.plugins

import android.os.Build
import androidx.core.content.ContextCompat
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

@CapacitorPlugin(name = "AbsThemePlugin")
class AbsThemePlugin : Plugin() {

  private fun colorToRgbString(colorInt: Int): String {
    val r = (colorInt shr 16) and 0xFF
    val g = (colorInt shr 8) and 0xFF
    val b = colorInt and 0xFF
    return "$r $g $b"
  }

  @PluginMethod
  fun getDynamicColors(call: PluginCall) {
    val ret = JSObject()
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      try {
        val ctx = context
        val accent1 = ContextCompat.getColor(ctx, android.R.color.system_accent1_500)
        val accent1Light = ContextCompat.getColor(ctx, android.R.color.system_accent1_200)
        val neutral900 = ContextCompat.getColor(ctx, android.R.color.system_neutral1_900)
        val neutral800 = ContextCompat.getColor(ctx, android.R.color.system_neutral1_800)
        val neutral700 = ContextCompat.getColor(ctx, android.R.color.system_neutral1_700)
        val neutral100 = ContextCompat.getColor(ctx, android.R.color.system_neutral1_100)
        val neutral500 = ContextCompat.getColor(ctx, android.R.color.system_neutral2_500)

        ret.put("isAvailable", true)
        ret.put("accent", colorToRgbString(accent1))
        ret.put("accentLight", colorToRgbString(accent1Light))
        ret.put("bg", colorToRgbString(neutral900))
        ret.put("primary", colorToRgbString(neutral800))
        ret.put("secondary", colorToRgbString(neutral700))
        ret.put("border", colorToRgbString(neutral700))
        ret.put("fg", colorToRgbString(neutral100))
        ret.put("fgMuted", colorToRgbString(neutral500))
        call.resolve(ret)
        return
      } catch (e: Exception) {
        ret.put("isAvailable", false)
        ret.put("error", e.message)
        call.resolve(ret)
        return
      }
    }
    ret.put("isAvailable", false)
    call.resolve(ret)
  }
}
