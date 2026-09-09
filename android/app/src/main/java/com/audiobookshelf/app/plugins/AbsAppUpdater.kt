package com.audiobookshelf.app.plugins

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.Settings
import android.util.Log
import androidx.core.content.FileProvider
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import java.io.File
import java.io.FileOutputStream
import java.util.concurrent.TimeUnit
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import okhttp3.OkHttpClient
import okhttp3.Request

@CapacitorPlugin(name = "AbsAppUpdater")
class AbsAppUpdater : Plugin() {
  private val tag = "AbsAppUpdater"

  private val httpClient = OkHttpClient.Builder()
    .connectTimeout(30, TimeUnit.SECONDS)
    .readTimeout(60, TimeUnit.SECONDS)
    .followRedirects(true)
    .followSslRedirects(true)
    .build()

  @PluginMethod
  fun canRequestPackageInstalls(call: PluginCall) {
    val canInstall = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      context.packageManager.canRequestPackageInstalls()
    } else {
      true
    }
    val ret = JSObject()
    ret.put("canInstall", canInstall)
    call.resolve(ret)
  }

  @PluginMethod
  fun openInstallPermissionSettings(call: PluginCall) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val intent = Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES).apply {
        data = Uri.parse("package:${context.packageName}")
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      }
      activity.startActivity(intent)
    }
    call.resolve()
  }

  @PluginMethod
  fun installApk(call: PluginCall) {
    val filePath = call.getString("filePath")
    if (filePath.isNullOrEmpty()) {
      return call.reject("filePath is required")
    }

    val apkFile = File(filePath)
    if (!apkFile.exists()) {
      return call.reject("APK file does not exist at $filePath")
    }

    launchInstaller(apkFile, call)
  }

  @PluginMethod
  fun downloadAndInstall(call: PluginCall) {
    val url = call.getString("url")
    if (url.isNullOrEmpty()) {
      return call.reject("Download URL is required")
    }

    CoroutineScope(Dispatchers.IO).launch {
      try {
        val downloadDir = context.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS) ?: context.filesDir
        val apkFile = File(downloadDir, "CharcuterieShelf-update.apk")
        if (apkFile.exists()) {
          apkFile.delete()
        }

        val request = Request.Builder()
          .url(url)
          .header("User-Agent", "CharcuterieShelf-AppUpdater")
          .build()

        val response = httpClient.newCall(request).execute()
        if (!response.isSuccessful || response.body == null) {
          call.reject("Failed to download update: HTTP ${response.code}")
          return@launch
        }

        val body = response.body!!
        val contentLength = body.contentLength()
        val inputStream = body.byteStream()
        val outputStream = FileOutputStream(apkFile)

        val buffer = ByteArray(8192)
        var totalBytesRead = 0L
        var bytesRead: Int
        var lastEmittedPercent = -1

        while (inputStream.read(buffer).also { bytesRead = it } != -1) {
          outputStream.write(buffer, 0, bytesRead)
          totalBytesRead += bytesRead

          if (contentLength > 0L) {
            val progress = ((totalBytesRead * 100L) / contentLength).toInt()
            if (progress != lastEmittedPercent) {
              lastEmittedPercent = progress
              val progressObj = JSObject().apply {
                put("progress", progress)
                put("bytesDownloaded", totalBytesRead)
                put("totalBytes", contentLength)
              }
              notifyListeners("downloadProgress", progressObj)
            }
          }
        }

        outputStream.flush()
        outputStream.close()
        inputStream.close()

        Log.d(tag, "Update downloaded successfully to ${apkFile.absolutePath} (${apkFile.length()} bytes)")

        // Final progress event
        notifyListeners("downloadProgress", JSObject().apply {
          put("progress", 100)
          put("bytesDownloaded", apkFile.length())
          put("totalBytes", apkFile.length())
        })

        // Launch installer on main thread
        activity.runOnUiThread {
          launchInstaller(apkFile, call)
        }
      } catch (e: Exception) {
        Log.e(tag, "Error downloading update", e)
        call.reject("Download failed: ${e.message}")
      }
    }
  }

  private fun launchInstaller(apkFile: File, call: PluginCall) {
    try {
      val authority = "${context.packageName}.fileprovider"
      val contentUri = FileProvider.getUriForFile(context, authority, apkFile)

      val installIntent = Intent(Intent.ACTION_VIEW).apply {
        setDataAndType(contentUri, "application/vnd.android.package-archive")
        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      }

      context.startActivity(installIntent)
      val res = JSObject().apply {
        put("success", true)
        put("filePath", apkFile.absolutePath)
      }
      call.resolve(res)
    } catch (e: Exception) {
      Log.e(tag, "Error launching package installer", e)
      call.reject("Failed to open package installer: ${e.message}")
    }
  }
}
