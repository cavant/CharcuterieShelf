<template>
  <div class="w-full h-full px-4 py-8 overflow-y-auto">
    <!-- Display settings -->
    <p class="uppercase text-xs font-semibold text-fg-muted mb-2">{{ $strings.HeaderUserInterfaceSettings }}</p>
    <div class="flex items-center py-3">
      <div class="w-10 flex justify-center" @click="toggleEnableAltView">
        <ui-toggle-switch v-model="enableBookshelfView" @input="saveSettings" />
      </div>
      <p class="pl-4">{{ $strings.LabelUseBookshelfView }}</p>
    </div>
    <!-- screen.orientation.lock not supported on iOS webview -->
    <div v-if="!isiOS" class="flex items-center py-3">
      <div class="w-10 flex justify-center" @click.stop="toggleLockOrientation">
        <ui-toggle-switch v-model="lockCurrentOrientation" class="pointer-events-none" />
      </div>
      <p class="pl-4">{{ $strings.LabelLockOrientation }}</p>
    </div>
    <div class="py-3 flex items-center">
      <p class="pr-4 w-36">{{ $strings.LabelHapticFeedback }}</p>
      <div @click.stop="showHapticFeedbackOptions">
        <ui-text-input :value="hapticFeedbackOption" readonly append-icon="expand_more" style="max-width: 200px" />
      </div>
    </div>
    <div class="py-3 flex items-center">
      <p class="pr-4 w-36">{{ $strings.LabelLanguage }}</p>
      <div @click.stop="showLanguageOptions">
        <ui-text-input :value="languageOption" readonly append-icon="expand_more" style="max-width: 200px" />
      </div>
    </div>
    <div class="py-3 flex items-center">
      <p class="pr-4 w-36">{{ $strings.LabelTheme }}</p>
      <div @click.stop="showThemeOptions">
        <ui-text-input :value="themeOption" readonly append-icon="expand_more" style="max-width: 200px" />
      </div>
    </div>

    <!-- Custom Accent Palette -->
    <div class="py-3">
      <div class="flex items-center justify-between mb-2">
        <p class="text-sm font-medium text-fg">Accent Color</p>
        <span class="text-xxs text-fg-muted font-mono">{{ activeAccentLabel }}</span>
      </div>
      <div class="flex items-center gap-2.5 overflow-x-auto no-scrollbar py-1">
        <button
          v-for="color in accentColorPalette"
          :key="color.value || 'default'"
          type="button"
          class="flex-shrink-0 w-8 h-8 rounded-full border-2 transition-all flex items-center justify-center shadow-sm active:scale-95"
          :class="customAccent === color.value ? 'border-fg scale-110' : 'border-border/60 hover:scale-105'"
          :style="{ backgroundColor: color.hex }"
          :title="color.name"
          @click="selectCustomAccent(color.value)"
        >
          <span v-if="customAccent === color.value" class="material-symbols text-xs text-black font-bold">check</span>
        </button>
      </div>
    </div>

    <!-- Playback settings -->
    <p class="uppercase text-xs font-semibold text-fg-muted mb-2 mt-10">{{ $strings.HeaderPlaybackSettings }}</p>
    <div class="py-3 flex items-center">
      <p class="pr-4 w-36">{{ $strings.LabelJumpBackwardsTime }}</p>
      <div @click.stop="showJumpBackwardsOptions">
        <ui-text-input :value="jumpBackwardsOption" readonly append-icon="expand_more" style="width: 145px; max-width: 145px" />
      </div>
    </div>
    <div class="py-3 flex items-center">
      <p class="pr-4 w-36">{{ $strings.LabelJumpForwardsTime }}</p>
      <div @click.stop="showJumpForwardOptions">
        <ui-text-input :value="jumpForwardOption" readonly append-icon="expand_more" style="width: 145px; max-width: 145px" />
      </div>
    </div>
    <div class="flex items-center py-3">
      <div class="w-10 flex justify-center" @click="toggleDisableAutoRewind">
        <ui-toggle-switch v-model="settings.disableAutoRewind" @input="saveSettings" />
      </div>
      <p class="pl-4">{{ $strings.LabelDisableAutoRewind }}</p>
    </div>
    <div v-if="!isiOS" class="flex items-center py-3">
      <div class="w-10 flex justify-center" @click="toggleEnableMp3IndexSeeking">
        <ui-toggle-switch v-model="settings.enableMp3IndexSeeking" @input="saveSettings" />
      </div>
      <p class="pl-4">{{ $strings.LabelEnableMp3IndexSeeking }}</p>
      <span class="material-symbols text-xl ml-2" @click.stop="showConfirmMp3IndexSeeking">info</span>
    </div>
    <div class="flex items-center py-3">
      <div class="w-10 flex justify-center" @click="toggleAllowSeekingOnMediaControls">
        <ui-toggle-switch v-model="settings.allowSeekingOnMediaControls" @input="saveSettings" />
      </div>
      <p class="pl-4">{{ $strings.LabelAllowSeekingOnMediaControls }}</p>
    </div>

    <!-- Sleep timer settings -->
    <template v-if="!isiOS">
      <p class="uppercase text-xs font-semibold text-fg-muted mb-2 mt-10">{{ $strings.HeaderSleepTimerSettings }}</p>
      <div class="flex items-center py-3">
        <div class="w-10 flex justify-center" @click="toggleDisableShakeToResetSleepTimer">
          <ui-toggle-switch v-model="settings.disableShakeToResetSleepTimer" @input="saveSettings" />
        </div>
        <p class="pl-4">{{ $strings.LabelDisableShakeToReset }}</p>
        <span class="material-symbols text-xl ml-2" @click.stop="showInfo('disableShakeToResetSleepTimer')">info</span>
      </div>
      <div v-if="!settings.disableShakeToResetSleepTimer" class="py-3 flex items-center">
        <p class="pr-4 w-36">{{ $strings.LabelShakeSensitivity }}</p>
        <div @click.stop="showShakeSensitivityOptions">
          <ui-text-input :value="shakeSensitivityOption" readonly append-icon="expand_more" style="width: 145px; max-width: 145px" />
        </div>
      </div>
    </template>
    <div class="flex items-center py-3">
      <div class="w-10 flex justify-center" @click="toggleDisableSleepTimerFadeOut">
        <ui-toggle-switch v-model="settings.disableSleepTimerFadeOut" @input="saveSettings" />
      </div>
      <p class="pl-4">{{ $strings.LabelDisableAudioFadeOut }}</p>
      <span class="material-symbols text-xl ml-2" @click.stop="showInfo('disableSleepTimerFadeOut')">info</span>
    </div>
    <template v-if="!isiOS">
      <div class="flex items-center py-3">
        <div class="w-10 flex justify-center" @click="toggleDisableSleepTimerResetFeedback">
          <ui-toggle-switch v-model="settings.disableSleepTimerResetFeedback" @input="saveSettings" />
        </div>
        <p class="pl-4">{{ $strings.LabelDisableVibrateOnReset }}</p>
        <span class="material-symbols text-xl ml-2" @click.stop="showInfo('disableSleepTimerResetFeedback')">info</span>
      </div>
      <div class="flex items-center py-3">
        <div class="w-10 flex justify-center" @click="toggleSleepTimerAlmostDoneChime">
          <ui-toggle-switch v-model="settings.enableSleepTimerAlmostDoneChime" @input="saveSettings" />
        </div>
        <p class="pl-4">{{ $strings.LabelSleepTimerAlmostDoneChime }}</p>
        <span class="material-symbols text-xl ml-2" @click.stop="showInfo('enableSleepTimerAlmostDoneChime')">info</span>
      </div>
      <div class="flex items-center py-3">
        <div class="w-10 flex justify-center" @click="toggleAutoSleepTimer">
          <ui-toggle-switch v-model="settings.autoSleepTimer" @input="saveSettings" />
        </div>
        <p class="pl-4">{{ $strings.LabelAutoSleepTimer }}</p>
        <span class="material-symbols text-xl ml-2" @click.stop="showInfo('autoSleepTimer')">info</span>
      </div>
    </template>
    <!-- Auto Sleep timer settings -->
    <div v-if="settings.autoSleepTimer" class="py-3 flex items-center">
      <p class="pr-4 w-36">{{ $strings.LabelStartTime }}</p>
      <ui-text-input type="time" v-model="settings.autoSleepTimerStartTime" style="width: 145px; max-width: 145px" @input="autoSleepTimerTimeUpdated" />
    </div>
    <div v-if="settings.autoSleepTimer" class="py-3 flex items-center">
      <p class="pr-4 w-36">{{ $strings.LabelEndTime }}</p>
      <ui-text-input type="time" v-model="settings.autoSleepTimerEndTime" style="width: 145px; max-width: 145px" @input="autoSleepTimerTimeUpdated" />
    </div>
    <div v-if="settings.autoSleepTimer" class="py-3 flex items-center">
      <p class="pr-4 w-36">{{ $strings.LabelSleepTimer }}</p>
      <div @click.stop="showSleepTimerOptions">
        <ui-text-input :value="sleepTimerLengthOption" readonly append-icon="expand_more" style="width: 145px; max-width: 145px" />
      </div>
    </div>
    <div v-if="settings.autoSleepTimer" class="flex items-center py-3">
      <div class="w-10 flex justify-center" @click="toggleAutoSleepTimerAutoRewind">
        <ui-toggle-switch v-model="settings.autoSleepTimerAutoRewind" @input="saveSettings" />
      </div>
      <p class="pl-4">{{ $strings.LabelAutoSleepTimerAutoRewind }}</p>
      <span class="material-symbols text-xl ml-2" @click.stop="showInfo('autoSleepTimerAutoRewind')">info</span>
    </div>
    <div v-if="settings.autoSleepTimerAutoRewind" class="py-3 flex items-center">
      <p class="pr-4 w-36">{{ $strings.LabelAutoRewindTime }}</p>
      <div @click.stop="showAutoSleepTimerRewindOptions">
        <ui-text-input :value="autoSleepTimerRewindLengthOption" readonly append-icon="expand_more" style="width: 145px; max-width: 145px" />
      </div>
    </div>

    <!-- Data settings -->
    <p class="uppercase text-xs font-semibold text-fg-muted mb-2 mt-10">{{ $strings.HeaderDataSettings }}</p>
    <div class="py-3 flex items-center">
      <p class="pr-4 w-36">{{ $strings.LabelDownloadUsingCellular }}</p>
      <div @click.stop="showDownloadUsingCellularOptions">
        <ui-text-input :value="downloadUsingCellularOption" readonly append-icon="expand_more" style="max-width: 200px" />
      </div>
    </div>
    <div class="py-3 flex items-center">
      <p class="pr-4 w-36">{{ $strings.LabelStreamingUsingCellular }}</p>
      <div @click.stop="showStreamingUsingCellularOptions">
        <ui-text-input :value="streamingUsingCellularOption" readonly append-icon="expand_more" style="max-width: 200px" />
      </div>
    </div>

    <!-- Podcast Settings -->
    <p class="uppercase text-xs font-semibold text-fg-muted mb-2 mt-10">Podcasts & Downloads</p>
    <div class="flex items-center py-3">
      <div class="w-10 flex justify-center" @click="toggleAutoDeletePlayedPodcasts">
        <ui-toggle-switch v-model="settings.autoDeletePlayedPodcasts" @input="saveSettings" />
      </div>
      <p class="pl-4">Auto-Delete Played Podcasts</p>
      <span class="material-symbols text-xl ml-2 cursor-pointer" @click.stop="showInfo('autoDeletePlayedPodcasts')">info</span>
    </div>

    <!-- Android Auto settings -->
    <template v-if="!isiOS">
      <p class="uppercase text-xs font-semibold text-fg-muted mb-2 mt-10">{{ $strings.HeaderAndroidAutoSettings }}</p>
      <div class="py-3 flex items-center">
        <p class="pr-4 w-36">{{ $strings.LabelAndroidAutoBrowseLimitForGrouping }}</p>
        <ui-text-input type="number" v-model="settings.androidAutoBrowseLimitForGrouping" style="width: 145px; max-width: 145px" @input="androidAutoBrowseLimitForGroupingUpdated" />
        <span class="material-symbols text-xl ml-2" @click.stop="showInfo('androidAutoBrowseLimitForGrouping')">info</span>
      </div>
      <div class="py-3 flex items-center">
        <p class="pr-4 w-36">{{ $strings.LabelAndroidAutoBrowseSeriesSequenceOrder }}</p>
        <div @click.stop="showAndroidAutoBrowseSeriesSequenceOrderOptions">
          <ui-text-input :value="androidAutoBrowseSeriesSequenceOrderOption" readonly append-icon="expand_more" style="max-width: 200px" />
        </div>
      </div>

      <!-- Android Auto Setup Card -->
      <div class="mt-3 p-4 rounded-2xl bg-secondary/40 border border-border/50 text-xs text-fg-muted space-y-2.5">
        <div class="flex items-center gap-2 text-fg font-semibold text-sm">
          <span class="material-symbols text-accent text-lg">directions_car</span>
          <span>Car Dashboard Setup (Android Auto)</span>
        </div>
        <p class="leading-relaxed">
          CharcuterieShelf is natively compatible with Android Auto. Because this app is an independent package (<code class="text-accent text-xxs font-mono">com.CharcuterieShelf</code>), Android Auto requires <strong class="text-fg">"Unknown sources"</strong> to be enabled once in Android Auto Developer Settings to display on your vehicle screen:
        </p>
        <div class="bg-primary/50 rounded-xl p-3 border border-border/30 space-y-1.5 font-mono text-xxs text-fg">
          <p><span class="text-accent font-bold">1.</span> Open phone <strong>Settings</strong> &gt; search <strong>Android Auto</strong>.</p>
          <p><span class="text-accent font-bold">2.</span> Scroll to the very bottom and tap <strong>Version</strong> 10 times until Developer mode is enabled.</p>
          <p><span class="text-accent font-bold">3.</span> Tap the <strong>3 dots (⋮)</strong> in the top-right corner &gt; <strong>Developer settings</strong>.</p>
          <p><span class="text-accent font-bold">4.</span> Check the box for <strong class="text-accent">Unknown sources</strong>.</p>
          <p><span class="text-accent font-bold">5.</span> Connect to your car or wireless adapter — CharcuterieShelf will appear!</p>
        </div>
      </div>
    </template>

    <!-- App Updates -->
    <p class="uppercase text-xs font-semibold text-fg-muted mb-3 mt-10">App Updates</p>
    <div class="rounded-2xl bg-primary/30 border border-border/40 p-5 mb-8 shadow-sm">
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center space-x-3">
          <span class="material-symbols text-accent text-2xl">system_update</span>
          <div>
            <h3 class="text-sm font-bold text-fg leading-tight">CharcuterieShelf Updates</h3>
            <p class="text-xs text-fg-muted">Installed: <span class="font-mono text-fg font-semibold">v{{ $config.version }}</span></p>
          </div>
        </div>
        <span v-if="updateAvailable" class="px-2 py-0.5 rounded-full text-2xs font-extrabold bg-accent text-black animate-pulse">
          UPDATE AVAILABLE
        </span>
        <span v-else-if="!isCheckingUpdates" class="px-2 py-0.5 rounded-full text-2xs font-semibold bg-secondary text-fg-muted">
          UP TO DATE
        </span>
      </div>

      <div v-if="updateAvailable && latestRelease" class="bg-accent/10 border border-accent/30 rounded-xl p-3.5 mb-3 flex items-center justify-between">
        <div class="pr-2">
          <p class="text-xs font-bold text-accent">New Version: {{ latestRelease.tagName }}</p>
          <p class="text-2xs text-fg-muted truncate max-w-[200px]">{{ latestRelease.name }}</p>
        </div>
        <button class="px-3 py-1.5 rounded-lg bg-accent text-black font-bold text-xs hover:brightness-105 active:scale-95 transition-transform whitespace-nowrap" @click="openAppUpdateModal">
          View & Install
        </button>
      </div>

      <p class="text-xs text-fg-muted mb-4 leading-relaxed">
        Automatically checks GitHub Releases for new updates and installs APKs directly without requiring manual sideloading.
      </p>

      <div class="flex items-center space-x-3">
        <button
          class="flex-1 py-2.5 px-4 rounded-xl bg-secondary text-fg font-semibold text-xs flex items-center justify-center space-x-2 hover:bg-bg-hover active:scale-95 transition-transform disabled:opacity-50"
          :disabled="isCheckingUpdates"
          @click="checkManualUpdate"
        >
          <span v-if="isCheckingUpdates" class="material-symbols animate-spin text-sm">progress_activity</span>
          <span v-else class="material-symbols text-sm">refresh</span>
          <span>{{ isCheckingUpdates ? 'Checking for Updates...' : 'Check for Updates' }}</span>
        </button>
        <button
          class="py-2.5 px-3 rounded-xl bg-secondary/60 text-fg-muted hover:text-fg text-xs flex items-center justify-center transition-colors"
          title="Open Releases on GitHub"
          @click="openGitHubReleases"
        >
          <span class="material-symbols text-base">open_in_new</span>
        </button>
      </div>
    </div>

    <!-- Support CharcuterieShelf -->
    <p class="uppercase text-xs font-semibold text-fg-muted mb-3 mt-10">Support & Community</p>
    <div class="rounded-2xl bg-amber-500/10 border border-amber-500/20 p-5 mb-8 shadow-sm">
      <div class="flex items-center space-x-3 mb-2">
        <span class="text-2xl">☕</span>
        <div>
          <h3 class="text-base font-bold text-fg leading-tight">Support CharcuterieShelf</h3>
          <p class="text-xs text-fg-muted">by TheMagicSalami</p>
        </div>
      </div>
      <p class="text-sm text-fg/80 leading-relaxed mb-4">
        Built for audio lovers with zero ads, zero trackers, and zero paywalls. If you enjoy CharcuterieShelf, consider supporting ongoing development with a coffee!
      </p>
      <button class="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-bold text-sm flex items-center justify-center space-x-2 shadow-md hover:brightness-105 active:scale-[0.99] transition-all" @click="openBuyMeACoffee">
        <span>☕</span>
        <span>Buy Me a Coffee</span>
      </button>
    </div>

    <!-- Key Features -->
    <p class="uppercase text-xs font-semibold text-fg-muted mb-3 mt-8">Key Features</p>
    <div class="rounded-2xl bg-primary/30 border border-border/40 p-4 mb-8 text-xs text-fg-muted space-y-2 leading-relaxed">
      <p><span class="font-bold text-fg">• Dual Audiobooks & Podcatcher:</span> Seamless playback for self-hosted audiobook and podcast collections.</p>
      <p><span class="font-bold text-fg">• Android Auto Compatibility:</span> Full in-car dashboard playback, media browsing, and search support.</p>
      <p><span class="font-bold text-fg">• Advanced Download Manager:</span> Multi-part background downloads, exponential backoff, per-item retry/cancel, and batch failure cleanup.</p>
      <p><span class="font-bold text-fg">• Dynamic Monet Theming:</span> 14 themes (including AMOLED Monet, Dracula, Tokyo Night, Gruvbox, Rosé Pine) with custom accent color palette selection.</p>
      <p><span class="font-bold text-fg">• Pocket Casts Features:</span> 3-column reorderable favorites grid, trim silence, intro/outro skipping, custom speeds per show, and End of Episode sleep timer.</p>
      <p><span class="font-bold text-fg">• Modern Home Screen Widget:</span> Control playback, view album art, and seek directly from your Android launcher.</p>
      <p><span class="font-bold text-fg">• In-App Metadata & Chapter Editing:</span> Parity with the web client for editing details, chapters, matches, and covers.</p>
      <p><span class="font-bold text-fg">• Smart Local/Remote Switching:</span> Automatically switches to high-speed LAN when connected to designated home Wi-Fi SSIDs.</p>
    </div>

    <!-- Legal, Compliance & Privacy -->
    <p class="uppercase text-xs font-semibold text-fg-muted mb-3 mt-8">Legal, Compliance & Privacy</p>
    <div class="space-y-3 mb-10">
      <!-- Nominative Fair Use -->
      <div class="rounded-xl bg-primary/30 border border-border/40 overflow-hidden">
        <button class="w-full p-3.5 flex items-center justify-between text-left text-xs font-semibold text-fg" @click="toggleLegalSection('trademarks')">
          <span>Nominative Fair Use & Trademarks</span>
          <span class="material-symbols text-base text-fg-muted">{{ openLegalSections.trademarks ? 'expand_less' : 'expand_more' }}</span>
        </button>
        <div v-if="openLegalSections.trademarks" class="px-3.5 pb-3.5 text-2xs text-fg-muted leading-relaxed border-t border-border/20 pt-2">
          All product names, logos, and brands displayed in this application are trademarks or registered trademarks of their respective holders. Use of these marks does not imply any affiliation with, endorsement by, or sponsorship by the trademark holders. Any references to third-party services or metadata providers are strictly nominative fair use for descriptive and identification purposes under 15 U.S.C. § 1125(c)(3)(A).
        </div>
      </div>

      <!-- Open Source Software Licenses -->
      <div class="rounded-xl bg-primary/30 border border-border/40 overflow-hidden">
        <button class="w-full p-3.5 flex items-center justify-between text-left text-xs font-semibold text-fg" @click="toggleLegalSection('licenses')">
          <span>Open Source Software Licenses & Credits</span>
          <span class="material-symbols text-base text-fg-muted">{{ openLegalSections.licenses ? 'expand_less' : 'expand_more' }}</span>
        </button>
        <div v-if="openLegalSections.licenses" class="px-3.5 pb-3.5 text-2xs text-fg-muted leading-relaxed border-t border-border/20 pt-2 space-y-1.5">
          <p>CharcuterieShelf is an independent fork created by TheMagicSalami, built upon and attributing the following open source projects:</p>
          <p>• <strong>Audiobookshelf</strong> (GPL v3) - advplyr & contributors (<a class="text-accent underline cursor-pointer" @click.stop="openUrl('https://github.com/advplyr/audiobookshelf')">audiobookshelf.org</a>)</p>
          <p>• <strong>Pocket Casts Android</strong> (GPL v3) - Automattic (<a class="text-accent underline cursor-pointer" @click.stop="openUrl('https://github.com/Automattic/pocket-casts-android')">pocket-casts-android</a>)</p>
          <p>• <strong>NuxtJS & Vue.js</strong> (MIT License)</p>
          <p>• <strong>Capacitor</strong> (MIT License) - Ionic</p>
          <p>• <strong>ExoPlayer</strong> (Apache 2.0) - Google LLC</p>
        </div>
      </div>

      <!-- Zero-Data Collection Privacy Policy -->
      <div class="rounded-xl bg-primary/30 border border-border/40 overflow-hidden">
        <button class="w-full p-3.5 flex items-center justify-between text-left text-xs font-semibold text-fg" @click="toggleLegalSection('privacy')">
          <span>Zero-Data Collection Privacy Policy (Play Store Ready)</span>
          <span class="material-symbols text-base text-fg-muted">{{ openLegalSections.privacy ? 'expand_less' : 'expand_more' }}</span>
        </button>
        <div v-if="openLegalSections.privacy" class="px-3.5 pb-3.5 text-2xs text-fg-muted leading-relaxed border-t border-border/20 pt-2 space-y-1.5">
          <p><strong>• Zero Telemetry:</strong> CharcuterieShelf collects zero personal information, analytics, crash metrics, or device identifiers.</p>
          <p><strong>• Self-Hosted Architecture:</strong> All requests for audio, chapters, covers, and playback sync connect directly between this application and your self-hosted server. There is no middleman or analytics server.</p>
          <p><strong>• Device Storage:</strong> Downloaded audio files, cache items, and server tokens remain securely stored solely on your local device.</p>
          <p><strong>• Zero Advertising:</strong> Contains zero third-party ad networks, tracking SDKs, or data brokers.</p>
        </div>
      </div>
    </div>

    <div v-show="loading" class="w-full h-full absolute top-0 left-0 flex items-center justify-center z-10">
      <ui-loading-indicator />
    </div>

    <modals-dialog v-model="showMoreMenuDialog" :items="moreMenuItems" :selected="moreMenuSelected" @action="clickMenuAction" />
    <modals-sleep-timer-length-modal v-model="showSleepTimerLengthModal" @change="sleepTimerLengthModalSelection" />
    <modals-auto-sleep-timer-rewind-length-modal v-model="showAutoSleepTimerRewindLengthModal" @change="showAutoSleepTimerRewindLengthModalSelection" />
  </div>
</template>

<script>
import { Dialog } from '@capacitor/dialog'
import { Browser } from '@capacitor/browser'
import jumpLabelMixin from '@/mixins/jumpLabel'

export default {
  mixins: [jumpLabelMixin],
  data() {
    return {
      loading: false,
      deviceData: null,
      showMoreMenuDialog: false,
      showSleepTimerLengthModal: false,
      showAutoSleepTimerRewindLengthModal: false,
      moreMenuSetting: '',
      openLegalSections: {
        trademarks: false,
        licenses: false,
        privacy: false
      },
      settings: {
        disableAutoRewind: false,
        enableAltView: true,
        allowSeekingOnMediaControls: false,
        jumpForwardTime: 10,
        jumpBackwardsTime: 10,
        enableMp3IndexSeeking: false,
        disableShakeToResetSleepTimer: false,
        shakeSensitivity: 'MEDIUM',
        lockOrientation: 0,
        hapticFeedback: 'LIGHT',
        autoSleepTimer: false,
        autoSleepTimerStartTime: '22:00',
        autoSleepTimerEndTime: '06:00',
        sleepTimerLength: 900000, // 15 minutes
        disableSleepTimerFadeOut: false,
        disableSleepTimerResetFeedback: false,
        enableSleepTimerAlmostDoneChime: false,
        autoSleepTimerAutoRewind: false,
        autoSleepTimerAutoRewindTime: 300000, // 5 minutes
        languageCode: 'en-us',
        downloadUsingCellular: 'ALWAYS',
        streamingUsingCellular: 'ALWAYS',
        androidAutoBrowseLimitForGrouping: 100,
        androidAutoBrowseSeriesSequenceOrder: 'ASC',
        autoDeletePlayedPodcasts: true
      },
      theme: 'dark',
      customAccent: '',
      accentColorPalette: [
        { name: 'Theme Default', value: '', hex: '#1ad691' },
        { name: 'Emerald', value: '26 214 145', hex: '#1ad691' },
        { name: 'Electric Cyan', value: '6 182 212', hex: '#06b6d4' },
        { name: 'Sky Blue', value: '56 189 248', hex: '#38bdf8' },
        { name: 'Royal Violet', value: '168 85 247', hex: '#a855f7' },
        { name: 'Hot Pink', value: '236 72 153', hex: '#ec4899' },
        { name: 'Sunset Amber', value: '245 158 11', hex: '#f59e0b' },
        { name: 'Crimson Red', value: '239 68 68', hex: '#ef4444' },
        { name: 'Lime', value: '132 204 22', hex: '#84cc16' }
      ],
      lockCurrentOrientation: false,
      settingInfo: {
        autoDeletePlayedPodcasts: {
          name: 'Auto-Delete Played Podcasts',
          message: 'Automatically delete downloaded podcast audio files from your device when playback reaches the end.'
        },
        disableShakeToResetSleepTimer: {
          name: this.$strings.LabelDisableShakeToReset,
          message: this.$strings.LabelDisableShakeToResetHelp
        },
        autoSleepTimer: {
          name: this.$strings.LabelAutoSleepTimer,
          message: this.$strings.LabelAutoSleepTimerHelp
        },
        disableSleepTimerFadeOut: {
          name: this.$strings.LabelDisableAudioFadeOut,
          message: this.$strings.LabelDisableAudioFadeOutHelp
        },
        disableSleepTimerResetFeedback: {
          name: this.$strings.LabelDisableVibrateOnReset,
          message: this.$strings.LabelDisableVibrateOnResetHelp
        },
        enableSleepTimerAlmostDoneChime: {
          name: this.$strings.LabelSleepTimerAlmostDoneChime,
          message: this.$strings.LabelSleepTimerAlmostDoneChimeHelp
        },
        autoSleepTimerAutoRewind: {
          name: this.$strings.LabelAutoSleepTimerAutoRewind,
          message: this.$strings.LabelAutoSleepTimerAutoRewindHelp
        },
        enableMp3IndexSeeking: {
          name: this.$strings.LabelEnableMp3IndexSeeking,
          message: this.$strings.LabelEnableMp3IndexSeekingHelp
        },
        androidAutoBrowseLimitForGrouping: {
          name: this.$strings.LabelAndroidAutoBrowseLimitForGrouping,
          message: this.$strings.LabelAndroidAutoBrowseLimitForGroupingHelp
        }
      },
      hapticFeedbackItems: [
        {
          text: this.$strings.LabelOff,
          value: 'OFF'
        },
        {
          text: this.$strings.LabelLight,
          value: 'LIGHT'
        },
        {
          text: this.$strings.LabelMedium,
          value: 'MEDIUM'
        },
        {
          text: this.$strings.LabelHeavy,
          value: 'HEAVY'
        }
      ],
      shakeSensitivityItems: [
        {
          text: this.$strings.LabelVeryLow,
          value: 'VERY_LOW'
        },
        {
          text: this.$strings.LabelLow,
          value: 'LOW'
        },
        {
          text: this.$strings.LabelMedium,
          value: 'MEDIUM'
        },
        {
          text: this.$strings.LabelHigh,
          value: 'HIGH'
        },
        {
          text: this.$strings.LabelVeryHigh,
          value: 'VERY_HIGH'
        }
      ],
      downloadUsingCellularItems: [
        {
          text: this.$strings.LabelAskConfirmation,
          value: 'ASK'
        },
        {
          text: this.$strings.LabelAlways,
          value: 'ALWAYS'
        },
        {
          text: this.$strings.LabelNever,
          value: 'NEVER'
        }
      ],
      streamingUsingCellularItems: [
        {
          text: this.$strings.LabelAskConfirmation,
          value: 'ASK'
        },
        {
          text: this.$strings.LabelAlways,
          value: 'ALWAYS'
        },
        {
          text: this.$strings.LabelNever,
          value: 'NEVER'
        }
      ],
      androidAutoBrowseSeriesSequenceOrderItems: [
        {
          text: this.$strings.LabelSequenceAscending,
          value: 'ASC'
        },
        {
          text: this.$strings.LabelSequenceDescending,
          value: 'DESC'
        }
      ]
    }
  },
  computed: {
    updateAvailable() {
      return this.$appUpdater?.updateAvailable || false
    },
    latestRelease() {
      return this.$appUpdater?.latestRelease || null
    },
    isCheckingUpdates() {
      return this.$appUpdater?.isChecking || false
    },
    // This is flipped because alt view was the default until v0.9.61-beta
    enableBookshelfView: {
      get() {
        return !this.settings.enableAltView
      },
      set(val) {
        this.settings.enableAltView = !val
      }
    },
    isiOS() {
      return this.$platform === 'ios'
    },
    jumpForwardSecondsOptions() {
      return this.$store.state.globals.jumpForwardSecondsOptions || []
    },
    jumpBackwardsSecondsOptions() {
      return this.$store.state.globals.jumpBackwardsSecondsOptions || []
    },
    languageOptionItems() {
      return this.$languageCodeOptions || []
    },
    jumpForwardOption() {
      return this.getJumpLabel(this.settings.jumpForwardTime)
    },
    jumpBackwardsOption() {
      return this.getJumpLabel(this.settings.jumpBackwardsTime)
    },
    activeAccentLabel() {
      const match = this.accentColorPalette.find((c) => c.value === this.customAccent)
      return match ? match.name : 'Custom'
    },
    themeOptionItems() {
      return [
        {
          text: this.$strings.LabelThemeDark || 'Default Dark',
          value: 'dark'
        },
        {
          text: this.$strings.LabelThemeBlack || 'OLED Pitch Black',
          value: 'black'
        },
        {
          text: 'Material You (Dynamic Monet)',
          value: 'material-you'
        },
        {
          text: 'Material You AMOLED (Pitch Black Monet)',
          value: 'material-you-amoled'
        },
        {
          text: 'Nord (Arctic Blue)',
          value: 'nord'
        },
        {
          text: 'Catppuccin (Macchiato)',
          value: 'catppuccin'
        },
        {
          text: 'Dracula (Vampire Dark)',
          value: 'dracula'
        },
        {
          text: 'Tokyo Night (Cyberpunk)',
          value: 'tokyo-night'
        },
        {
          text: 'Gruvbox (Retro Warm)',
          value: 'gruvbox'
        },
        {
          text: 'Rosé Pine (Muted Elegance)',
          value: 'rose-pine'
        },
        {
          text: 'Forest (Evergreen)',
          value: 'forest'
        },
        {
          text: 'Sepia (Warm Book)',
          value: 'sepia'
        },
        {
          text: 'Slate (Midnight Blue)',
          value: 'slate'
        },
        {
          text: this.$strings.LabelThemeLight || 'Light',
          value: 'light'
        }
      ]
    },
    shakeSensitivityOption() {
      const item = this.shakeSensitivityItems.find((i) => i.value === this.settings.shakeSensitivity)
      return item?.text || 'Error'
    },
    hapticFeedbackOption() {
      const item = this.hapticFeedbackItems.find((i) => i.value === this.settings.hapticFeedback)
      return item?.text || 'Error'
    },
    languageOption() {
      return this.languageOptionItems.find((i) => i.value === this.settings.languageCode)?.text || ''
    },
    themeOption() {
      return this.themeOptionItems.find((i) => i.value === this.theme)?.text || ''
    },
    sleepTimerLengthOption() {
      if (!this.settings.sleepTimerLength) return this.$strings.LabelEndOfChapter
      const minutes = Number(this.settings.sleepTimerLength) / 1000 / 60
      return `${minutes} min`
    },
    autoSleepTimerRewindLengthOption() {
      const minutes = Number(this.settings.autoSleepTimerAutoRewindTime) / 1000 / 60
      return `${minutes} min`
    },
    downloadUsingCellularOption() {
      const item = this.downloadUsingCellularItems.find((i) => i.value === this.settings.downloadUsingCellular)
      return item?.text || 'Error'
    },
    streamingUsingCellularOption() {
      const item = this.streamingUsingCellularItems.find((i) => i.value === this.settings.streamingUsingCellular)
      return item?.text || 'Error'
    },
    androidAutoBrowseSeriesSequenceOrderOption() {
      const item = this.androidAutoBrowseSeriesSequenceOrderItems.find((i) => i.value === this.settings.androidAutoBrowseSeriesSequenceOrder)
      return item?.text || 'Error'
    },
    moreMenuItems() {
      if (this.moreMenuSetting === 'shakeSensitivity') return this.shakeSensitivityItems
      else if (this.moreMenuSetting === 'hapticFeedback') return this.hapticFeedbackItems
      else if (this.moreMenuSetting === 'language') return this.languageOptionItems
      else if (this.moreMenuSetting === 'theme') return this.themeOptionItems
      else if (this.moreMenuSetting === 'downloadUsingCellular') return this.downloadUsingCellularItems
      else if (this.moreMenuSetting === 'streamingUsingCellular') return this.streamingUsingCellularItems
      else if (this.moreMenuSetting === 'androidAutoBrowseSeriesSequenceOrder') return this.androidAutoBrowseSeriesSequenceOrderItems
      else if (this.moreMenuSetting === 'jumpForward')
        return this.jumpForwardSecondsOptions.map((value) => ({
          text: this.getJumpLabel(value),
          value: value
        }))
      else if (this.moreMenuSetting === 'jumpBackwards')
        return this.jumpBackwardsSecondsOptions.map((value) => ({
          text: this.getJumpLabel(value),
          value: value
        }))
      return []
    },
    moreMenuSelected() {
      if (this.moreMenuSetting === 'jumpForward') return this.settings.jumpForwardTime
      if (this.moreMenuSetting === 'jumpBackwards') return this.settings.jumpBackwardsTime
      if (this.moreMenuSetting === 'language') return this.settings.languageCode
      if (this.moreMenuSetting === 'theme') return this.theme
      if (this.moreMenuSetting === 'downloadUsingCellular') return this.settings.downloadUsingCellular
      if (this.moreMenuSetting === 'streamingUsingCellular') return this.settings.streamingUsingCellular
      if (this.moreMenuSetting === 'androidAutoBrowseSeriesSequenceOrder') return this.settings.androidAutoBrowseSeriesSequenceOrder
      if (this.moreMenuSetting === 'shakeSensitivity') return this.settings.shakeSensitivity
      if (this.moreMenuSetting === 'hapticFeedback') return this.settings.hapticFeedback
      return null
    }
  },
  methods: {
    async checkManualUpdate() {
      await this.$hapticsImpact()
      if (!this.$appUpdater) return
      const res = await this.$appUpdater.checkForUpdate(true)
      if (res?.updateAvailable) {
        this.$eventBus.$emit('open-app-update-modal', res.latestRelease)
      } else if (res?.error) {
        this.$toast.error('Update check failed: ' + res.error)
      } else {
        this.$toast.success('CharcuterieShelf is up to date (v' + this.$config.version + ')')
      }
    },
    openAppUpdateModal() {
      this.$eventBus.$emit('open-app-update-modal', this.latestRelease)
    },
    async openGitHubReleases() {
      try {
        await Browser.open({ url: 'https://github.com/cavant/CharcuterieShelf/releases' })
      } catch (e) {
        window.open('https://github.com/cavant/CharcuterieShelf/releases', '_blank')
      }
    },
    sleepTimerLengthModalSelection(value) {
      this.settings.sleepTimerLength = value
      this.saveSettings()
    },
    showAutoSleepTimerRewindLengthModalSelection(value) {
      this.settings.autoSleepTimerAutoRewindTime = value
      this.saveSettings()
    },
    showSleepTimerOptions() {
      this.showSleepTimerLengthModal = true
    },
    showAutoSleepTimerRewindOptions() {
      this.showAutoSleepTimerRewindLengthModal = true
    },
    showHapticFeedbackOptions() {
      this.moreMenuSetting = 'hapticFeedback'
      this.showMoreMenuDialog = true
    },
    showShakeSensitivityOptions() {
      this.moreMenuSetting = 'shakeSensitivity'
      this.showMoreMenuDialog = true
    },
    showLanguageOptions() {
      this.moreMenuSetting = 'language'
      this.showMoreMenuDialog = true
    },
    showThemeOptions() {
      this.moreMenuSetting = 'theme'
      this.showMoreMenuDialog = true
    },
    showJumpForwardOptions() {
      this.moreMenuSetting = 'jumpForward'
      this.showMoreMenuDialog = true
    },
    showJumpBackwardsOptions() {
      this.moreMenuSetting = 'jumpBackwards'
      this.showMoreMenuDialog = true
    },
    showDownloadUsingCellularOptions() {
      this.moreMenuSetting = 'downloadUsingCellular'
      this.showMoreMenuDialog = true
    },
    showStreamingUsingCellularOptions() {
      this.moreMenuSetting = 'streamingUsingCellular'
      this.showMoreMenuDialog = true
    },
    showAndroidAutoBrowseSeriesSequenceOrderOptions() {
      this.moreMenuSetting = 'androidAutoBrowseSeriesSequenceOrder'
      this.showMoreMenuDialog = true
    },
    clickMenuAction(action) {
      this.showMoreMenuDialog = false
      if (this.moreMenuSetting === 'shakeSensitivity') {
        this.settings.shakeSensitivity = action
        this.saveSettings()
      } else if (this.moreMenuSetting === 'hapticFeedback') {
        this.settings.hapticFeedback = action
        this.hapticFeedbackUpdated(action)
      } else if (this.moreMenuSetting === 'language') {
        this.settings.languageCode = action
        this.saveSettings()
      } else if (this.moreMenuSetting === 'theme') {
        this.theme = action
        this.saveTheme(action)
      } else if (this.moreMenuSetting === 'downloadUsingCellular') {
        this.settings.downloadUsingCellular = action
        this.saveSettings()
      } else if (this.moreMenuSetting === 'streamingUsingCellular') {
        this.settings.streamingUsingCellular = action
        this.saveSettings()
      } else if (this.moreMenuSetting === 'androidAutoBrowseSeriesSequenceOrder') {
        this.settings.androidAutoBrowseSeriesSequenceOrder = action
        this.saveSettings()
      } else if (this.moreMenuSetting === 'jumpForward') {
        this.settings.jumpForwardTime = action
        this.saveSettings()
      } else if (this.moreMenuSetting === 'jumpBackwards') {
        this.settings.jumpBackwardsTime = action
        this.saveSettings()
      }
    },
    saveTheme(theme) {
      if (this.$applyTheme) {
        this.$applyTheme(theme)
      } else {
        document.documentElement.dataset.theme = theme
      }
      this.$localStore.setTheme(theme)
    },
    async selectCustomAccent(colorValue) {
      this.customAccent = colorValue
      await this.$localStore.setCustomAccent(colorValue)
      if (this.$applyCustomAccent) {
        this.$applyCustomAccent(colorValue)
      }
      this.$toast.success(`Accent color set to ${this.activeAccentLabel}`)
    },
    toggleLegalSection(section) {
      if (this.openLegalSections[section] !== undefined) {
        this.openLegalSections[section] = !this.openLegalSections[section]
      }
    },
    async openBuyMeACoffee() {
      await this.openUrl('https://buymeacoffee.com/themagicsalami')
    },
    async openUrl(url) {
      try {
        await Browser.open({ url })
      } catch (e) {
        window.open(url, '_blank')
      }
    },
    autoSleepTimerTimeUpdated(val) {
      if (!val) return // invalid times return falsy
      this.saveSettings()
    },
    androidAutoBrowseLimitForGroupingUpdated(val) {
      if (!val) return // invalid times return falsy
      if (val > 1000) val = 1000
      if (val < 30) val = 30
      this.saveSettings()
    },
    hapticFeedbackUpdated(val) {
      this.$store.commit('globals/setHapticFeedback', val)
      this.saveSettings()
    },
    showInfo(setting) {
      if (this.settingInfo[setting]) {
        Dialog.alert({
          title: this.settingInfo[setting].name,
          message: this.settingInfo[setting].message
        })
      }
    },
    async showConfirmMp3IndexSeeking() {
      const confirmResult = await Dialog.confirm({
        title: this.settingInfo.enableMp3IndexSeeking.name,
        message: this.settingInfo.enableMp3IndexSeeking.message,
        cancelButtonTitle: 'View More'
      })
      if (!confirmResult.value) {
        window.open('https://exoplayer.dev/troubleshooting.html#why-is-seeking-inaccurate-in-some-mp3-files', '_blank')
      }
    },
    toggleEnableMp3IndexSeeking() {
      this.settings.enableMp3IndexSeeking = !this.settings.enableMp3IndexSeeking
      this.saveSettings()
    },
    toggleAutoSleepTimer() {
      this.settings.autoSleepTimer = !this.settings.autoSleepTimer
      this.saveSettings()
    },
    toggleAutoSleepTimerAutoRewind() {
      this.settings.autoSleepTimerAutoRewind = !this.settings.autoSleepTimerAutoRewind
      this.saveSettings()
    },
    toggleDisableSleepTimerFadeOut() {
      this.settings.disableSleepTimerFadeOut = !this.settings.disableSleepTimerFadeOut
      this.saveSettings()
    },
    toggleDisableShakeToResetSleepTimer() {
      this.settings.disableShakeToResetSleepTimer = !this.settings.disableShakeToResetSleepTimer
      this.saveSettings()
    },
    toggleDisableSleepTimerResetFeedback() {
      this.settings.disableSleepTimerResetFeedback = !this.settings.disableSleepTimerResetFeedback
      this.saveSettings()
    },
    toggleSleepTimerAlmostDoneChime() {
      this.settings.enableSleepTimerAlmostDoneChime = !this.settings.enableSleepTimerAlmostDoneChime
      this.saveSettings()
    },
    toggleDisableAutoRewind() {
      this.settings.disableAutoRewind = !this.settings.disableAutoRewind
      this.saveSettings()
    },
    toggleEnableAltView() {
      this.settings.enableAltView = !this.settings.enableAltView
      this.saveSettings()
    },
    toggleAllowSeekingOnMediaControls() {
      this.settings.allowSeekingOnMediaControls = !this.settings.allowSeekingOnMediaControls
      this.saveSettings()
    },
    toggleAutoDeletePlayedPodcasts() {
      this.settings.autoDeletePlayedPodcasts = !this.settings.autoDeletePlayedPodcasts
      this.saveSettings()
    },
    getCurrentOrientation() {
      const orientation = window.screen?.orientation || {}
      const type = orientation.type || ''

      if (type.includes('landscape')) return 'LANDSCAPE'
      return 'PORTRAIT' // default
    },
    toggleLockOrientation() {
      this.lockCurrentOrientation = !this.lockCurrentOrientation
      if (this.lockCurrentOrientation) {
        this.settings.lockOrientation = this.getCurrentOrientation()
      } else {
        this.settings.lockOrientation = 'NONE'
      }
      this.$setOrientationLock(this.settings.lockOrientation)
      this.saveSettings()
    },
    async saveSettings() {
      await this.$hapticsImpact()
      const updatedDeviceData = await this.$db.updateDeviceSettings({ ...this.settings })
      if (updatedDeviceData) {
        this.$store.commit('setDeviceData', updatedDeviceData)
        this.deviceData = updatedDeviceData
        this.$setLanguageCode(updatedDeviceData.deviceSettings?.languageCode || 'en-us')
        this.setDeviceSettings()
      }
    },
    setDeviceSettings() {
      const deviceSettings = this.deviceData.deviceSettings || {}
      this.settings.disableAutoRewind = !!deviceSettings.disableAutoRewind
      this.settings.enableAltView = !!deviceSettings.enableAltView
      this.settings.allowSeekingOnMediaControls = !!deviceSettings.allowSeekingOnMediaControls
      this.settings.autoDeletePlayedPodcasts = deviceSettings.autoDeletePlayedPodcasts !== undefined ? !!deviceSettings.autoDeletePlayedPodcasts : true
      this.settings.jumpForwardTime = deviceSettings.jumpForwardTime || 10
      this.settings.jumpBackwardsTime = deviceSettings.jumpBackwardsTime || 10
      this.settings.enableMp3IndexSeeking = !!deviceSettings.enableMp3IndexSeeking

      this.settings.lockOrientation = deviceSettings.lockOrientation || 'NONE'
      this.lockCurrentOrientation = this.settings.lockOrientation !== 'NONE'
      this.settings.hapticFeedback = deviceSettings.hapticFeedback || 'LIGHT'

      this.settings.disableShakeToResetSleepTimer = !!deviceSettings.disableShakeToResetSleepTimer
      this.settings.shakeSensitivity = deviceSettings.shakeSensitivity || 'MEDIUM'
      this.settings.autoSleepTimer = !!deviceSettings.autoSleepTimer
      this.settings.autoSleepTimerStartTime = deviceSettings.autoSleepTimerStartTime || '22:00'
      this.settings.autoSleepTimerEndTime = deviceSettings.autoSleepTimerEndTime || '06:00'
      this.settings.sleepTimerLength = !isNaN(deviceSettings.sleepTimerLength) ? deviceSettings.sleepTimerLength : 900000 // 15 minutes
      this.settings.disableSleepTimerFadeOut = !!deviceSettings.disableSleepTimerFadeOut
      this.settings.disableSleepTimerResetFeedback = !!deviceSettings.disableSleepTimerResetFeedback
      this.settings.enableSleepTimerAlmostDoneChime = !!deviceSettings.enableSleepTimerAlmostDoneChime

      this.settings.autoSleepTimerAutoRewind = !!deviceSettings.autoSleepTimerAutoRewind
      this.settings.autoSleepTimerAutoRewindTime = !isNaN(deviceSettings.autoSleepTimerAutoRewindTime) ? deviceSettings.autoSleepTimerAutoRewindTime : 300000 // 5 minutes

      this.settings.languageCode = deviceSettings.languageCode || 'en-us'

      this.settings.downloadUsingCellular = deviceSettings.downloadUsingCellular || 'ALWAYS'
      this.settings.streamingUsingCellular = deviceSettings.streamingUsingCellular || 'ALWAYS'

      this.settings.androidAutoBrowseLimitForGrouping = deviceSettings.androidAutoBrowseLimitForGrouping
      this.settings.androidAutoBrowseSeriesSequenceOrder = deviceSettings.androidAutoBrowseSeriesSequenceOrder || 'ASC'
    },
    async init() {
      this.loading = true
      this.theme = (await this.$localStore.getTheme()) || 'dark'
      this.customAccent = (await this.$localStore.getCustomAccent()) || ''
      this.deviceData = await this.$db.getDeviceData()
      this.$store.commit('setDeviceData', this.deviceData)
      this.setDeviceSettings()
      this.loading = false
    }
  },
  mounted() {
    this.init()
  }
}
</script>
