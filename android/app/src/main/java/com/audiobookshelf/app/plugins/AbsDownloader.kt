package com.audiobookshelf.app.plugins

import android.os.Environment
import android.util.Log
import com.audiobookshelf.app.MainActivity
import com.audiobookshelf.app.data.*
import com.audiobookshelf.app.device.DeviceManager
import com.audiobookshelf.app.models.DownloadItem
import com.audiobookshelf.app.models.DownloadItemPart
import com.audiobookshelf.app.server.ApiHandler
import com.audiobookshelf.app.managers.DownloadItemManager
import com.audiobookshelf.app.services.DownloadServiceHost
import com.fasterxml.jackson.core.json.JsonReadFeature
import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import java.io.File

@CapacitorPlugin(name = "AbsDownloader")
class AbsDownloader : Plugin() {
  private val tag = "AbsDownloader"
  private var jacksonMapper = jacksonObjectMapper().enable(JsonReadFeature.ALLOW_UNESCAPED_CONTROL_CHARS.mappedFeature())

  lateinit var mainActivity: MainActivity
  lateinit var apiHandler: ApiHandler
  lateinit var downloadItemManager: DownloadItemManager

  private val clientEventEmitter = (object : DownloadItemManager.DownloadEventEmitter {
    override fun onDownloadItem(downloadItem:DownloadItem) {
      notifyListeners("onDownloadItem", JSObject(jacksonMapper.writeValueAsString(downloadItem)))
    }
    override fun onDownloadItemPartUpdate(downloadItemPart:DownloadItemPart) {
      notifyListeners("onDownloadItemPartUpdate", JSObject(jacksonMapper.writeValueAsString(downloadItemPart)))
    }
    override fun onDownloadItemComplete(jsobj:JSObject) {
      notifyListeners("onItemDownloadComplete", jsobj)
    }
    override fun onQueueChanged(hasWork: Boolean) {
      notifyListeners("onQueueChanged", JSObject().put("hasWork", hasWork))
    }
    override fun onDownloadItemCancelled(itemId: String) {
      notifyListeners("onDownloadItemCancelled", JSObject().put("id", itemId))
    }
  })

  @PluginMethod
  fun cancelDownloadItem(call: PluginCall) {
    val itemId = call.getString("id")
    if (itemId.isNullOrEmpty()) {
      call.reject("Must provide download item id")
      return
    }
    val success = downloadItemManager.cancelDownloadItem(itemId)
    val res = JSObject()
    res.put("success", success)
    call.resolve(res)
  }

  @PluginMethod
  fun retryDownloadItem(call: PluginCall) {
    val itemId = call.getString("id")
    if (itemId.isNullOrEmpty()) {
      call.reject("Must provide download item id")
      return
    }
    val success = downloadItemManager.retryDownloadItemById(itemId)
    val res = JSObject()
    res.put("success", success)
    call.resolve(res)
  }

  @PluginMethod
  fun clearFailedDownloads(call: PluginCall) {
    val count = downloadItemManager.clearFailedDownloads()
    val res = JSObject()
    res.put("count", count)
    call.resolve(res)
  }

  @PluginMethod
  fun retryAllFailed(call: PluginCall) {
    val count = downloadItemManager.retryAllFailed()
    val res = JSObject()
    res.put("count", count)
    call.resolve(res)
  }

  @PluginMethod
  fun cancelAllDownloads(call: PluginCall) {
    downloadItemManager.cancelAll()
    call.resolve(JSObject().put("success", true))
  }

  @PluginMethod
  fun getDownloadQueue(call: PluginCall) {
    val array = JSArray()
    downloadItemManager.downloadItemQueue.forEach { item ->
      array.put(JSObject(jacksonMapper.writeValueAsString(item)))
    }
    val res = JSObject()
    res.put("queue", array)
    call.resolve(res)
  }

  override fun load() {
    mainActivity = (activity as MainActivity)
    apiHandler = ApiHandler(mainActivity)
    downloadItemManager = DownloadServiceHost.ensure(mainActivity)
    DownloadServiceHost.attachBridge(mainActivity, clientEventEmitter)
  }

  override fun handleOnDestroy() {
    DownloadServiceHost.detachBridge()
    super.handleOnDestroy()
  }

  @PluginMethod
  fun setDownloadNotificationStrings(call: PluginCall) {
    DownloadServiceHost.setNotificationStrings(
            mainActivity,
            call.getString("preparing") ?: "Preparing downloads",
            call.getString("downloadingFile") ?: "Downloading {0}",
            call.getString("waitingForStorage") ?: "Waiting for available storage",
            call.getString("downloads") ?: "Downloads",
            call.getString("cancel") ?: "Cancel")
    call.resolve()
  }

  /** Replays restored queue items when the frontend subscribes to download events. */
  @PluginMethod(returnType = PluginMethod.RETURN_NONE)
  override fun addListener(call: PluginCall) {
    super.addListener(call)
    if (call.getString("eventName") == "onDownloadItem" && ::downloadItemManager.isInitialized) {
      downloadItemManager.downloadItemQueue.forEach { item ->
        notifyListeners("onDownloadItem", JSObject(jacksonMapper.writeValueAsString(item)))
      }
    }
  }

  @PluginMethod
  fun downloadLibraryItem(call: PluginCall) {
    try {
      val libraryItemId = call.data.getString("libraryItemId").toString()
      var episodeId = call.data.getString("episodeId").toString()
      if (episodeId == "null") episodeId = ""
      var localFolderId = call.data.getString("localFolderId", "").toString()
      Log.d(tag, "Download library item $libraryItemId to folder $localFolderId / episode: $episodeId")

      val downloadId = if (episodeId.isEmpty()) libraryItemId else "$libraryItemId-$episodeId"
      if (downloadItemManager.downloadItemQueue.find { it.id == downloadId } != null) {
        Log.d(tag, "Download already started for this media entity $downloadId")
        return call.resolve(JSObject("{\"error\":\"Download already started for this media entity\"}"))
      }

      apiHandler.getLibraryItemWithProgress(libraryItemId, episodeId) { libraryItem ->
        try {
          if (libraryItem == null) {
            call.resolve(JSObject("{\"error\":\"Server request failed\"}"))
          } else {
            Log.d(tag, "Got library item from server ${libraryItem.id}")

            if (localFolderId == "") {
              localFolderId = "internal-${libraryItem.mediaType}"
            }
            var localFolder = DeviceManager.dbManager.getLocalFolder(localFolderId)

            if (localFolder == null && localFolderId.startsWith("internal-")) {
              Log.d(tag, "Creating new App Storage internal LocalFolder $localFolderId")
              localFolder = LocalFolder(localFolderId, "Internal App Storage", "", "", "", "internal", libraryItem.mediaType)
              DeviceManager.dbManager.saveLocalFolder(localFolder)
            }

            if (localFolder != null) {
              if (episodeId.isNotEmpty() && libraryItem.mediaType != "podcast") {
                Log.e(tag, "Library item is not a podcast but episode was requested")
                call.resolve(JSObject("{\"error\":\"Invalid library item not a podcast\"}"))
              } else if (episodeId.isNotEmpty()) {
                val podcast = libraryItem.media as Podcast
                val episode = podcast.episodes?.find { podcastEpisode ->
                  podcastEpisode.id == episodeId
                }
                val enclosureUrl = call.getString("enclosureUrl") ?: ""
                if (episode == null || (episode.audioFile == null && episode.audioTrack == null && enclosureUrl.isNotEmpty())) {
                  if (enclosureUrl.isNotEmpty()) {
                    val epTitle = call.getString("episodeTitle") ?: (episode?.title ?: (if (episodeId.isNotEmpty()) episodeId else "Episode"))
                    val epDuration = call.getDouble("episodeDuration") ?: (episode?.duration ?: 0.0)
                    val epPubDate = call.getString("episodePubDate") ?: (episode?.pubDate ?: "")
                    val epPublishedAt = call.data.optLong("episodePublishedAt", episode?.publishedAt ?: System.currentTimeMillis())
                    val epDesc = call.getString("episodeDescription") ?: (episode?.description ?: "")
                    val epSub = call.getString("episodeSubtitle") ?: (episode?.subtitle ?: "")
                    val epSeason = call.getString("episodeSeason") ?: (episode?.episode ?: "")
                    val epNum = call.getString("episodeNumber") ?: (episode?.episode ?: "")
                    val epType = call.getString("episodeType") ?: (episode?.episodeType ?: "full")
                    val mimeType = call.getString("mimeType") ?: "audio/mpeg"

                    val safeFilename = "${cleanStringForFileSystem(epTitle)}.mp3"
                    val fileMeta = FileMetadata(safeFilename, ".mp3", safeFilename, safeFilename, 0L)
                    val audioTrack = AudioTrack(
                      index = 1,
                      startOffset = 0.0,
                      duration = epDuration,
                      title = epTitle,
                      contentUrl = enclosureUrl,
                      mimeType = mimeType,
                      metadata = fileMeta,
                      isLocal = false,
                      localFileId = null,
                      serverIndex = null
                    )
                    val audioFile = AudioFile(1, "0", fileMeta)
                    val targetEpisode = episode ?: PodcastEpisode(
                      id = episodeId,
                      index = 1,
                      episode = epNum,
                      episodeType = epType,
                      title = epTitle,
                      subtitle = epSub,
                      description = epDesc,
                      pubDate = epPubDate,
                      publishedAt = epPublishedAt,
                      audioFile = audioFile,
                      audioTrack = audioTrack,
                      chapters = null,
                      duration = epDuration,
                      size = null,
                      serverEpisodeId = episodeId,
                      localEpisodeId = null
                    )
                    targetEpisode.audioFile = audioFile
                    targetEpisode.audioTrack = audioTrack
                    startLibraryItemDownload(libraryItem, localFolder, targetEpisode)
                    call.resolve()
                  } else if (episode == null) {
                    call.resolve(JSObject("{\"error\":\"Invalid podcast episode not found\"}"))
                  } else {
                    startLibraryItemDownload(libraryItem, localFolder, episode)
                    call.resolve()
                  }
                } else {
                  startLibraryItemDownload(libraryItem, localFolder, episode)
                  call.resolve()
                }
              } else {
                startLibraryItemDownload(libraryItem, localFolder, null)
                call.resolve()
              }
            } else {
              call.resolve(JSObject("{\"error\":\"Local Folder Not Found\"}"))
            }
          }
        } catch (e: Exception) {
          Log.e(tag, "Error processing library item download callback", e)
          call.resolve(JSObject("{\"error\":\"${e.message ?: "Failed to process download"}\"}"))
        }
      }
    } catch (e: Exception) {
      Log.e(tag, "Error starting library item download", e)
      call.resolve(JSObject("{\"error\":\"${e.message ?: "Failed to start download"}\"}"))
    }
  }

  // Item filenames could be the same if they are in sub-folders, this will make them unique
  private fun getFilenameFromRelPath(relPath: String): String {
    var cleanedRelPath = relPath.replace("\\", "_").replace("/", "_")
    cleanedRelPath = cleanStringForFileSystem(cleanedRelPath)
    return if (cleanedRelPath.startsWith("_")) cleanedRelPath.substring(1) else cleanedRelPath
  }

  // Replace characters that cant be used in the file system
  // Reserved characters: ?:\"*|/\\<>
  private fun cleanStringForFileSystem(str:String):String {
    val reservedCharacters = listOf("?", "\"", "*", "|", "/", "\\", "<", ">")
    var newTitle = str
    newTitle = newTitle.replace(":", " -") // Special case replace : with -

    reservedCharacters.forEach {
      newTitle = newTitle.replace(it, "")
    }
    return newTitle
  }

  private fun startLibraryItemDownload(libraryItem: LibraryItem, localFolder: LocalFolder, episode:PodcastEpisode?) {
    val isInternal = localFolder.id.startsWith("internal-")

    val finalInternalFolderPath = "${mainActivity.filesDir}/downloads/${libraryItem.id}"
    val tempFolderPath =
            if (isInternal) {
              "${mainActivity.filesDir}/download-staging/${libraryItem.id}"
            } else {
              "${mainActivity.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS) ?: mainActivity.filesDir}/download-staging/${libraryItem.id}"
            }

    Log.d(tag, "downloadCacheDirectory=$tempFolderPath")

    if (libraryItem.mediaType == "book") {
      val bookTitle = cleanStringForFileSystem(libraryItem.media.metadata.title)
      val bookAuthor = cleanStringForFileSystem(libraryItem.media.metadata.getAuthorDisplayName())

      val tracks = libraryItem.media.getAudioTracks()
      Log.d(tag, "Starting library item download with ${tracks.size} tracks")
      val itemSubfolder = "$bookAuthor/$bookTitle"
      val itemFolderPath = if (isInternal) finalInternalFolderPath else "${localFolder.absolutePath}/$itemSubfolder"
      val downloadItem = DownloadItem(libraryItem.id, libraryItem.id, null, libraryItem.userMediaProgress,DeviceManager.serverConnectionConfig?.id ?: "", DeviceManager.serverAddress, DeviceManager.serverUserId, libraryItem.mediaType, itemFolderPath, localFolder, bookTitle, itemSubfolder, libraryItem.media, mutableListOf())

      val book = libraryItem.media as Book
      book.ebookFile?.let { ebookFile ->
        val fileSize = ebookFile.metadata?.size ?: 0
        val serverPath = "/api/items/${libraryItem.id}/file/${ebookFile.ino}/download"
        val destinationFilename = getFilenameFromRelPath(ebookFile.metadata?.relPath ?: "")
        val finalDestinationFile = File("$itemFolderPath/$destinationFilename")
        val destinationFile = File("$tempFolderPath/$destinationFilename.part")

        val downloadItemPart = DownloadItemPart.make(downloadItem.id, destinationFilename, fileSize, destinationFile,finalDestinationFile,itemSubfolder,serverPath,localFolder,ebookFile,null,null)
        downloadItem.downloadItemParts.add(downloadItemPart)
      }

      // Create download item part for each audio track
      val audioFiles = (libraryItem.media as Book).audioFiles ?: mutableListOf()
      tracks.forEach { audioTrack ->
        val fileSize = audioTrack.metadata?.size ?: 0

        // TODO: Currently file ino is only stored on AudioFile. This should be updated server side to be in FileMetadata or on the AudioTrack
        val audioFileIno = audioFiles.find { it.metadata.path == audioTrack.metadata?.path }?.ino

        val serverPath = "/api/items/${libraryItem.id}/file/${audioFileIno}/download"
        val destinationFilename = getFilenameFromRelPath(audioTrack.relPath)
        Log.d(tag, "Audio File Server Path $serverPath | AF RelPath ${audioTrack.relPath} | LocalFolder Path ${localFolder.absolutePath} | DestName $destinationFilename")

        val finalDestinationFile = File("$itemFolderPath/$destinationFilename")
        val destinationFile = File("$tempFolderPath/$destinationFilename.part")

        val downloadItemPart = DownloadItemPart.make(downloadItem.id, destinationFilename, fileSize, destinationFile,finalDestinationFile,itemSubfolder,serverPath,localFolder,null,audioTrack,null)
        downloadItem.downloadItemParts.add(downloadItemPart)
      }

      if (downloadItem.downloadItemParts.isNotEmpty()) {
        // Add cover download item
        if (libraryItem.media.coverPath != null && libraryItem.media.coverPath?.isNotEmpty() == true) {
          val coverLibraryFile = libraryItem.libraryFiles?.find { it.metadata.path == libraryItem.media.coverPath }
          val coverFileSize = coverLibraryFile?.metadata?.size ?: 0

          val serverPath = "/api/items/${libraryItem.id}/cover"
          val destinationFilename = "cover-${libraryItem.id}.jpg"
          val destinationFile = File("$tempFolderPath/$destinationFilename.part")
          val finalDestinationFile = File("$itemFolderPath/$destinationFilename")

          val downloadItemPart = DownloadItemPart.make(downloadItem.id, destinationFilename, coverFileSize,  destinationFile,finalDestinationFile,itemSubfolder,serverPath,localFolder,null,null,null)
          downloadItem.downloadItemParts.add(downloadItemPart)
        }

        DownloadServiceHost.enqueue(mainActivity, downloadItem)
      }
    } else {
      // Podcast episode download
      val podcastTitle = cleanStringForFileSystem(libraryItem.media.metadata.title)

      val audioTrack = episode?.audioTrack
      val audioFileIno = episode?.audioFile?.ino
      val fileSize = audioTrack?.metadata?.size ?: 0

      Log.d(tag, "Starting podcast episode download")
      val itemFolderPath = if (isInternal) finalInternalFolderPath else "${localFolder.absolutePath}/$podcastTitle"
      val downloadItemId = "${libraryItem.id}-${episode?.id}"
      val downloadItem = DownloadItem(downloadItemId, libraryItem.id, episode?.id, libraryItem.userMediaProgress, DeviceManager.serverConnectionConfig?.id ?: "", DeviceManager.serverAddress, DeviceManager.serverUserId, libraryItem.mediaType, itemFolderPath, localFolder, podcastTitle, podcastTitle, libraryItem.media, mutableListOf())

      val isDirectUrl = audioTrack?.contentUrl?.startsWith("http://") == true || audioTrack?.contentUrl?.startsWith("https://") == true
      var serverPath = if (isDirectUrl) audioTrack!!.contentUrl else if (audioFileIno != null) "/api/items/${libraryItem.id}/file/${audioFileIno}/download" else ""
      if (serverPath.isEmpty()) {
        Log.e(tag, "Cannot download podcast episode: neither direct URL nor audioFile ino available")
        return
      }
      var destinationFilename = getFilenameFromRelPath(audioTrack?.relPath ?: "${cleanStringForFileSystem(episode?.title ?: "episode")}.mp3")
      if (!destinationFilename.endsWith(".mp3") && !destinationFilename.endsWith(".m4a") && !destinationFilename.endsWith(".aac")) {
        destinationFilename += ".mp3"
      }
      Log.d(tag, "Audio File Server Path $serverPath | AF RelPath ${audioTrack?.relPath} | LocalFolder Path ${localFolder.absolutePath} | DestName $destinationFilename")

      var destinationFile = File("$tempFolderPath/$destinationFilename.part")
      var finalDestinationFile = File("$itemFolderPath/$destinationFilename")
      var downloadItemPart = DownloadItemPart.make(downloadItem.id, destinationFilename,fileSize, destinationFile,finalDestinationFile,podcastTitle,serverPath,localFolder,null,audioTrack,episode)
      downloadItem.downloadItemParts.add(downloadItemPart)

      if (libraryItem.media.coverPath != null && libraryItem.media.coverPath?.isNotEmpty() == true) {
        val coverLibraryFile = libraryItem.libraryFiles?.find { it.metadata.path == libraryItem.media.coverPath }
        val coverFileSize = coverLibraryFile?.metadata?.size ?: 0

        serverPath = "/api/items/${libraryItem.id}/cover"
        destinationFilename = "cover.jpg"

        destinationFile = File("$tempFolderPath/$destinationFilename.part")
        finalDestinationFile = File("$itemFolderPath/$destinationFilename")

        downloadItemPart = DownloadItemPart.make(downloadItem.id, destinationFilename,coverFileSize,destinationFile,finalDestinationFile,podcastTitle,serverPath,localFolder,null,null,null)
        downloadItem.downloadItemParts.add(downloadItemPart)
      }

        DownloadServiceHost.enqueue(mainActivity, downloadItem)
    }
  }
}
