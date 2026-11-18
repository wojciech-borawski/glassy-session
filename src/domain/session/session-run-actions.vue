<script setup lang="ts">
import NButton from '@/ui/n-button/index.vue'
import type { Progress } from './model/focus-session'

defineProps<{
  name: string
  progress: Progress
}>()

defineEmits<{
  pause: []
  resume: []
  skip: []
  endEarly: []
}>()

const { t } = useI18n()
</script>

<template>
  <NButton v-if="progress.state === 'paused'" variant="primary" icon="play" :label="t('focusSession.action.resume', { name })" @click="$emit('resume')">{{ t('focusSession.action.resumeShort') }}</NButton>
  <NButton v-else variant="primary" icon="pause" :label="t('focusSession.action.pause', { name })" @click="$emit('pause')">{{ t('focusSession.action.pauseShort') }}</NButton>
  <NButton v-if="progress.state === 'break'" icon="skip-forward" :label="t('focusSession.action.skip', { name })" @click="$emit('skip')">{{ t('focusSession.action.skipShort') }}</NButton>
  <NButton :label="t('focusSession.action.endEarly', { name })" @click="$emit('endEarly')">{{ t('focusSession.action.endEarlyShort') }}</NButton>
</template>
