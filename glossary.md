# GlassySession

A browser extension for planning and counting down work time. The person saves timers, runs them alone or combines them into focus sessions, sets alarms, and sees how much time each task took.

## Language

### Timers and tasks

**Timer**:
A saved, named countdown with a planned time. When it runs out, it rings.
_Avoid_: Clock, counter, stopwatch

**Task**:
A timer that stands for work. Its time is tracked, it can be done, it can repeat, and it can go into a focus session. While the run of a focus session uses it, its own card says it is in that session, shows the time the run has left it, and offers no Start, Reset, Mark done or Undo done.
_Avoid_: Job, to-do, work timer

**Planned time**:
How long a timer is set to count down in total. Changing it keeps the time the timer has already used, so its remaining time grows or shrinks by the same amount. A timer that has already used all of its new planned time is finished, without ringing. A finished timer stays finished until it is reset.
_Avoid_: Duration, length, budget

**Remaining time**:
How much of a timer's planned time is left. A task keeps its remaining time between focus sessions and between days until it is done, and a repeating task only until its next repeat day.
_Avoid_: Time left, countdown value

**Description**:
Optional free text on a timer saying what it is for.
_Avoid_: Note, details, comment

**Appearance**:
How one timer looks wherever it shows. For now it is one colour from a fixed set. Each timer has its own.
_Avoid_: Design, style, theme

### Background sound

**Background sound**:
A timer's or a focus session's own choice of playlist, or none, and its own volume. Either can change at any time, before or while it runs. The playlist plays while its sound owner runs, pauses and resumes with it at the same place in the same file, and starts again from the first file after the owner finished. Removing a timer or focus session takes its background sound away with it. While no playlist is chosen the volume can still be set, for the next playlist chosen. At a volume of 0 the sound pauses where it is, which is not a sound pause, so a break does not bring it back, and a louder volume plays it on from there.
_Avoid_: Ambience, soundtrack, background noise

**Sound owner**:
The timer or focus session a background sound belongs to.
_Avoid_: Source, holder

**Playlist**:
A saved, named list of the person's own audio files, kept in the Music view. It can be the background sound of any number of timers and focus sessions. Its files play in order and start over after the last one, and the person can go to the next or the previous one. When the file playing is removed, the one after it plays.
_Avoid_: Queue, album, mix

**Audio file**:
One of the person's own sound files, kept once in the extension and known by its name and, once known, its length. It can be in playlists, and it can be a ring sound, the end chime or the start chime. One that is gone or cannot be played rings with the bell instead, and a playlist moves on from it. One picked in a timer or alarm dialog is kept only once the dialog is saved, and one that nothing plays any more is forgotten. There are no built-in background sounds and no streaming.
_Avoid_: Track, song, sample

**Music command**:
A request from the popup asking the background to add, rename or remove a playlist, to add, remove or move its audio files, or to choose a timer's or a focus session's background sound. Removing a playlist leaves every timer and focus session that chose it with none, at the volume it had. An audio file's bytes are kept until no playlist lists it any more and no ring sound, end chime or start chime plays it. Removing an audio file in Settings is a music command too, refused while a timer, an alarm, a chime or a playlist still plays it. A command for a playlist that was removed in the meantime is refused, and so is choosing it.
_Avoid_: Playlist action, music event

**Heard sound**:
The one background sound that plays while several sound owners run at once: that of the one started or resumed most recently that has a playlist with files. When it pauses or finishes, the most recently started or resumed one still running takes over at its own place.
_Avoid_: Active sound, current track

**Place**:
Which audio file of its playlist a background sound is in, and how far into that file it got. A paused sound owner keeps its place, and one that finished forgets it.
_Avoid_: Position, offset, progress

**Sound pause**:
The person pausing the heard sound on its own while its sound owner keeps running. It lasts through volume changes and through the owner pausing and resuming. It ends when the person resumes the sound, at the next break or focus step, or when a timer or focus session starts. The background pauses the sound the same way once no file of its playlist can play, one file after the other, so it stops instead of going round, and the owner's sound controls say that no file of the playlist can play. Resuming it then tries its files again.
_Avoid_: Mute, silence

**Sound command**:
A request from the popup or the overlay asking the background to pause or resume the heard sound, or to go to the next or the previous file of its playlist. It is never refused: while no sound is heard it changes nothing.
_Avoid_: Player action, media key

**Sound controls**:
The buttons for the heard sound, shown only for its sound owner: previous file, pause or resume the sound, next file and its volume, on its timer card and in its running focus session. On the owner's chip in the running bar they are smaller, and the volume sits behind a button that opens its slider and closes on Escape or once the focus leaves it. A pinned owner's row on the overlay offers only pausing and resuming the sound. They say nothing when they work, since the person hears it, and say why when a command is refused.
_Avoid_: Player, transport, media controls

**Playback**:
Where the background sounds are in their playing, stored so a background that stops and starts again carries on: the sound owners that may be heard with their places, whether the person paused the sound, and what the player was last told to play. While a sound plays its place is stored every 15 seconds, so one that starts again repeats at most the last 15 seconds. A background that starts again plays nothing until the time it was stopped is settled, so the sound of an owner that finished meanwhile never plays.
_Avoid_: Player state, now playing

### Running

**Run state**:
Where a timer is in its countdown: idle, running, paused or finished.
_Avoid_: Status, mode

**Idle**:
The run state of a timer that still has all of its planned time.

**Running**:
The run state of a timer that is counting down on its own. A task in a focus session does not run: the session's focus steps use up its remaining time instead, and a task brought to zero that way is finished without ringing. A task is used in one place at a time, either running on its own or in the plan of one running focus session.
_Avoid_: Active, playing

**Paused**:
The run state of a timer that has used part of its planned time and is not counting down. A focus session can be paused too, either in a focus step or in a break, and it shows which.
_Avoid_: Stopped, on break

**Finished**:
The run state of a timer with no remaining time.
_Avoid_: Expired, completed, elapsed

**Reset**:
Giving a timer back all of its planned time. A task that the run of a focus session uses cannot be reset until that run ends.
_Avoid_: Restart, repeat, clear

**Ring**:
The signal that a timer has finished or that an alarm's moment has come: a ring sound, optionally with a system notification.
_Avoid_: Alert, bell, buzz

**Ring sound**:
The sound played when something rings. Each timer and alarm has its own choice.
_Avoid_: Alarm sound, ringtone

**Built-in sound**:
One of the short sounds that come with the extension: Bell, Soft chime, Digital and Marimba. They are made when they play, so the extension carries no audio files of its own. A ring sound, the end chime and the start chime are each a built-in sound or one of the person's own audio files.
_Avoid_: Preset, default sound, tone

**Sound volume**:
How loud rings, the end chime and the start chime play, set once in settings for all of them. A background sound has a volume of its own.
_Avoid_: Ring volume, alert volume, master volume

**System notification**:
A message shown by the operating system when something rings. The person chooses whether rings send one.
_Avoid_: Push, snackbar, Windows notification

**Wake**:
The moment the extension's background is woken to check on a running timer or focus session: the moment the timer will finish, or the moment the session's current focus step or break will end. Starting or resuming sets the wake. Pausing, resetting, removing, ending early or finishing cancels it. A timer and a focus session with the same id each have their own wake.
A switched on alarm has a wake as well, at its next ring, and an alarm shares no wake with a timer or a focus session of the same id. Every timer or focus session command sets each wake the stored timers and focus sessions need that is not set at its moment, and cancels each set wake they no longer need, so a wake that a background which stopped mid-command never set or cancelled is put right by the next command.
_Avoid_: Alarm, tick, timeout

**Timer command**:
A request from the popup or the overlay asking the background to add, change, start, pause, reset, pin, unpin or remove a timer, or to mark a task done or undo done. Changing a timer sets its name, description, planned time, appearance, ring sound and pin, and for a task its repeat days. A change that says nothing about the pin keeps it as it was, and one that says nothing about the ring sound rings with the bell. A timer's kind stays as it was added, since changing it would leave its tracked time without a task. The background is the only part that changes timers, and it ignores any message that is neither a timer command nor a focus session command. A command that would use a task in two places is refused, and so is removing, resetting, marking done or undoing done a task that the run of a focus session uses, running or paused, naming that session.
_Avoid_: Action, event, request

**Refusal**:
The answer to a command that changed nothing, saying why. A task in use names the task and the focus session it is in, running or paused, or says it already runs on its own. A command that could not run at all answers with what went wrong. A command for a timer, a focus session or an alarm that no longer exists, or that names a task that no longer exists, says it was already removed. Starting a timer that already runs says so, and starting a finished timer, or a focus session whose tasks have no time left, names the task with no time left. A refused command still rings, chimes and brings back what was due. Switching on a one-time alarm whose moment has passed says so. A change to up next by a step that has already become the current step or a past one names that step and its task, and a change to up next of a focus session whose run has ended says the run has ended. Adding to up next the steps of a task with no time left names the task. A refused command never answers as if it had worked.
_Avoid_: Error, rejection, denial

### Tasks over days

**Done**:
What a task is once it is finished, whether it ran out or the person marked it done. A one-time task stays done until the person undoes it. A timer is never done.
_Avoid_: Completed, closed, checked

**One-time task**:
A task that is done for good once it is finished.
_Avoid_: Single task, non-repeating task

**Repeating task**:
A task that comes back with its full planned time on each of its repeat days. It needs at least one repeat day. Timers do not repeat.
_Avoid_: Recurring task, daily task, habit

**Repeat days**:
The days of the week on which a repeating task comes back. The task keeps the moment it got the repeat days it has, which changing them sets again.
_Avoid_: Schedule, recurrence

**Done for the day**:
What a repeating task is once it is finished, until its next repeat day.
_Avoid_: Done today, completed for today

**Come back**:
What a repeating task that used time or was done does when its next repeat day begins on the local clock: it is idle with all of its planned time again and is no longer done, whether or not it was finished. One still running is stopped by the first command or wake after that, and the time it ran up to then is tracked as usual, without a ring. A task that the run of a focus session uses does not come back while that run goes on, only once it has ended. Every view shows the comeback from the moment the day begins, settling the stored timers as the background would. Nothing ticks for it: whether it has come back follows from the moment it first used time or became done, today and its repeat days, so a browser closed over several repeat days finds it back once. Tracked time of past days stays as it was, and each repeat day it leaves keeps its repeat day result.
_Avoid_: Renew, refresh, recur

**Mark done**:
The person making a task done by hand without running it. A running task stops first, and the time it ran is tracked. A task that the run of a focus session uses is marked done only from that session's detail, beside the current focus step or from up next. That takes its steps out of up next for that run and, when the current focus step is the task's, ends that step at once, so its break or the next focus step starts, or the run ends after the last one. Its own card refuses, naming the session.
_Avoid_: Check off, complete, close

**Undo done**:
Giving a done task back what it had: the remaining time it had when it was marked done, or all of its planned time when it ran out. For a repeating task it undoes done for the day. A task that the run of a focus session uses cannot be undone until that run ends.
_Avoid_: Reopen, uncheck, restore

### Focus sessions

**Focus session**:
A saved, named plan to work through one or more tasks in focus steps separated by breaks. The person can save several, and several can run at the same time as long as they share no task.
_Avoid_: Session timer, pomodoro, sprint

**Plan**:
The focus steps of a focus session in the order they will run. The order fills it from what each task has left when the session is saved, and again whenever its tasks, step length or order change. Only up next of a run can move steps, for that run. Starting the session fits it to what each task has left: the order stays, no task gets more time than it has left, and steps that would be empty disappear. The saved plan itself does not change.
_Avoid_: Schedule, sequence, queue

**Focus step**:
One part of a focus session spent on one task. It uses up that task's remaining time.
_Avoid_: Piece, slice, round, pomodoro

**Break**:
The rest between two focus steps of a focus session. There is none after the last focus step.
_Avoid_: Rest, pause

**Step length**:
How long each focus step of a focus session lasts. A task with less remaining time than the step length gets a shorter last focus step.
_Avoid_: Piece size, interval

**Break length**:
How long each break of a focus session lasts. A break length of zero means no breaks.

**Order**:
How a focus session first arranges the focus steps of several tasks in its plan: one task after another, or alternating between tasks. Up next of a run can then move steps, for that run only.
_Avoid_: Mode, layout, sequence type

**Current step**:
The latest focus step of a running focus session that has started: the one in progress, or the one whose break is running.
_Avoid_: Active step, now playing

**Up next**:
The part of a running focus session's plan after the current step. The person can move its steps, add the steps of a task the run does not have yet and that has time left, send a step to the front, or mark a task done, which takes all its steps out of up next and ends the current focus step at once when it is that task's. A change that names a step that has meanwhile started or passed is refused, and so is any change once the run has ended, since there is no up next any more. Changes to it last for that run only.
_Avoid_: Queue, backlog, playlist

**Progress line**:
The line on a focus session that shows every focus step and break in order, filled up to where the session is now.
_Avoid_: Timeline, progress bar, track

**Skip**:
Ending a break early so the next focus step starts at once. A paused break cannot be skipped.
_Avoid_: Cancel break, jump

**End early**:
Finishing a running focus session before its plan is done. The session is then idle again with its saved plan, as it is after it finishes.
_Avoid_: Stop, cancel, abort

**Focus session command**:
A request from the popup or the overlay asking the background to add, change, remove, start, pause, resume, skip, end early, pin or unpin a focus session, to change up next of its run, or to mark done a task of its run. Like a timer command, it is refused when it would use a task in two places.
_Avoid_: Session action, session event

**Estimated end**:
The moment a focus session will finish if it keeps running without pauses.
_Avoid_: ETA, finish time, deadline

**Delay**:
How much later the estimated end has become because the focus session was paused.
_Avoid_: Lost time, overtime, slip

**End chime**:
The sound played when a focus step ends, whether its break starts or the focus session is over. When several focus steps and breaks ended while nobody looked, only the latest of them chimes. The person chooses it in settings, from the built-in sounds or their own audio file.
_Avoid_: Ring, step alarm, break start sound

**Start chime**:
The softer sound played when a break ends and the next focus step starts. The person chooses it the same way as the end chime.
_Avoid_: Ring, soft alarm, break end sound

### Tracking

**Tracked time**:
The time a task has actually been running, recorded per day, whether it ran on its own or inside a focus session.
_Avoid_: Logged time, time spent, history

**Span**:
A stretch of time from one moment to a later one. Tracked time is made of the spans during which a task was running, each split at day borders.
_Avoid_: Interval, period, session

**Repeat day result**:
How one repeat day of a repeating task went: the planned time the task had when it came back, the time tracked from that repeat day up to the next one, and whether the task was finished before the next one began. Every repeat day that passes keeps one, from the day the task got its repeat days on, whether the browser was open or closed: a task that comes back keeps one for each repeat day it leaves, and a repeat day the task was not used or done on is kept once its next repeat day begins, as not finished with whatever was tracked, such as "0m of 1h, unfinished". A repeat day before the task was added or got its repeat days keeps none, and so does one the task was not used on if it was saved before results of unused repeat days were kept. The repeat day that has begun most recently has no result until the next one begins. Changing the planned time later does not change a result.
_Avoid_: Score, streak, day history

**Last time**:
On one of a repeating task's repeat days, the repeat day result of the repeat day before it: the time tracked of the time planned, or that it was finished. The task's card shows it while the task is idle, so it goes once the task is started or marked done.
_Avoid_: Previous result, yesterday

**Statistics**:
The view of tracked time per task and per day.
_Avoid_: Dashboard, analytics, report

**Task filter**:
The choice at the top of the statistics of which tasks it shows: all tasks, or one or more chosen tasks, removed tasks among them. The week, its totals, the repeat day results and day progress then show only the chosen tasks, while the weeks that can be shown stay the same. Each task's card and its dialog open the statistics with only that task chosen. The choice stays while the popup is open, moving to another week or to another tab and back, and closing the popup forgets it. It is never stored.
_Avoid_: Search, selection, scope

**Range**:
The days the statistics shows at once: one week or one month. The person moves to the week or month before or after it.
_Avoid_: Period, window, interval

**Week**:
Seven days in a row, from the first day of the week on. Days with nothing tracked are part of it too.
_Avoid_: Last 7 days, seven-day window

**First day of the week**:
The day of the week a week starts on. It is Monday.
_Avoid_: Week start setting, locale day

**Totals**:
The tracked time in a range: for each day, for each task, and for all of it together. Tasks come with the most tracked time first, and tasks with the same tracked time keep the order the tasks are listed in.
_Avoid_: Summary, aggregate, sums

**Removed task**:
A task that no longer exists while its tracked time is kept. It still counts in the totals, without a name, after the tasks that exist when the tracked time is the same.
_Avoid_: Deleted task, unknown task, orphan

**Earliest tracked day**:
The first day any task, removed tasks included, has tracked time on. An empty history has none.
_Avoid_: Start date, first entry

**Available range**:
A range the statistics can show: one that holds a day from the earliest tracked day up to today. With nothing tracked yet, only the range holding today is available.
_Avoid_: Valid range, enabled range

**Day progress**:
How much of a task's planned time was tracked on one day, as a part of the whole. It goes past the whole when the task ran for longer than its planned time that day.
_Avoid_: Completion, percentage done

### Alarms

**Alarm**:
A ring at a set time of day, either once on a date or on chosen days of the week. It has a name, and its own choice of whether its ring sends a system notification.
_Avoid_: Reminder, timer, notification

**Alarm time**:
The time of day an alarm rings, as the local clock shows it. On the day the clocks go forward past it, it rings by the clock from before the change, so an alarm for 02:30 rings at 03:30. On the day the clocks go back and the time happens twice, it rings only the first time.
_Avoid_: Alarm hour, trigger time

**One-time alarm**:
An alarm that rings once, at its alarm time on its date. After it rings it is kept, switched off, so the person can switch it on again for a new date. A one-time alarm whose moment has passed does not ring. The dialog does not save a new one, or a changed date or time, whose moment has already passed, and switching on one whose moment has passed is refused. Changing the date or time of one that has rung, or whose moment has otherwise passed, to a moment still to come switches it on again. Renaming it or changing its ring sound is always saved, since that does not switch it on.
_Avoid_: Once alarm, single alarm

**Repeating alarm**:
An alarm that rings at its alarm time on each of its repeat days, the days of the week it is set for. It needs at least one repeat day, and it stays switched on after it rings.
_Avoid_: Weekly alarm, recurring alarm, daily alarm

**Switched on**:
What an alarm is while it will ring. A new alarm is switched on.
_Avoid_: Enabled, active, armed

**Switched off**:
What an alarm is while it will not ring. It is kept as it is until the person switches it on again.
_Avoid_: Disabled, inactive, paused

**Missed alarm**:
An alarm whose moment came more than a minute before the background could ring it, because the browser was closed or the computer was asleep. Nothing rings for it. It gets one quiet system notification saying when it was due, even when its ring sends none, and a one-time alarm is then switched off as if it had rung. When it was due several times, only the latest counts.
_Avoid_: Late alarm, skipped alarm, overdue alarm

**Alarms today**:
The switched on alarms that will still ring before this day ends on the local clock, the soonest first, each with its alarm time. Today shows them after the focus sessions and before the timers and tasks, and shows nothing for them when none is left.
_Avoid_: Upcoming alarms, next alarms

### Where things show

**Popup**:
The window that opens from the extension's toolbar button. It holds the whole app: today, timers, focus sessions, alarms, music, statistics and settings. There is no separate full page.
_Avoid_: Dashboard, app page, window

**Dialog**:
The panel that opens over the popup to add or edit one timer, task, alarm or focus session.
_Avoid_: Modal, popup, form page

**Today**:
The first view of the popup. It shows, in this order: the focus sessions that are running or paused, the alarms today, and the timers and tasks for this day in one group, each card labelled Task or Timer. For this day means every timer, each one-time task that is not done or was done today, and each repeating task whose repeat day is today. Finished ones are greyed and sit at the bottom under Finished, where a timer can be reset and a task's done undone. Every focus session is listed in Focus. Timers, the second view, lists every timer and task the same way, and each repeating task says its repeat days.
_Avoid_: Home, dashboard, inbox

**Music**:
The place in the popup where the person makes, renames, fills, reorders and deletes playlists. Each playlist says which timers and focus sessions chose it. A background sound is chosen in the timer's or focus session's dialog, not here.
_Avoid_: Sounds, library, audio, media

**Running bar**:
The bar above the popup's tabs that shows each running timer with its remaining time and a button to pause it. It is hidden when nothing runs.
Running focus sessions show there too, before the timers, each with what is left of its focus step or break. Chips that do not fit scroll sideways, by wheel, touchpad or keyboard focus, with no scrollbar shown.
_Avoid_: Dock, tray, status bar

**Snackbar**:
A short message at the top of the popup that says what a command did, or why it was refused. Every command the person gives ends in one, and it goes away by itself after a few seconds.
_Avoid_: Notification, alert, banner

**Focus session detail**:
The view in Focus that shows one running or paused focus session in full: its current focus step or break in a ring, with a button to mark the task of the current focus step done, when it will end, its progress line, the buttons to pause, skip or end early, and up next. It opens from the session's card on Focus or Today.
_Avoid_: Session page, player, session screen

**Overlay**:
The floating area on top of a web page where pinned timers and focus sessions show, each with its remaining time and a button to start, pause or resume it. It sits in a corner of the page and can be collapsed into a small pill or dragged to another corner, and every page remembers both. It is hidden when nothing is pinned, and the person can turn it off for every page in settings.
_Avoid_: Widget, floating window, content script

**Pin**:
Marking a timer or a focus session so that it shows in the overlay on every page. Pinning changes nothing about how it runs. It is done from the card, the dialog, or the detail of a running focus session. A pinned focus session that runs shows its current focus step or break.
_Avoid_: Stick, dock, float

**Theme**:
The look of the whole app, chosen in settings. There are three, Frost, Lagoon and Pebble, and Frost is the default. Each has a light and a dark version. The choice is saved and the popup opens in it next time. Not to be confused with a timer's appearance.
_Avoid_: Skin, design, style

**Version**:
The light or the dark look of a theme. The person chooses light, dark, or to match the system. Not to be confused with the extension version.
_Avoid_: Mode, scheme, variant

**About**:
The last part of settings, after Theme: the product's name GlassySession, its full name, the extension version, one line on what it does, and what it is made with.
_Avoid_: Info, credits

**Extension version**:
The number of the release that runs, such as 1.0.0, as the extension's manifest gives it. About shows it.
_Avoid_: Build, app version
