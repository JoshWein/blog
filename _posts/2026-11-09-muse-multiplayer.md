---
layout: post
title: "Bringing Muse Back: Multiplayer Music in the Browser with Firebase"
description: 'Muse started as a college cloud computing project: a multiplayer instrument in the browser. Ten years later I brought multiplayer back with Firebase Realtime Database and no server at all. Here is how the rooms, shared beat, loops and audio fixes work.'
---

<div id="top"></div>

[Muse](https://www.joshwein.xyz/muse/app.html) is a little instrument that lives on my site. You click (or touch) the canvas and it plays a note: the height picks the note and how far left or right you are sets the volume. Hold the mouse down and the note repeats on the beat (every 8th note, or every quarter note for drums). Open the same room as someone else and you hear each other's notes and see each other's cursors.

It started as a cloud computing class project in college. The idea came straight from [Plink](https://dinahmoelabs.com/plink), a multiplayer music Chrome Experiment that DinahMoe released in 2011 where you click and move your mouse to make music with up to three strangers. I always thought it was one of the coolest things on the web, so I made my own version. The original Muse was JavaScript, an HTML5 canvas, and a NodeJS server with [Socket.IO](https://socket.io/docs/v4/rooms/) to pass notes around and keep rooms separate. I made the sounds myself in Ableton Live.

The server didn't survive. By the time Muse made it onto this site in 2017, the multiplayer code was commented out and it was a single-player toy. It stayed that way for almost ten years.

This month I finally brought it back. I'll be walking through how multiplayer works now, what I had to figure out to keep everyone on the same beat, and the audio bugs I didn't know I had until I started listening closely.

* [Why no server this time](#why-no-server-this-time)
* [Rooms, cursors and security rules](#rooms-cursors-and-security-rules)
* [Keeping everyone on the same beat](#keeping-everyone-on-the-same-beat)
* [Loops that fit in a URL](#loops-that-fit-in-a-url)
* [Fixing the clicks](#fixing-the-clicks)
* [What I'd do differently](#what-id-do-differently)
* [Sources](#sources)

## Why no server this time

The lesson I took from the first version is that the part of a side project that dies first is the part you have to keep running. Static files on GitHub Pages will be around as long as GitHub is. A Node process on some free host won't. Free hosting for side projects comes and goes; the one I used for some of my other college projects, OpenShift, [shut down at the end of 2017](https://www.redhat.com/en/blog/migrate-to-v3-v2-eol) and took everything on it with it.

So this time the rule was no server. Muse uses [Firebase Realtime Database](https://firebase.google.com/docs/database), which is a hosted JSON tree that every client can listen to. When something changes, every client listening to that part of the tree gets the update over a websocket. That's all a game like this really needs: each player writes their own state, and everyone reads everyone else's.

Players sign in with [anonymous authentication](https://firebase.google.com/docs/auth/web/anonymous-auth). There are no accounts and no passwords, but every player still gets a stable user ID, which turns out to be the key to the security rules below.

## Rooms, cursors and security rules

The room is just the part of the URL after the `#`, so `app.html#jam` puts you in a room called "jam". Each player keeps one record in the database:

{% highlight text %}
rooms/{room}/players/{uid} = {
  name, instrument, t,
  pointers: { "0".."4": { x, y, down } }
}
{% endhighlight %}

There are up to five pointers because phones and tablets can have five fingers on the screen. `x` and `y` are stored from 0 to 1 instead of in pixels, so a phone and a wide monitor line up. Each client sends its pointers at most about 15 times a second (and skips the send when nothing moved) and plays everyone else's notes locally when they arrive. No audio goes over the network, only "this player has a finger down at this spot with this instrument".

When you close the tab your record needs to go away, or the room fills up with ghosts. Firebase handles that with [`onDisconnect()`](https://firebase.google.com/docs/database/web/offline-capabilities), which lets a client tell the server ahead of time "if I disappear, delete this". One thing that bit me: `onDisconnect` is one-shot. If your connection drops and comes back, the server already ran your disconnect handler, so you have to register it again and resend your state.

The scary part of having no server is that every client talks straight to the database. Anyone can open the dev tools and write whatever they want. The [security rules](https://firebase.google.com/docs/database/security) are what stop that. The most important rule is that you can only write your own record (trimmed a bit here):

{% highlight json %}
"$uid": {
  ".write": "auth != null && auth.uid === $uid",
  ".validate": "newData.hasChildren(['name', 'instrument', 't'])",
  "instrument": {
    ".validate": "newData.isNumber() && newData.val() % 1 === 0 && newData.val() >= 0 && newData.val() <= 12"
  },
  "$other": { ".validate": false }
}
{% endhighlight %}

The real rule also requires you to be a member of the room before you can write. Every field gets a type and range check, and the `$other` rule rejects any field I didn't plan for. It's the same idea as validating input on a server, except the database does it for you.

A room holds 8 players. Everyone else who joins watches and waits in line. There's no server to decide who's next, so every client sorts the room's members by the time they joined and comes up with the same queue on its own. The first 8 play, and when someone leaves, the next person in line moves up. Watchers don't write cursor data, so a big crowd doesn't mean a big download.

##### [back to top](#top)

## Keeping everyone on the same beat

This was the hard part. When you hold a note down it repeats on the beat, and if your repeats and mine aren't lined up, a room of people sounds like a mess instead of music.

The fix is a shared clock. Every computer's clock is a little off, but Firebase tells each client how far off it is through a special location called `.info/serverTimeOffset`:

{% highlight js %}
let serverOffset = 0;
db.onValue(db.ref(database, ".info/serverTimeOffset"), (snap) => {
	serverOffset = Number(snap.val()) || 0;
});

export function roomTime() {
	return Date.now() + serverOffset;
}
{% endhighlight %}

With everyone on roughly the same room time, the beat is just math. The room's tempo is stored as a tiny clock object, `{ bpm, at, tick }`, meaning "step number `tick` started at room time `at`". Any client can work out which step is playing right now:

{% highlight js %}
export const stepMs = (bpm) => 30000 / bpm; // one 8th note

export function tickAt(clock, t) {
	return clock.tick + Math.floor((t - clock.at) / stepMs(clock.bpm));
}
{% endhighlight %}

Changing the tempo was trickier than I expected. If I change it and the new tempo starts immediately, it takes a moment to reach everyone else, so for a split second we're on different beats. The fix is to schedule the change a little in the future. A new tempo starts on the first step at least 500 ms from now, and it keeps the step count going so loops stay lined up on their bar:

{% highlight js %}
export function changeTempo(clock, bpm, t, lead = 0) {
	const from = t + lead;
	const at = nextBeatAt(clock, from);
	return { bpm: clampBpm(bpm), at: Math.round(at), tick: tickAt(clock, from) + 1 };
}
{% endhighlight %}

Unless someone's connection is really slow, everyone gets the new clock before it starts, everyone switches on the same step, and nobody hears the beat jump.

##### [back to top](#top)

## Loops that fit in a URL

I also added a loop recorder. You record four bars and they keep playing on the room's beat, so you can lay down a bass line and play over it. Each player can have up to four tracks.

A loop is a list of notes on a 32-step grid (four bars of 8th notes), and each note only needs four things: the step, the lane (which of the 16 notes), the instrument, and the volume. That packs into four characters per note:

{% highlight js %}
// step (base 36, 0..v)  lane (hex)  instrument (hex)  volume (0..9)
export function encodeLoop(notes) {
	return notes
		.slice(0, MAX_LOOP_NOTES)
		.map((n) => n.step.toString(36) + n.lane.toString(16) + n.instrument.toString(16) + n.vol)
		.join("");
}
{% endhighlight %}

Because a loop is just a short string, the same format works for the room and for share links. The room stores each player's loop as one database value, and a share link looks like `app.html?loop=...&bpm=100`. The security rules check the string too: only the characters `0-9` and `a-v`, at most 640 characters long. The decoder also skips anything malformed and caps how many notes can land on one step, so a hand-crafted link can't stack hundreds of sounds on one beat and blow out your speakers.

##### [back to top](#top)

## Fixing the clicks

Once multiplayer worked I started actually listening, and there were clicks and crackle everywhere. It turned out most of my old sample files start and stop in the middle of a waveform. If a sound jumps from silence straight to half volume, your speaker cone has to jump too, and you hear that as a click.

The fix is a tiny envelope on every note using the [Web Audio API's](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API) gain automation. Each note fades in over 6 ms and fades out over 35 ms before the file ends. Those fades are way too short to hear as fades, but they're long enough to get rid of the click:

{% highlight js %}
gain.cancelScheduledValues(start);
gain.setValueAtTime(0, start);
gain.linearRampToValueAtTime(level, start + FADE_IN_S);
{% endhighlight %}

Volume changes needed the same treatment. Dragging left and right changes the volume, and every sudden change in gain is also a click. A fast stream of them sounds like static. Now each change glides over 30 ms with [`linearRampToValueAtTime()`](https://developer.mozilla.org/en-US/docs/Web/API/AudioParam/linearRampToValueAtTime), and releasing a note uses an exponential decay with [`setTargetAtTime()`](https://developer.mozilla.org/en-US/docs/Web/API/AudioParam/setTargetAtTime), which sounds much more natural than a straight line down to zero.

The last source of crackle was clipping. Eight people all holding notes adds up fast. Everything now goes through a compressor and then a limiter (a [`DynamicsCompressorNode`](https://developer.mozilla.org/en-US/docs/Web/API/DynamicsCompressorNode) with a high ratio and a threshold just under full scale), so a loud moment gets turned down instead of distorting.

While I was in there I added a few instruments that don't use samples at all. The drums, piano, marimba, strings and synth are all generated in the browser. The strings use the [Karplus-Strong algorithm](https://en.wikipedia.org/wiki/Karplus%E2%80%93Strong_string_synthesis), which is one of my favorite tricks: you fill a short buffer with random noise and keep averaging it with itself, and it turns into a surprisingly real plucked string. The length of the buffer sets the pitch.

##### [back to top](#top)

## What I'd do differently

If I were starting from scratch I'd change how notes are timed. Right now the beat uses `setTimeout`, which runs on the main thread, so if the browser is busy drawing the visualizer or collecting garbage, a beat can land a few milliseconds late. Chris Wilson's article ["A tale of two clocks"](https://web.dev/articles/audio-scheduling) explains the better approach: use a timer only to look a little ahead, and schedule the actual notes on the audio clock (`AudioContext.currentTime`), which runs on its own thread and doesn't drift. It's the standard way to build a sequencer in the browser and it's next on my list.

The other thing worth calling out is that other players' notes play when they arrive, so you hear them a little late: the trip through Firebase plus up to 66 ms of send throttling. For a jam toy it's fine, since held notes snap to the shared beat anyway. A real online band app would need a lot more than this.

The bigger takeaway for me wasn't technical though. The first version of Muse died because it needed something I had to keep running. This version is static files and a hosted database with rules, and I expect it to still be working in another ten years. Come [play](https://www.joshwein.xyz/muse/app.html#lobby) and see if anyone's in the lobby. The code is all [on GitHub](https://github.com/JoshWein/joshwein.github.io/tree/main/muse).

##### [back to top](#top)

## Sources

* [Plink](https://dinahmoelabs.com/plink), DinahMoe
* [Plink multiplayer music experience](https://experiments.withgoogle.com/plink-multiplayer-music-experience), Experiments with Google
* [Socket.IO: Rooms](https://socket.io/docs/v4/rooms/)
* [Migrate to v3: OpenShift Online v2 end of life](https://www.redhat.com/en/blog/migrate-to-v3-v2-eol), Red Hat
* [Firebase Realtime Database](https://firebase.google.com/docs/database)
* [Authenticate with Firebase anonymously](https://firebase.google.com/docs/auth/web/anonymous-auth)
* [Enabling offline capabilities (onDisconnect and serverTimeOffset)](https://firebase.google.com/docs/database/web/offline-capabilities)
* [Understand Firebase Realtime Database Security Rules](https://firebase.google.com/docs/database/security)
* [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API), MDN
* [AudioParam.linearRampToValueAtTime()](https://developer.mozilla.org/en-US/docs/Web/API/AudioParam/linearRampToValueAtTime) and [setTargetAtTime()](https://developer.mozilla.org/en-US/docs/Web/API/AudioParam/setTargetAtTime), MDN
* [DynamicsCompressorNode](https://developer.mozilla.org/en-US/docs/Web/API/DynamicsCompressorNode), MDN
* [Karplus-Strong string synthesis](https://en.wikipedia.org/wiki/Karplus%E2%80%93Strong_string_synthesis), Wikipedia
* Chris Wilson, ["A tale of two clocks"](https://web.dev/articles/audio-scheduling), web.dev (2013)
