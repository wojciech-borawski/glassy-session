<script setup lang="ts">
import AlarmDialog from '@/domain/alarm/alarm-dialog.vue'
import AlarmList from '@/domain/alarm/alarm-list.vue'
import type { Alarm, AlarmDetails } from '@/domain/alarm/model/alarm'
import { useStoredAlarms } from '@/domain/alarm/stored-alarms'
import { useAlarmCommands } from '@/domain/alarm/use-alarm-commands'
import { useDisplayClock } from '@/domain/display-clock'
import { localDayOf } from '@/domain/tracking/local-day'
import NButton from '@/ui/n-button/index.vue'

const { t } = useI18n()
const headingId = useId()
const { alarms } = useStoredAlarms()
const now = useDisplayClock()
const commands = useAlarmCommands()

const today = computed(() => localDayOf(now.value).day)
const dialogOpen = ref(false)
const editing = shallowRef<Alarm | null>(null)

function openDialog(alarm: Alarm | null) {
  editing.value = alarm
  dialogOpen.value = true
}

async function remove() {
  if (editing.value !== null && await commands.remove(editing.value) === null) {
    dialogOpen.value = false
  }
}

async function save(details: AlarmDetails) {
  const refusal = editing.value === null ? await commands.add(details) : await commands.change(editing.value, details)
  if (refusal === null) {
    dialogOpen.value = false
  }
}
</script>

<template>
  <section class="alarms" :aria-labelledby="headingId">
    <header class="alarms__header">
      <h2 :id="headingId" class="alarms__heading">{{ t('alarms.allAlarms') }}</h2>
      <NButton icon="plus" @click="openDialog(null)">{{ t('alarms.new') }}</NButton>
    </header>
    <AlarmList :alarms="alarms" @switch-on="commands.switchOn" @switch-off="commands.switchOff" @edit="openDialog" />
    <p class="alarms__hint">{{ t('alarms.hint') }}</p>
    <AlarmDialog :open="dialogOpen" :alarm="editing" :today="today" :now="now" @save="save" @remove="remove" @close="dialogOpen = false" />
  </section>
</template>

<style scoped>
.alarms {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.alarms__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.alarms__heading {
  margin: 0;
  color: var(--n-text-muted);
  font-size: 13px;
  font-weight: var(--n-font-weight-strong);
}

.alarms__hint {
  margin: 0;
  color: var(--n-text-muted);
  font-size: 11.5px;
}
</style>
