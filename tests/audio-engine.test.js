import assert from "node:assert/strict";
import test from "node:test";

import { AudioEngine } from "../src/audio-engine.js";

function audioParam(value = 0) {
  return { value };
}

function audioNode() {
  return { connect() {}, disconnect() {}, gain: audioParam() };
}

class FakeAudioContext {
  constructor() {
    this.state = "suspended";
    this.destination = audioNode();
    this.resumeCount = 0;
    this.closed = false;
    FakeAudioContext.instances.push(this);
  }

  createGain() {
    return audioNode();
  }

  createDynamicsCompressor() {
    return {
      ...audioNode(),
      threshold: audioParam(),
      knee: audioParam(),
      ratio: audioParam(),
      attack: audioParam(),
      release: audioParam(),
    };
  }

  createMediaStreamSource() {
    return audioNode();
  }

  async resume() {
    this.state = "running";
    this.resumeCount += 1;
  }

  async close() {
    this.closed = true;
  }
}
FakeAudioContext.instances = [];

function createAudioClass(playFactory = () => Promise.resolve()) {
  return class FakeAudio {
    static instances = [];

    constructor(src) {
      this.src = src;
      this.currentTime = 0;
      this.loop = false;
      this.paused = true;
      this.playCount = 0;
      this.pauseCount = 0;
      this.constructor.instances.push(this);
    }

    play() {
      this.playCount += 1;
      this.paused = false;
      return playFactory(this);
    }

    pause() {
      this.pauseCount += 1;
      this.paused = true;
    }

    end() {
      this.paused = true;
      this.onended?.();
    }
  };
}

class FakeClock {
  constructor() {
    this.now = 0;
    this.nextId = 1;
    this.jobs = new Map();
    this.callbacks = new Map();
  }

  setTimeout = (callback, delay) => {
    const id = this.nextId;
    this.nextId += 1;
    this.jobs.set(id, { at: this.now + delay, callback });
    this.callbacks.set(id, callback);
    return id;
  };

  clearTimeout = (id) => {
    this.jobs.delete(id);
  };

  advance(milliseconds) {
    const end = this.now + milliseconds;
    while (true) {
      const next = [...this.jobs.entries()]
        .filter(([, job]) => job.at <= end)
        .sort((left, right) => left[1].at - right[1].at)[0];
      if (!next) break;
      const [id, job] = next;
      this.jobs.delete(id);
      this.now = job.at;
      job.callback();
    }
    this.now = end;
  }

  fireStale(id) {
    this.callbacks.get(id)?.();
  }
}

function createHarness(overrides = {}) {
  const AudioClass = overrides.AudioClass ?? createAudioClass();
  const clock = overrides.clock ?? new FakeClock();
  const speechSynthesis = {
    cancelCount: 0,
    spoken: [],
    cancel() { this.cancelCount += 1; },
    getVoices() { return []; },
    speak(utterance) { this.spoken.push(utterance); },
  };
  class FakeUtterance {
    constructor(text) {
      this.text = text;
    }
  }
  FakeAudioContext.instances = [];
  const engine = new AudioEngine({
    AudioClass,
    AudioContextClass: FakeAudioContext,
    clearTimeoutFn: clock.clearTimeout,
    setTimeoutFn: clock.setTimeout,
    speechSynthesis,
    SpeechSynthesisUtteranceClass: FakeUtterance,
    ...overrides,
  });
  return { AudioClass, clock, engine, speechSynthesis };
}

test("starts the exact recording synchronously and preserves per-effect overlap", async () => {
  const { AudioClass, engine } = createHarness();

  const firstStart = engine.play("clown-horn", "assets/audio/clown-horn.mp3");
  assert.equal(AudioClass.instances.length, 1);
  assert.equal(AudioClass.instances[0].playCount, 1);
  assert.match(AudioClass.instances[0].src, /assets\/audio\/clown-horn\.mp3$/);
  assert.equal(FakeAudioContext.instances.length, 0);
  await firstStart;

  await engine.play("engine-rev", "assets/audio/engine-rev.mp3");
  await engine.play("clown-horn", "assets/audio/clown-horn.mp3");

  assert.equal(AudioClass.instances[0].paused, true);
  assert.equal(AudioClass.instances[1].paused, false);
  assert.equal(AudioClass.instances[2].paused, false);
  assert.deepEqual([...engine.active.keys()].sort(), ["clown-horn", "engine-rev"]);
});

test("recorded effects start while microphone Web Audio startup is still pending", async () => {
  let releaseResume;
  const resume = new Promise((resolve) => { releaseResume = resolve; });
  class PendingAudioContext extends FakeAudioContext {
    async resume() {
      this.resumeCount += 1;
      await resume;
      this.state = "running";
    }
  }
  const AudioClass = createAudioClass();
  const mediaDevices = { async getUserMedia() { throw new Error("not needed"); } };
  const { engine } = createHarness({ AudioClass, AudioContextClass: PendingAudioContext, mediaDevices });

  const microphoneStart = engine.toggleMicrophone();
  const recordingStart = engine.play("clown-horn", "assets/audio/clown-horn.mp3");
  assert.equal(AudioClass.instances[0].playCount, 1);

  releaseResume();
  await Promise.all([microphoneStart, recordingStart]);
});

test("one-shot gallop loops its recording for exactly thirty seconds", async () => {
  const { AudioClass, clock, engine } = createHarness();
  await engine.play("gallop", "assets/audio/gallop.mp3");

  assert.equal(engine.gallopMode, "once");
  assert.equal(AudioClass.instances[0].loop, true);
  clock.advance(29_999);
  assert.equal(engine.gallopMode, "once");
  assert.equal(AudioClass.instances[0].paused, false);
  clock.advance(1);
  assert.equal(engine.gallopMode, "off");
  assert.equal(AudioClass.instances[0].paused, true);
});

test("gallop one-shot and loop modes share one deterministic state machine", async () => {
  const { AudioClass, clock, engine } = createHarness();
  const source = "assets/audio/gallop.mp3";

  await engine.play("gallop", source);
  await engine.toggleGallopLoop(source);
  assert.equal(AudioClass.instances[0].paused, true);
  assert.equal(engine.gallopMode, "loop");

  await engine.toggleGallopLoop(source);
  assert.equal(AudioClass.instances[1].paused, true);
  assert.equal(engine.gallopMode, "off");

  await engine.toggleGallopLoop(source);
  await engine.play("gallop", source);
  assert.equal(AudioClass.instances[2].paused, true);
  assert.equal(engine.gallopMode, "once");
  clock.advance(30_000);
  assert.equal(engine.gallopMode, "off");
});

test("a stopped gallop deadline cannot mutate its replacement", async () => {
  const { clock, engine } = createHarness();
  const source = "assets/audio/gallop.mp3";

  await engine.play("gallop", source);
  const staleDeadline = [...clock.jobs.keys()][0];
  await engine.play("gallop", source);
  clock.fireStale(staleDeadline);

  assert.equal(engine.gallopMode, "once");
  assert.equal(engine.active.has("gallop"), true);
});

test("a rapid first-use loop double tap resolves to off", async () => {
  let releasePlay;
  const pending = new Promise((resolve) => { releasePlay = resolve; });
  const AudioClass = createAudioClass(() => pending);
  const { engine } = createHarness({ AudioClass });
  const source = "assets/audio/gallop.mp3";

  const firstTap = engine.toggleGallopLoop(source);
  const secondTap = engine.toggleGallopLoop(source);
  assert.equal(AudioClass.instances[0].paused, true);
  releasePlay();
  await Promise.all([firstTap, secondTap]);

  assert.equal(engine.gallopMode, "off");
  assert.equal(engine.active.has("gallop"), false);
});

test("playback rejection clears active and gallop state", async () => {
  const failure = new Error("media blocked");
  const AudioClass = createAudioClass(() => Promise.reject(failure));
  const { engine } = createHarness({ AudioClass });

  await assert.rejects(engine.play("clown-horn", "assets/audio/clown-horn.mp3"), failure);
  assert.equal(engine.active.size, 0);

  await assert.rejects(engine.play("gallop", "assets/audio/gallop.mp3"), failure);
  assert.equal(engine.gallopMode, "off");
  assert.equal(engine.gallopPendingMode, null);
});

test("natural media completion clears only its own active handle", async () => {
  const { AudioClass, engine } = createHarness();
  await engine.play("clown-horn", "assets/audio/clown-horn.mp3");
  await engine.play("engine-rev", "assets/audio/engine-rev.mp3");

  AudioClass.instances[0].end();
  assert.deepEqual([...engine.active.keys()], ["engine-rev"]);
});

test("spoken lines use one explicit global speech channel", async () => {
  const { engine, speechSynthesis } = createHarness();
  await engine.play("howdy-partner");
  await engine.play("yee-haw");

  assert.equal(speechSynthesis.cancelCount, 1);
  assert.deepEqual(speechSynthesis.spoken.map(({ text }) => text), ["Howdy, partner!", "Yee-haw!"]);
  assert.deepEqual([...engine.active.keys()], ["speech"]);
});

test("microphone permission failures become visible state and can be retried", async () => {
  const denied = Object.assign(new Error("no"), { name: "NotAllowedError" });
  const mediaDevices = { async getUserMedia() { throw denied; } };
  const { engine } = createHarness({ mediaDevices });
  await engine.toggleMicrophone();

  assert.equal(engine.microphoneState, "error");
  assert.match(engine.microphoneError, /denied/i);

  await engine.toggleMicrophone();
  assert.equal(engine.microphoneState, "error");
});

test("turning the microphone off disconnects nodes and stops every track", async () => {
  const track = { stopped: false, stop() { this.stopped = true; } };
  const stream = { getTracks: () => [track] };
  const mediaDevices = { async getUserMedia() { return stream; } };
  const { engine } = createHarness({ mediaDevices });

  await engine.toggleMicrophone();
  assert.equal(engine.microphoneState, "live");
  engine.stopMicrophone();
  assert.equal(engine.microphoneState, "off");
  assert.equal(track.stopped, true);
  assert.equal(engine.microphone, null);
});

test("canceling an in-flight microphone request tears down the late stream", async () => {
  let resolveStream;
  const track = { stopped: false, stop() { this.stopped = true; } };
  const pending = new Promise((resolve) => { resolveStream = resolve; });
  const mediaDevices = { getUserMedia: () => pending };
  const { engine } = createHarness({ mediaDevices });

  const request = engine.toggleMicrophone();
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(engine.microphoneState, "requesting");
  engine.stopMicrophone();
  resolveStream({ getTracks: () => [track] });
  await request;

  assert.equal(engine.microphoneState, "off");
  assert.equal(track.stopped, true);
});

test("dispose stops recordings, gallop deadlines, microphone, speech, and Web Audio", async () => {
  const track = { stopped: false, stop() { this.stopped = true; } };
  const mediaDevices = { async getUserMedia() { return { getTracks: () => [track] }; } };
  const { AudioClass, clock, engine, speechSynthesis } = createHarness({ mediaDevices });
  await engine.play("engine-rev", "assets/audio/engine-rev.mp3");
  await engine.play("gallop", "assets/audio/gallop.mp3");
  await engine.toggleMicrophone();
  await engine.play("yee-haw");

  await engine.dispose();
  assert.equal(AudioClass.instances.every(({ paused }) => paused), true);
  assert.equal(clock.jobs.size, 0);
  assert.equal(track.stopped, true);
  assert.equal(speechSynthesis.cancelCount, 1);
  assert.equal(FakeAudioContext.instances.at(-1).closed, true);
  assert.equal(engine.gallopMode, "off");
});
