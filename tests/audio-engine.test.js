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

  createDelay() {
    const node = { ...audioNode(), delayTime: audioParam() };
    this.delay = node;
    return node;
  }

  createBiquadFilter() {
    const node = { ...audioNode(), frequency: audioParam(), Q: audioParam(), type: "" };
    this.filters ??= [];
    this.filters.push(node);
    return node;
  }

  createWaveShaper() {
    const node = { ...audioNode(), curve: null, oversample: "none" };
    this.waveShaper = node;
    return node;
  }

  createOscillator() {
    const node = {
      ...audioNode(),
      frequency: audioParam(),
      started: false,
      stopped: false,
      start() { this.started = true; },
      stop() { this.stopped = true; },
    };
    this.oscillator = node;
    return node;
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

function createHarness(overrides = {}) {
  const AudioClass = overrides.AudioClass ?? createAudioClass();
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
    clearTimeoutFn() {},
    setTimeoutFn(callback) {
      queueMicrotask(callback);
      return 1;
    },
    speechSynthesis,
    SpeechSynthesisUtteranceClass: FakeUtterance,
    ...overrides,
  });
  return { AudioClass, engine, speechSynthesis };
}

test("starts recordings synchronously, overlaps different sounds, and toggles the same sound", async () => {
  const { AudioClass, engine } = createHarness();

  const firstStart = engine.play("clown-horn", "assets/audio/clown-horn.mp3", 0.75);
  assert.equal(AudioClass.instances.length, 1);
  assert.equal(AudioClass.instances[0].playCount, 1);
  assert.equal(AudioClass.instances[0].volume, 0.001);
  assert.match(AudioClass.instances[0].src, /assets\/audio\/clown-horn\.mp3$/);
  assert.equal(FakeAudioContext.instances.length, 0);
  await firstStart;
  assert.equal(AudioClass.instances[0].volume, 0.75);

  await engine.play("engine-rev", "assets/audio/engine-rev.mp3");
  await engine.play("clown-horn", "assets/audio/clown-horn.mp3");

  assert.equal(AudioClass.instances[0].paused, true);
  assert.equal(AudioClass.instances[1].paused, false);
  assert.equal(AudioClass.instances.length, 2);
  assert.deepEqual([...engine.active.keys()], ["engine-rev"]);
  assert.deepEqual(engine.getState().activeSoundIds, ["engine-rev"]);

  await engine.play("clown-horn", "assets/audio/clown-horn.mp3");
  assert.equal(AudioClass.instances.length, 3);
  assert.deepEqual(engine.getState().activeSoundIds.sort(), ["clown-horn", "engine-rev"]);
});

test("recorded effects replay their attack after a Bluetooth output warm-up", async () => {
  let warmup;
  const AudioClass = createAudioClass();
  const { engine } = createHarness({
    AudioClass,
    clearTimeoutFn() {},
    setTimeoutFn(callback, delay) {
      warmup = { callback, delay };
      return 1;
    },
  });

  const started = engine.play("clown-horn", "assets/audio/clown-horn.mp3", 0.75);
  const media = AudioClass.instances[0];
  assert.equal(media.playCount, 1);
  assert.equal(media.volume, 0.001);
  await Promise.resolve();
  assert.equal(warmup.delay, 250);

  media.currentTime = 0.22;
  warmup.callback();
  await started;
  assert.equal(media.currentTime, 0);
  assert.equal(media.volume, 0.75);
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

test("one-shot gallop ends with its naturally thirty-second recording", async () => {
  const { AudioClass, engine } = createHarness();
  await engine.play("gallop", "assets/audio/gallop.mp3");

  assert.equal(engine.gallopMode, "once");
  assert.equal(AudioClass.instances[0].loop, false);
  AudioClass.instances[0].end();
  assert.equal(engine.gallopMode, "off");
  assert.equal(AudioClass.instances[0].paused, true);
});

test("gallop one-shot and loop modes share one deterministic state machine", async () => {
  const { AudioClass, engine } = createHarness();
  const source = "assets/audio/gallop.mp3";

  await engine.play("gallop", source);
  await engine.toggleGallopLoop(source);
  assert.equal(AudioClass.instances[0].paused, true);
  assert.equal(engine.gallopMode, "loop");

  await engine.toggleGallopLoop(source);
  assert.equal(AudioClass.instances[1].paused, true);
  assert.equal(engine.gallopMode, "off");

  await engine.play("gallop", source);
  assert.equal(engine.gallopMode, "once");
  assert.equal(AudioClass.instances[2].loop, false);
  AudioClass.instances[2].end();
  assert.equal(engine.gallopMode, "off");
});

test("tapping gallop while one-shot or loop playback is active stops it", async () => {
  const { AudioClass, engine } = createHarness();

  await engine.play("gallop", "assets/audio/gallop.mp3");
  await engine.play("gallop", "assets/audio/gallop.mp3");
  assert.equal(AudioClass.instances[0].paused, true);
  assert.equal(engine.gallopMode, "off");
  assert.deepEqual(engine.getState().activeSoundIds, []);

  await engine.toggleGallopLoop("assets/audio/gallop-loop.mp3");
  await engine.play("gallop", "assets/audio/gallop.mp3");
  assert.equal(AudioClass.instances[1].paused, true);
  assert.equal(engine.gallopMode, "off");
  assert.deepEqual(engine.getState().activeSoundIds, []);
});

test("gallop stop emits only a coherent inactive snapshot", async () => {
  const { engine } = createHarness();
  const states = [];
  engine.subscribe((state) => states.push(state));

  await engine.play("gallop", "assets/audio/gallop.mp3");
  states.length = 0;
  await engine.play("gallop", "assets/audio/gallop.mp3");

  assert.deepEqual(states, [{
    activeSoundIds: [],
    gallopMode: "off",
    microphoneState: "off",
    microphoneError: "",
  }]);
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

test("stopping a pending gallop swallows its interrupted play rejection", async () => {
  let rejectPlay;
  const pending = new Promise((resolve, reject) => { rejectPlay = reject; });
  const AudioClass = createAudioClass(() => pending);
  const { engine } = createHarness({ AudioClass });

  const firstTap = engine.play("gallop", "assets/audio/gallop.mp3");
  await engine.play("gallop", "assets/audio/gallop.mp3");
  rejectPlay(new Error("play interrupted by pause"));
  await firstTap;

  assert.equal(engine.gallopMode, "off");
  assert.deepEqual(engine.getState().activeSoundIds, []);
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
  assert.deepEqual(engine.getState().activeSoundIds, ["engine-rev"]);
});

test("spoken lines use one explicit global speech channel", async () => {
  const { engine, speechSynthesis } = createHarness();
  await engine.play("howdy-partner");
  await engine.play("yee-haw");

  assert.equal(speechSynthesis.cancelCount, 1);
  assert.deepEqual(speechSynthesis.spoken.map(({ text }) => text), ["Howdy, partner!", "Yee-haw!"]);
  assert.deepEqual([...engine.active.keys()], ["speech"]);
  assert.deepEqual(engine.getState().activeSoundIds, ["yee-haw"]);
  speechSynthesis.spoken.at(-1).onend();
  assert.deepEqual(engine.getState().activeSoundIds, []);
});

test("tapping the active spoken line stops it while a different line replaces it", async () => {
  const { engine, speechSynthesis } = createHarness();

  await engine.play("howdy-partner");
  await engine.play("howdy-partner");
  assert.equal(speechSynthesis.cancelCount, 1);
  assert.deepEqual(engine.getState().activeSoundIds, []);

  await engine.play("howdy-partner");
  await engine.play("yee-haw");
  assert.equal(speechSynthesis.cancelCount, 2);
  assert.deepEqual(engine.getState().activeSoundIds, ["yee-haw"]);
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

test("live microphone effects switch graphs while reusing one captured stream", async () => {
  const track = { stopped: false, stop() { this.stopped = true; } };
  const stream = { getTracks: () => [track] };
  let requestCount = 0;
  const mediaDevices = { async getUserMedia() { requestCount += 1; return stream; } };
  const { engine } = createHarness({ mediaDevices });

  await engine.toggleMicrophone("microphone-robot", "robot");
  const context = FakeAudioContext.instances[0];
  assert.equal(engine.getState().microphoneId, "microphone-robot");
  assert.equal(context.oscillator.started, true);

  await engine.toggleMicrophone("microphone-echo", "echo");
  assert.equal(requestCount, 1);
  assert.equal(track.stopped, false);
  assert.equal(context.oscillator.stopped, true);
  assert.equal(context.delay.delayTime.value, 0.18);
  assert.equal(engine.getState().microphoneId, "microphone-echo");

  await engine.toggleMicrophone("microphone-megaphone", "megaphone");
  assert.deepEqual(context.filters.map(({ type }) => type), ["highpass", "lowpass"]);
  assert.ok(context.waveShaper.curve instanceof Float32Array);
  assert.equal(requestCount, 1);

  await engine.toggleMicrophone("microphone-megaphone", "megaphone");
  assert.equal(engine.microphoneState, "off");
  assert.equal(track.stopped, true);
});

test("a recording gesture resumes a suspended live microphone context", async () => {
  const track = { stop() {} };
  const mediaDevices = { async getUserMedia() { return { getTracks: () => [track] }; } };
  const { AudioClass, engine } = createHarness({ mediaDevices });

  await engine.toggleMicrophone();
  const context = FakeAudioContext.instances[0];
  context.state = "suspended";
  const resumeCount = context.resumeCount;

  const recordingStart = engine.play("clown-horn", "assets/audio/clown-horn.mp3");
  assert.equal(AudioClass.instances[0].playCount, 1);
  assert.equal(context.resumeCount, resumeCount + 1);
  await recordingStart;
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

test("dispose stops recordings, microphone, speech, and Web Audio", async () => {
  const track = { stopped: false, stop() { this.stopped = true; } };
  const mediaDevices = { async getUserMedia() { return { getTracks: () => [track] }; } };
  const { AudioClass, engine, speechSynthesis } = createHarness({ mediaDevices });
  await engine.play("engine-rev", "assets/audio/engine-rev.mp3");
  await engine.play("gallop", "assets/audio/gallop.mp3");
  await engine.toggleMicrophone();
  await engine.play("yee-haw");

  await engine.dispose();
  assert.equal(AudioClass.instances.every(({ paused }) => paused), true);
  assert.equal(track.stopped, true);
  assert.equal(speechSynthesis.cancelCount, 1);
  assert.equal(FakeAudioContext.instances.at(-1).closed, true);
  assert.equal(engine.gallopMode, "off");
});
