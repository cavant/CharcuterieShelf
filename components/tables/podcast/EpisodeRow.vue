<template>
  <div class="w-full py-4 overflow-hidden relative border-b border-white border-opacity-10 cursor-pointer" @click.stop="goToEpisodePage">
    <div v-if="episode" class="w-full px-1">
      <p v-if="publishedAt" class="text-xs text-fg-muted mb-1">{{ $getString('LabelPublishedDate', [$formatDate(publishedAt, 'MMM do, yyyy')]) }}</p>

      <p class="text-sm font-semibold">{{ title }}</p>

      <p class="text-sm text-fg episode-subtitle mt-1.5 mb-0.5" v-html="subtitle" />

      <!-- Expandable episode show notes/description -->
      <div v-if="showDescription && descriptionText" class="text-xs text-fg-muted my-2 p-2.5 bg-primary/20 rounded-lg max-h-48 overflow-y-auto" v-html="descriptionText" />

      <p v-if="sortKey === 'audioFile.metadata.filename' && episode.audioFile" class="text-xs text-fg-muted truncate mt-2 mb-0.5">
        <span class="font-semibold">{{ $getString('LabelFilename') }}</span
        >: <span class="font-light">{{ episode.audioFile.metadata.filename }}</span>
      </p>

      <div v-if="episodeNumber || season || episodeType" class="flex py-2 items-center -mx-0.5">
        <div v-if="episodeNumber" class="px-2 pt-px pb-0.5 mx-0.5 bg-primary bg-opacity-50 rounded-full text-xs font-light text-fg">Episode #{{ episodeNumber }}</div>
        <div v-if="season" class="px-2 pt-px pb-0.5 mx-0.5 bg-primary bg-opacity-50 rounded-full text-xs font-light text-fg">Season #{{ season }}</div>
        <div v-if="episodeType" class="px-2 pt-px pb-0.5 mx-0.5 bg-primary bg-opacity-50 rounded-full text-xs font-light text-fg capitalize">{{ episodeType }}</div>
      </div>

      <div class="flex items-center pt-2">
        <!-- Play/Pause Button (Unified for downloaded, server, and direct RSS streaming) -->
        <div class="h-10 px-4 border border-border rounded-full flex items-center justify-center cursor-pointer" :class="userIsFinished ? 'text-white text-opacity-40' : ''" @click.stop="playClick">
          <span v-if="!playerIsStartingForThisMedia" class="material-symbols text-2xl fill leading-none" :class="streamIsPlaying ? '' : 'text-success'">
            {{ streamIsPlaying ? 'pause' : 'play_arrow' }}
          </span>
          <svg v-else class="animate-spin" style="width: 28px; height: 28px" viewBox="0 0 24 24">
            <path fill="currentColor" d="M12,4V2A10,10 0 0,0 2,12H4A8,8 0 0,1 12,4Z" />
          </svg>
          <p class="pl-2 pr-1 text-sm font-semibold">{{ timeRemaining }}</p>
        </div>

        <!-- Read Status Button -->
        <ui-read-icon-btn :disabled="isProcessingReadUpdate" :is-read="userIsFinished" borderless class="mx-1" @click="toggleFinished" />

        <!-- Add to Playlist Button (if not local and episode has server ID) -->
        <button v-if="!isLocal && !isRssOnly" class="mx-1.5" @click.stop="addToPlaylist">
          <span class="material-symbols text-2xl leading-none">playlist_add</span>
        </button>

        <!-- Download Section (Device-only storage) -->
        <div v-if="userCanDownload" class="flex items-center">
          <span v-if="isLocal || localEpisode" class="material-symbols px-2 text-success text-2xl leading-none">download_done</span>
          <span v-else class="material-symbols mx-1.5 text-2xl leading-none cursor-pointer" :class="downloadItem || startingDownload ? 'animate-bounce text-warning text-opacity-75' : 'text-fg-muted hover:text-fg'" @click.stop="downloadClick">
            {{ downloadItem || startingDownload ? 'downloading' : 'download' }}
          </span>
        </div>

        <!-- Spacer to push elements left -->
        <div class="flex-grow" />
      </div>
    </div>

    <div v-if="processing" class="absolute top-0 left-0 w-full h-full bg-black bg-opacity-30 flex items-center justify-center">
      <widgets-loading-spinner size="la-lg" />
    </div>

    <div v-if="!userIsFinished" class="absolute bottom-0 left-0 h-0.5 bg-warning" :style="{ width: itemProgressPercent * 100 + '%' }" />
  </div>
</template>

<script>
import { AbsFileSystem, AbsDownloader } from '@/plugins/capacitor'
import cellularPermissionHelpers from '@/mixins/cellularPermissionHelpers'

export default {
  props: {
    libraryItemId: String,
    libraryItem: {
      type: Object,
      default: () => null
    },
    episode: {
      type: Object,
      default: () => {}
    },
    localLibraryItemId: String,
    localEpisode: {
      type: Object,
      default: () => {}
    },
    isLocal: Boolean,
    isRssOnly: Boolean,
    sortKey: String
  },
  mixins: [cellularPermissionHelpers],
  data() {
    return {
      isProcessingReadUpdate: false,
      processing: false,
      startingDownload: false,
      showDescription: false
    }
  },
  computed: {
    effectiveEpisodeId() {
      return this.episode?.id || this.episode?._rssId || null
    },
    enclosureUrl() {
      return this.episode?.enclosure?.url || this.episode?.audioTrack?.contentUrl || null
    },
    descriptionText() {
      return this.episode?.description || this.episode?.subtitle || ''
    },
    podcastTitle() {
      return this.libraryItem?.media?.metadata?.title || ''
    },
    coverUrl() {
      if (this.libraryItem) {
        return this.isLocal ? this.libraryItem.coverContentUrl : this.$store.getters['globals/getLibraryItemCoverSrc'](this.libraryItem)
      }
      return this.libraryItemId ? this.$store.getters['globals/getLibraryItemCoverSrcById'](this.libraryItemId) : ''
    },
    isIos() {
      return this.$platform === 'ios'
    },
    mediaType() {
      return 'podcast'
    },
    userCanDownload() {
      return this.$store.getters['user/getUserCanDownload']
    },
    audioFile() {
      return this.episode?.audioFile
    },
    title() {
      return this.episode?.title || ''
    },
    subtitle() {
      return this.episode?.subtitle || this.episode?.description || ''
    },
    episodeNumber() {
      return this.episode?.episode
    },
    season() {
      return this.episode?.season
    },
    episodeType() {
      if (this.episode?.episodeType === 'full') return null // only show Trailer/Bonus
      return this.episode?.episodeType
    },
    duration() {
      return this.$secondsToTimestamp(this.episode?.duration)
    },
    isStreaming() {
      return this.$store.getters['getIsMediaStreaming'](this.libraryItemId, this.effectiveEpisodeId)
    },
    streamIsPlaying() {
      return this.$store.state.playerIsPlaying && this.isStreaming
    },
    playerIsStartingPlayback() {
      // Play has been pressed and waiting for native play response
      return this.$store.state.playerIsStartingPlayback
    },
    playerIsStartingForThisMedia() {
      const mediaId = this.$store.state.playerStartingPlaybackMediaId
      if (!mediaId) return false

      return mediaId === this.effectiveEpisodeId
    },
    itemProgress() {
      if (this.isLocal) return this.$store.getters['globals/getLocalMediaProgressById'](this.libraryItemId, this.effectiveEpisodeId)
      if (this.localEpisode && this.localLibraryItemId) {
        const localProg = this.$store.getters['globals/getLocalMediaProgressById'](this.localLibraryItemId, this.localEpisode.id)
        if (localProg) return localProg
      }
      if (this.episode?.id) {
        return this.$store.getters['user/getUserMediaProgress'](this.libraryItemId, this.episode.id)
      }
      return null
    },
    localMediaProgress() {
      if (this.isLocal) return this.$store.getters['globals/getLocalMediaProgressById'](this.libraryItemId, this.effectiveEpisodeId)
      else if (this.localLibraryItemId && this.localEpisode) {
        return this.$store.getters['globals/getLocalMediaProgressById'](this.localLibraryItemId, this.localEpisode.id)
      } else {
        return null
      }
    },
    itemProgressPercent() {
      return this.itemProgress?.progress || 0
    },
    userIsFinished() {
      return !!this.itemProgress?.isFinished
    },
    timeRemaining() {
      if (this.streamIsPlaying) return 'Playing'
      if (!this.itemProgressPercent) return this.$elapsedPretty(this.episode?.duration)
      if (this.userIsFinished) return 'Finished'
      var remaining = Math.floor(this.itemProgress.duration - this.itemProgress.currentTime)
      return `${this.$elapsedPretty(remaining)} left`
    },
    publishedAt() {
      return this.episode?.publishedAt
    },
    downloadItem() {
      return this.$store.getters['globals/getDownloadItem'](this.libraryItemId, this.effectiveEpisodeId)
    },
    localEpisodeId() {
      return this.localEpisode?.id || null
    }
  },
  methods: {
    goToEpisodePage() {
      if (this.episode?.id) {
        this.$router.push(`/item/${this.libraryItemId}/${this.episode.id}`)
      } else {
        this.showDescription = !this.showDescription
      }
    },
    addToPlaylist() {
      this.$emit('addToPlaylist', this.episode)
    },
    async selectFolder() {
      var folderObj = await AbsFileSystem.selectFolder({ mediaType: this.mediaType })
      if (folderObj.error) {
        return this.$toast.error(`Error: ${folderObj.error || 'Unknown Error'}`)
      }
      return folderObj
    },
    async downloadClick() {
      if (this.downloadItem || this.startingDownload) return

      const hasPermission = await this.checkCellularPermission('download')
      if (!hasPermission) return

      this.startingDownload = true
      setTimeout(() => {
        this.startingDownload = false
      }, 1000)

      await this.$hapticsImpact()
      if (this.isIos) {
        // no local folders on iOS
        this.startDownload()
      } else {
        this.download()
      }
    },
    async download(selectedLocalFolder = null) {
      let localFolder = selectedLocalFolder
      if (!localFolder) {
        const localFolders = (await this.$db.getLocalFolders()) || []
        console.log('Local folders loaded', localFolders.length)
        const foldersWithMediaType = localFolders.filter((lf) => {
          console.log('Checking local folder', lf.mediaType)
          return lf.mediaType == this.mediaType
        })
        console.log('Folders with media type', this.mediaType, foldersWithMediaType.length)
        const internalStorageFolder = foldersWithMediaType.find((f) => f.id === `internal-${this.mediaType}`)
        if (!foldersWithMediaType.length) {
          localFolder = {
            id: `internal-${this.mediaType}`,
            name: 'Internal App Storage',
            mediaType: this.mediaType
          }
        } else if (foldersWithMediaType.length === 1 && internalStorageFolder) {
          localFolder = internalStorageFolder
        } else {
          this.$store.commit('globals/showSelectLocalFolderModal', {
            mediaType: this.mediaType,
            callback: (folder) => {
              this.download(folder)
            }
          })
          return
        }
      }

      console.log('Local folder', JSON.stringify(localFolder))

      this.startDownload(localFolder)
    },
    async startDownload(localFolder) {
      var payload = {
        libraryItemId: this.libraryItemId,
        episodeId: this.effectiveEpisodeId
      }
      if (localFolder) {
        payload.localFolderId = localFolder.id
      }
      if (this.isRssOnly || !this.episode?.audioFile) {
        payload.enclosureUrl = this.enclosureUrl
        payload.episodeTitle = this.episode?.title || 'Episode'
        payload.episodeDuration = this.episode?.duration || 0
        payload.episodePubDate = this.episode?.pubDate || ''
        payload.episodePublishedAt = this.episode?.publishedAt || Date.now()
        payload.episodeDescription = this.episode?.description || ''
        payload.episodeSubtitle = this.episode?.subtitle || ''
        payload.episodeSeason = this.episode?.season || ''
        payload.episodeNumber = this.episode?.episode || ''
        payload.episodeType = this.episode?.episodeType || 'full'
        payload.mimeType = this.episode?.enclosure?.type || 'audio/mpeg'
      }
      var downloadRes = await AbsDownloader.downloadLibraryItem(payload)
      if (downloadRes && downloadRes.error) {
        var errorMsg = downloadRes.error || 'Unknown error'
        console.error('Download error', errorMsg)
        this.$toast.error(errorMsg)
      }
    },
    async playClick() {
      if (this.playerIsStartingPlayback) return

      await this.$hapticsImpact()
      if (this.streamIsPlaying) {
        this.$eventBus.$emit('pause-item')
      } else {
        this.$store.commit('setPlayerIsStartingPlayback', this.effectiveEpisodeId)

        if (this.localEpisode && this.localLibraryItemId) {
          console.log('Play local episode', this.localEpisode.id, this.localLibraryItemId)

          this.$eventBus.$emit('play-item', {
            libraryItemId: this.localLibraryItemId,
            episodeId: this.localEpisode.id,
            serverLibraryItemId: this.libraryItemId,
            serverEpisodeId: this.effectiveEpisodeId
          })
        } else if (this.isRssOnly || !this.episode?.audioFile) {
          console.log('Play RSS direct stream', this.enclosureUrl)
          this.$eventBus.$emit('play-item', {
            libraryItemId: this.libraryItemId,
            episodeId: this.effectiveEpisodeId,
            streamUrl: this.enclosureUrl,
            title: this.title,
            author: this.podcastTitle,
            duration: this.episode?.duration || 0,
            coverUrl: this.coverUrl
          })
        } else {
          this.$eventBus.$emit('play-item', {
            libraryItemId: this.libraryItemId,
            episodeId: this.episode.id
          })
        }
      }
    },
    async toggleFinished() {
      await this.$hapticsImpact()

      this.isProcessingReadUpdate = true
      if (this.isLocal || this.localEpisode) {
        const isFinished = !this.userIsFinished
        const localLibraryItemId = this.isLocal ? this.libraryItemId : this.localLibraryItemId
        const localEpisodeId = this.isLocal ? this.effectiveEpisodeId : this.localEpisode.id
        const payload = await this.$db.updateLocalMediaProgressFinished({ localLibraryItemId, localEpisodeId, isFinished })
        console.log('toggleFinished payload', JSON.stringify(payload))
        if (payload?.error) {
          this.$toast.error(payload?.error || 'Unknown error')
        } else {
          const localMediaProgress = payload.localMediaProgress
          console.log('toggleFinished localMediaProgress', JSON.stringify(localMediaProgress))
          if (localMediaProgress) {
            this.$store.commit('globals/updateLocalMediaProgress', localMediaProgress)
          }
        }
        this.isProcessingReadUpdate = false
      } else if (this.episode?.id) {
        const updatePayload = {
          isFinished: !this.userIsFinished
        }
        this.$nativeHttp
          .patch(`/api/me/progress/${this.libraryItemId}/${this.episode.id}`, updatePayload)
          .catch((error) => {
            console.error('Failed', error)
            this.$toast.error(`Failed to mark as ${updatePayload.isFinished ? 'Finished' : 'Not Finished'}`)
          })
          .finally(() => {
            this.isProcessingReadUpdate = false
          })
      } else {
        this.isProcessingReadUpdate = false
      }
    }
  }
}
</script>
