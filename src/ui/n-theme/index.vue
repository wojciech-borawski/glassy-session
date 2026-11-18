<script setup lang="ts">
import type { ThemeName, ThemeVersionChoice } from './themes'

const props = defineProps<{
  theme: ThemeName
  version: ThemeVersionChoice
}>()

const darkQuery = window.matchMedia('(prefers-color-scheme: dark)')
const systemPrefersDark = ref(darkQuery.matches)
function followSystem() {
  systemPrefersDark.value = darkQuery.matches
}
onMounted(() => darkQuery.addEventListener('change', followSystem))
onUnmounted(() => darkQuery.removeEventListener('change', followSystem))

const version = computed(() => {
  if (props.version !== 'system') return props.version
  return systemPrefersDark.value ? 'dark' : 'light'
})
</script>

<template>
  <div class="n-theme" :data-theme="theme" :data-version="version">
    <slot />
  </div>
</template>

<style scoped>
.n-theme {
  display: contents;
  color: var(--n-text);
  font-family: var(--n-font);
  font-size: 13px;
  line-height: 1.4;

  --n-scrim: rgba(8, 12, 24, .45);
  --n-shadow-dialog: 0 16px 48px rgba(0, 0, 0, .4);
  --n-shadow-snackbar: 0 6px 20px rgba(0, 0, 0, .25);
  --n-focus-ring: 2px solid var(--n-accent);
  --n-card-gloss: none;
  --n-button-background: var(--n-surface);
  --n-button-hover-background: var(--n-surface-soft);
  --n-button-primary-background: var(--n-accent);
  --n-button-primary-border: transparent;
  --n-button-primary-shadow: none;
  --n-button-primary-text-shadow: none;
  --n-progress-fill: var(--n-accent);
  --n-tab-current-label: var(--n-accent);
  --n-scrollbar-thumb: color-mix(in srgb, var(--n-text-muted) 55%, transparent);
  --n-scrollbar-thumb-hover: color-mix(in srgb, var(--n-text-muted) 80%, transparent);
}

.n-theme[data-theme="frost"] {
  --n-radius: 8px;
  --n-radius-large: 12px;
  --n-radius-control: 5px;
  --n-font: "Segoe UI Variable", "Segoe UI", system-ui, sans-serif;
  --n-font-weight-strong: 600;
}

.n-theme[data-theme="lagoon"] {
  --n-radius: 16px;
  --n-radius-large: 22px;
  --n-radius-control: 999px;
  --n-font: "Segoe UI", Frutiger, "Trebuchet MS", sans-serif;
  --n-font-weight-strong: 600;
  --n-button-primary-background: linear-gradient(180deg, #9df07a 0%, #3cc13b 50%, #1f9e2c 51%, #58d05a 100%);
  --n-button-primary-border: #1c8a28;
  --n-button-primary-shadow: inset 0 1px 0 rgba(255, 255, 255, .8), 0 2px 4px rgba(0, 0, 0, .2);
  --n-progress-fill: linear-gradient(180deg, #8be86a, #1f9e2c);
}

.n-theme[data-theme="pebble"] {
  --n-radius: 12px;
  --n-radius-large: 16px;
  --n-radius-control: 999px;
  --n-font: Cantarell, Inter, "Noto Sans", system-ui, sans-serif;
  --n-font-weight-strong: 700;
  --n-tab-current-label: var(--n-text);
}

.n-theme[data-theme="frost"][data-version="light"] {
  color-scheme: light;
  --n-backdrop: radial-gradient(circle at 80% 10%, #9cc9ff 0, transparent 45%), radial-gradient(circle at 10% 90%, #b9d7ff 0, transparent 50%), radial-gradient(circle at 60% 70%, #d6c8ff 0, transparent 40%), #e9eff7;
  --n-app: rgba(243, 246, 250, .62);
  --n-surface: rgba(255, 255, 255, .66);
  --n-float-app: rgba(243, 246, 250, .68);
  --n-float-surface: rgba(255, 255, 255, .14);
  --n-float-text-muted: #363a43;
  --n-surface-soft: rgba(255, 255, 255, .4);
  --n-text: #191b20;
  --n-text-muted: #525a66;
  --n-line: rgba(255, 255, 255, .85);
  --n-accent: #0067c0;
  --n-calm: #107c41;
  --n-warning: #a8480f;
  --n-on-accent: #ffffff;
  --n-track: rgba(25, 27, 32, .13);
  --n-shadow: 0 2px 10px rgba(20, 40, 80, .1), inset 0 1px 0 rgba(255, 255, 255, .7);
}

.n-theme[data-theme="frost"][data-version="dark"] {
  color-scheme: dark;
  --n-backdrop: radial-gradient(circle at 80% 10%, #123a7a 0, transparent 45%), radial-gradient(circle at 10% 90%, #0b4a6e 0, transparent 50%), radial-gradient(circle at 60% 70%, #3a2a6e 0, transparent 40%), #0e1420;
  --n-app: rgba(28, 31, 38, .6);
  --n-surface: rgba(52, 56, 66, .58);
  --n-float-app: rgba(16, 18, 24, .7);
  --n-float-surface: rgba(52, 56, 66, .14);
  --n-float-text-muted: #d9dde3;
  --n-surface-soft: rgba(70, 75, 88, .45);
  --n-text: #f3f4f6;
  --n-text-muted: #b3bac6;
  --n-line: rgba(255, 255, 255, .12);
  --n-accent: #4cc2ff;
  --n-calm: #6ccb5f;
  --n-warning: #f3a871;
  --n-on-accent: #06131d;
  --n-track: rgba(255, 255, 255, .16);
  --n-shadow: 0 2px 12px rgba(0, 0, 0, .3), inset 0 1px 0 rgba(255, 255, 255, .08);
}

.n-theme[data-theme="lagoon"][data-version="light"] {
  color-scheme: light;
  --n-backdrop: radial-gradient(circle at 85% 12%, rgba(255, 255, 255, .75) 0, transparent 18%), radial-gradient(circle at 12% 80%, rgba(255, 255, 255, .5) 0, transparent 14%), linear-gradient(165deg, #7fd8ff 0%, #2a9df4 46%, #5ec9a0 78%, #8fe07a 100%);
  --n-app: rgba(255, 255, 255, .26);
  --n-surface: rgba(255, 255, 255, .6);
  --n-float-app: rgba(255, 255, 255, .67);
  --n-float-surface: rgba(255, 255, 255, .14);
  --n-float-text-muted: #144261;
  --n-surface-soft: rgba(255, 255, 255, .38);
  --n-text: #08324f;
  --n-text-muted: #1f5273;
  --n-line: rgba(255, 255, 255, .95);
  --n-accent: #128a35;
  --n-calm: #7048c0;
  --n-warning: #9a3d00;
  --n-on-accent: #ffffff;
  --n-track: rgba(8, 50, 79, .16);
  --n-shadow: 0 8px 22px rgba(0, 60, 120, .2), inset 0 1px 0 #ffffff, inset 0 -1px 0 rgba(255, 255, 255, .3);
  --n-card-gloss: linear-gradient(180deg, rgba(255, 255, 255, .55), rgba(255, 255, 255, .05));
  --n-button-background: linear-gradient(180deg, rgba(255, 255, 255, .95), rgba(216, 238, 252, .8));
  --n-button-hover-background: var(--n-button-background);
  --n-button-primary-text-shadow: 0 1px 1px rgba(0, 0, 0, .3);
}

.n-theme[data-theme="lagoon"][data-version="dark"] {
  color-scheme: dark;
  --n-backdrop: radial-gradient(circle at 85% 12%, rgba(140, 220, 255, .28) 0, transparent 18%), radial-gradient(circle at 12% 80%, rgba(120, 255, 190, .18) 0, transparent 16%), linear-gradient(165deg, #041a33 0%, #0a3f6e 46%, #0b5a58 78%, #166a34 100%);
  --n-app: rgba(6, 26, 48, .42);
  --n-surface: rgba(22, 66, 104, .55);
  --n-float-app: rgba(4, 20, 38, .69);
  --n-float-surface: rgba(22, 66, 104, .14);
  --n-float-text-muted: #d0e9f7;
  --n-surface-soft: rgba(34, 88, 130, .42);
  --n-text: #eaf7ff;
  --n-text-muted: #a9d3ea;
  --n-line: rgba(160, 220, 255, .35);
  --n-accent: #6fe37a;
  --n-calm: #c4a8ff;
  --n-warning: #ffb877;
  --n-on-accent: #05300f;
  --n-track: rgba(255, 255, 255, .18);
  --n-shadow: 0 8px 22px rgba(0, 10, 30, .45), inset 0 1px 0 rgba(255, 255, 255, .25);
  --n-card-gloss: linear-gradient(180deg, rgba(255, 255, 255, .12), rgba(255, 255, 255, .01));
  --n-button-background: linear-gradient(180deg, rgba(96, 160, 210, .5), rgba(22, 66, 110, .6));
  --n-button-hover-background: var(--n-button-background);
}

.n-theme[data-theme="pebble"][data-version="light"] {
  color-scheme: light;
  --n-backdrop: radial-gradient(circle at 15% 15%, #d9ccf5 0, transparent 45%), radial-gradient(circle at 85% 80%, #c5dcf7 0, transparent 50%), radial-gradient(circle at 70% 20%, #f7dcc8 0, transparent 35%), #f6f5f4;
  --n-app: rgba(250, 250, 250, .6);
  --n-surface: rgba(255, 255, 255, .72);
  --n-float-app: rgba(250, 250, 250, .68);
  --n-float-surface: rgba(255, 255, 255, .14);
  --n-float-text-muted: #3e3d43;
  --n-surface-soft: rgba(234, 234, 238, .62);
  --n-text: #1e1e22;
  --n-text-muted: #5e5c64;
  --n-line: rgba(0, 0, 0, .1);
  --n-accent: #1c71d8;
  --n-calm: #1a7f4b;
  --n-warning: #a84300;
  --n-on-accent: #ffffff;
  --n-track: rgba(0, 0, 0, .12);
  --n-shadow: 0 1px 6px rgba(0, 0, 0, .12), inset 0 1px 0 rgba(255, 255, 255, .7);
}

.n-theme[data-theme="pebble"][data-version="dark"] {
  color-scheme: dark;
  --n-backdrop: radial-gradient(circle at 15% 15%, #3d2b6b 0, transparent 45%), radial-gradient(circle at 85% 80%, #1a4a7a 0, transparent 50%), radial-gradient(circle at 70% 20%, #7a3b1f 0, transparent 35%), #17171b;
  --n-app: rgba(30, 30, 32, .58);
  --n-surface: rgba(58, 58, 62, .56);
  --n-float-app: rgba(20, 20, 22, .69);
  --n-float-surface: rgba(58, 58, 62, .14);
  --n-float-text-muted: #e7e7e6;
  --n-surface-soft: rgba(82, 82, 88, .46);
  --n-text: #ffffff;
  --n-text-muted: #c4c3c0;
  --n-line: rgba(255, 255, 255, .1);
  --n-accent: #62a0ea;
  --n-calm: #57e389;
  --n-warning: #ffa348;
  --n-on-accent: #0d1f38;
  --n-track: rgba(255, 255, 255, .17);
  --n-shadow: 0 2px 10px rgba(0, 0, 0, .35), inset 0 1px 0 rgba(255, 255, 255, .07);
}
</style>

<style>
:where(.n-theme *) {
  scrollbar-width: thin;
  scrollbar-color: var(--n-scrollbar-thumb) transparent;
}

:where(.n-theme *)::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

:where(.n-theme *)::-webkit-scrollbar-track {
  background: transparent;
}

:where(.n-theme *)::-webkit-scrollbar-thumb {
  border: 2px solid transparent;
  border-radius: 999px;
  background: var(--n-scrollbar-thumb) padding-box;
}

:where(.n-theme *)::-webkit-scrollbar-thumb:hover {
  background: var(--n-scrollbar-thumb-hover) padding-box;
}
</style>
