package com.audiobookshelf.app

import android.app.Application
import android.util.Log
import com.audiobookshelf.app.managers.DbManager

class CharcuterieShelfApplication : Application() {
  private val tag = "CharcuterieShelfApp"

  override fun onCreate() {
    super.onCreate()
    try {
      DbManager.initialize(applicationContext)
      Log.i(tag, "CharcuterieShelfApplication initialized Paper DB successfully")
    } catch (e: Throwable) {
      Log.e(tag, "Failed to initialize Paper DB in CharcuterieShelfApplication", e)
    }
  }
}
