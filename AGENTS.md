# GlassySession

A browser extension built with WXT and Vue 3, with its own component kit in `src/ui`. Read this before changing anything.

## Language

[glossary.md](glossary.md) owns the domain terms. Use them in code names, test names, UI text keys and commit messages. When a term is missing or wrong, fix the glossary in the same change.

## Where code goes

```
src/
  application/     WXT entrypoints, one folder per extension context: background, popup, content (the overlay)
  domain/          one folder per domain area, for example timer/, and command/ where every command runs
  infrastructure/  browser adapters in browser/, in-memory adapters in memory/, and Vue plugin setup
  ui/              presentational components with no domain knowledge
  utils/           pure helpers
  locales/
```

- Imports point one way: `utils` imports nothing from the project, `ui` imports only `utils`, `domain` imports `ui` and `utils`, `infrastructure` implements `domain` ports, `application` wires them together. Lint enforces this, and which areas each domain area may import, in `AREA_IMPORTS` in `eslint.config.js`.
- Domain areas are `timer`, `session`, `tracking`, `alarm`, `overlay`, `sound` and `music`. Inside an area, `model/` holds pure functions and types with no Vue and no browser, and the code beside it builds on it. An area's `ports.ts` declares the ports for the data it owns. `timer/timer-engine.ts` and `session/session-engine.ts` hold the use cases the background runs on timers and focus sessions. Both run every command through the one runner in `command/command-runner.ts`, the one place that loads, settles and saves timers and sessions together, in one write through the `TimersAndSessionsStore` port in `command/ports.ts`, records their spans as tracked time and the repeat day results of each repeating task that comes back, sets and cancels wakes, rings and chimes, and refuses a change that would use a task in two places.
- `domain/command/` is not an area. It holds what both engines share: the runner, the command queue, the wake port and the outcome types. It imports the areas' models and ports, and the areas import only its types, so the timer area never imports the session area. Views that show timers take them from `useStoredAsOfNow()` in `command/stored-as-of-now.ts`, which settles the stored timers and focus sessions at the display clock's moment with the runner's own `settledAsOf`, once per tick for every view that reads them, so a view shows what the background would store. Focus session views, their dialogs and the overlay take sessions from it too, and lint stops a `.vue` file from importing `useStoredTimers` or `useStoredSessions`.
- Alarms touch no task, so `alarm/alarm-engine.ts` runs alarm commands in its own command queue over their own stored item, not through the runner. It shares the wake scheduler, with wakes of its own kind. Each command first settles the alarms from the moment stored with them as checked up to, so a ring that came while the background was stopped is rung or told as missed. Other contexts send alarm commands with `sendAlarmCommand` and follow `readStoredAlarms` and `watchStoredAlarms`. Components reach them through the `StoredAlarms` port in `domain/alarm/ports.ts`, taken with `useStoredAlarms()`, and views send them through `useAlarmCommands()`, which ends each in a snackbar line as `useTimerCommands()` does.
- The overlay is the content script's app, in `src/application/content/`, inside a shadow root. It sends timer and focus session commands like the popup and shows only pinned ones. Its corner, whether it is collapsed and whether it shows at all are overlay settings, which the background does not own: the overlay and the popup's Settings save them through the `StoredOverlaySettings` port in `domain/overlay/ports.ts`, taken with `useStoredOverlaySettings()`. The `overlay` area holds no timer or session code, so the content app places the pinned rows of the timer and session areas inside its panel. The content script adds the overlay to a page, in a closed shadow root, only while something is pinned and the overlay is switched on, as `followOverlayShown()` in `application/content/overlay-shown.ts` tells it, so a page with nothing pinned holds no element of the extension and runs no display clock.
- `domain/sound/` is the area every sound shares. Every sound plays through the `SoundPlayer` port in its `ports.ts`. The background's ringers and chimer play the ring sound or the chime after their system notification, at the volume in the sound settings, which the popup saves through the `SoundSettingsStore` port and the background reads at each ring. A ring or chime starts its sound without waiting for it to play, and a sound that cannot play is logged and never fails or holds up the command that rang. Chromium plays through the offscreen document in `application/offscreen/`, which only the Chrome build has and asks permission for. Firefox plays in its background page with `createPagePlayer()`, which the popup also uses for previews. The person's own audio files are kept once in IndexedDB through the `AudioFileStore` port, for rings, chimes and playlists alike.
- `domain/music/` owns playlists and background sounds. Both live in one stored item, not on timers or focus sessions, so the timer and session areas know nothing of music: their dialogs leave a `sound` slot that the popup fills with the background sound fields. `music/music-engine.ts` runs music commands in its own command queue, like alarms. Other contexts send them with `sendMusicCommand` and follow `readStoredMusic` and `watchStoredMusic`, and components reach them through the `StoredPlaylists` port in `domain/music/ports.ts`, taken with `useStoredPlaylists()`, and send them through `useMusicCommands()`. A playlist keeps its files in the sound area's `AudioFileStore`, and the engine forgets a file's bytes only once no playlist lists it and no ring sound or chime plays it. The background also hands it the files a change to the stored timers, alarms or sound settings let go of, through `watchAudioFilesLetGo`, and Settings > Sounds lists the files with a Delete the engine refuses, naming what still plays it. A timer or alarm dialog holds a file picked in it, through `holdPickedSounds()`, and keeps it only as it saves. Removing a timer or focus session takes its background sound away in the background, right after the remove command.
- `music/playback-engine.ts` plays the heard background sound through the `SoundPlayer` port's file methods, as the pure model in `music/model/playback.ts` says, over the playback stored in its own item through the `PlaybackStore` port. It shares the music command queue, so the music engine has it follow each music change inside that command's turn. The command runner hands it what the sound owners did, worked out by `command/sound-owner-events.ts` from the timers and sessions before and after each command, and does not wait for it, so a player that hangs never holds up a timer or session command. Sound commands from other contexts go through `sendSoundCommand`. The player reports where it paused, when a file ended, when a file cannot play, which the playback model counts one after the other so a playlist none of whose files can play stops as paused instead of going round, and, every 15 seconds while a file plays, how far into it it got, which the engine stores apart from the playback, in an item of its own that the popup and the overlay do not watch, so open views are not redrawn every 15 seconds. That report is the audio element's own position, read by an interval in the page that plays it, the offscreen document or the Firefox background page, and counts no time in the service worker, so it keeps the rule against intervals below. At each start the background has the player play the stored sound again when the player no longer has it, as after Chromium closed the offscreen document, but only after settling the timers, focus sessions and alarms up to now, so an owner that finished while the browser was closed never plays. The popup never plays background sounds. Their controls are `music/sound-controls.vue`, which the timer and session components take in a `sound` slot. It reads the stored playback through the `StoredHeardSound` port in `domain/music/ports.ts`, taken with `useStoredHeardSound()`, and sends through `useSoundCommands()`, which shows the snackbar only for a refusal. Its volume, `music/sound-volume.vue`, changes the background sound through the `StoredPlaylists` port with `useSoundVolume()`. `provideStoredPlaylists` provides the stored heard sound too, and the overlay provides only `createBrowserStoredHeardSound()`, so the content script never makes the audio file store.
- All durations and moments in domain code are numbers of milliseconds, typed `Duration` and `Moment` from `src/utils/time/units.ts`. The current moment is always passed in, never read from the system clock inside `domain`.
- Project code is imported explicitly. Auto-imports cover Vue, vue-router, vue-i18n and WXT only.
- `domain` never touches the `browser` API. It reaches the browser through ports that `infrastructure` implements.
- Only the background changes timers and focus sessions. Other contexts send it commands with `sendTimerCommand` and `sendSessionCommand`, read with `readStoredTimers` and `readStoredSessions` and re-render on `watchStoredTimers` and `watchStoredSessions`, all from `src/infrastructure/browser/`. They never touch storage keys, which `storage-items.ts` owns. Commands are declared in `src/domain/timer/commands.ts` and `src/domain/session/commands.ts`.
- Components reach timers through the `StoredTimers` port in `domain/timer/ports.ts`, taken with `useStoredTimers()`. The popup provides `createBrowserStoredTimers()`, and Storybook and component tests provide `createMemoryStoredTimers()`, which runs the real engine in memory. Components draw remaining time for the moment `useDisplayClock()` gives, which ticks in the popup and is moved by hand in tests. Every value shown comes from a stored timer and that moment through the model's functions.
- Views send timer commands through `useTimerCommands()`, which ends every command in a snackbar line saying what it did or why it was refused. The popup's `app.vue` provides the stored timers, the display clock and the snackbar. Pages stay thin: they place domain components, which take props and emit events.
- Focus sessions follow the same pattern: the `StoredSessions` port in `domain/session/ports.ts`, taken with `useStoredSessions()`, and `useSessionCommands()` to send them, which ends every command in a snackbar line too. `createMemoryBackground()` in `src/infrastructure/memory/background.ts` gives both ports over one set of in-memory adapters, because a command of either kind settles timers and focus sessions alike.
- The background's system notifications take their text from `infrastructure/browser/notification-texts.ts`, a plain lookup, so the background bundle carries no vue-i18n.
- The background reads the clock only in `now()` in `src/application/background/run-engines.ts`, and registers its listeners there.
- A background service worker can stop at any moment. Keep no timer state in memory there and never count time with intervals. Derive remaining time from the stored moment the timer started running and the clock. A wake less than 30 seconds away also gets a timeout in the worker, since Chromium may hold a packed extension's alarm back that long; its alarm stays as the backstop, and a wake that comes twice only settles again.
- The popup is the whole app. There is no separate full page, so every view fits the popup.
- Add a port only when it has two implementations, the browser one and an in-memory one used by tests and Storybook. In-memory adapters live in `src/infrastructure/memory/` and import no test framework.

## Tooling

- `wxt.config.ts` owns the manifest and the auto-imports. `vite.plugins.ts` owns the Vite plugins shared by the build, Vitest and Storybook. Do not repeat either list elsewhere.
- Use `browser` from WXT, not the `chrome` global.
- The extension targets Chromium and Firefox. An API that only one of them has, such as the offscreen document, sits behind a port with one adapter per browser, and the manifest asks for it only in that browser's build.
- Generated folders `.wxt` and `.output` are not edited or committed.

## Checks

Run from the repository root.

| Check | Command |
|---|---|
| Types | `npx vue-tsc --noEmit` |
| Tests | `npx vitest run` |
| Lint | `npx eslint .` |
| Extension build | `npx wxt build` |
| Firefox build | `npx wxt build -b firefox` |
| Storybook build | `npx storybook build` |

## Working rules

- Build behaviour test-first: one failing test, the least code to pass it, then the next test.
- Tests sit next to the code they cover as `*.test.ts`. Stories sit next to their component as `*.stories.ts`.
- Commit messages are conventional (`feat:`, `fix:`, `refactor:`, `build:`, `test:`, `docs:`) and carry no co-author or generated-by lines.
