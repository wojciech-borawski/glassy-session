<script setup lang="ts">
import OwnAudioFiles from '@/domain/music/own-audio-files.vue'
import SoundSettings from '@/domain/sound/sound-settings.vue'
import NButton from '@/ui/n-button/index.vue'
import NCard from '@/ui/n-card/index.vue'
import NTag from '@/ui/n-tag/index.vue'
import { themeNames, type ThemeVersionChoice } from '@/ui/n-theme/themes'
import { useThemeChoice } from '../theme-choice'
import AboutSection from './components/about-section.vue'
import OverlaySection from './components/overlay-section.vue'

const versions: ThemeVersionChoice[] = ['system', 'light', 'dark']

const { t } = useI18n()
const { theme, version, chooseTheme, chooseVersion } = useThemeChoice()
</script>

<template>
  <section class="settings__section">
    <h2 class="settings__heading">{{ t('soundSettings.heading') }}</h2>
    <SoundSettings />
    <OwnAudioFiles />
  </section>
  <OverlaySection />
  <section class="settings__section">
    <h2 class="settings__heading">{{ t('theme.heading') }}</h2>
    <div class="settings__versions">
      <NButton
        v-for="choice in versions"
        :key="choice"
        class="settings__version"
        :pressed="version === choice"
        @click="chooseVersion(choice)"
      >
        {{ t(`theme.version.${choice}`) }}
      </NButton>
    </div>
    <NCard
      v-for="name in themeNames"
      :key="name"
      as="button"
      class="settings__theme"
      :aria-pressed="theme === name"
      @click="chooseTheme(name)"
    >
      <b class="settings__theme-name">{{ t(`theme.${name}.name`) }}</b>
      <span class="settings__theme-description">{{ t(`theme.${name}.description`) }}</span>
      <NTag v-if="theme === name" class="settings__selected">{{ t('theme.selected') }}</NTag>
    </NCard>
  </section>
  <AboutSection />
</template>

<style scoped>
.settings__section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.settings__heading {
  margin: 0;
  color: var(--n-text-muted);
  font-size: 13px;
  font-weight: var(--n-font-weight-strong);
}

.settings__versions {
  display: flex;
  gap: 6px;
}

.settings__version {
  flex: 1;
}

.settings__theme[aria-pressed="true"] {
  border-color: var(--n-accent);
}

.settings__theme-name {
  font-weight: var(--n-font-weight-strong);
}

.settings__theme-description {
  color: var(--n-text-muted);
  font-size: 11.5px;
}

.settings__selected {
  align-self: flex-start;
}
</style>
