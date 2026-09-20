import assert from "node:assert/strict";
import test from "node:test";

import { AudioEngine } from "../src/audio-engine.js";

function audioParam(value = 0) {
  return {
    value,
    cancelScheduledValues() {},
    setValueAtTime(next) {
      this.value = next;
    },
    linearRampToValueAtTime(next) {
      this.value = next;
    },
    exponentialRampToValueAtTime(next) {
      this.value = next;
    },
  };
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

function createHarness(overrides = {}) {
  const handles = [];
  const effectFactory = ({ id, mode, onEnded }) => {
    const handle = {
      id,
      mode,
      stopped: false,
      end: onEnded,
      stop() {
        this.stopped = true;
      },
    };
    handles.push(handle);
    return handle;
  };
  const speechSynthesis = { cancelCount: 0, cancel() { this.cancelCount += 1; } };
  const engine = new AudioEngine({
    AudioContextClass: FakeAudioContext,
    effectFactory,
    gallopBufferFactory: () => ({ duration: 30 }),
    speechSynthesis,
    ...overrides,
  });
  return { engine, handles, speechSynthesis };
}

test("resumes audio and replaces the same sound while allowing other sounds to overlap", async () => {
  const { engine, handles } = createHarness();
  await engine.play("clown-horn");
  await engine.play("engine-rev");
  await engine.play("clown-horn");

  assert.equal(FakeAudioContext.instances.at(-1).resumeCount, 1);
  assert.equal(handles[0].stopped, true);
  assert.equal(handles[1].stopped, false);
  assert.equal(handles[2].stopped, false);
  assert.deepEqual([...engine.active.keys()].sort(), ["clown-horn", "engine-rev"]);
});

test("gallop one-shot and loop modes share one deterministic state machine", async () => {
  const { engine, handles } = createHarness();
  await engine.play("gallop");
  assert.equal(engine.gallopMode, "once");

  await engine.toggleGallopLoop();
  assert.equal(handles[0].stopped, true);
  assert.equal(engine.gallopMode, "loop");

  await engine.toggleGallopLoop();
  assert.equal(handles[1].stopped, true);
  assert.equal(engine.gallopMode, "off");

  await engine.toggleGallopLoop();
  await engine.play("gallop");
  assert.equal(handles[2].stopped, true);
  assert.equal(engine.gallopMode, "once");

  handles[3].end();
  assert.equal(engine.gallopMode, "off");
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

test("dispose stops effects, microphone tracks, speech, and the audio context", async () => {
  const track = { stopped: false, stop() { this.stopped = true; } };
  const mediaDevices = { async getUserMedia() { return { getTracks: () => [track] }; } };
  const { engine, handles, speechSynthesis } = createHarness({ mediaDevices });
  await engine.play("engine-rev");
  await engine.toggleGallopLoop();
  await engine.toggleMicrophone();

  await engine.dispose();
  assert.equal(handles.every(({ stopped }) => stopped), true);
  assert.equal(track.stopped, true);
  assert.equal(speechSynthesis.cancelCount, 1);
  assert.equal(FakeAudioContext.instances.at(-1).closed, true);
  assert.equal(engine.gallopMode, "off");
});
