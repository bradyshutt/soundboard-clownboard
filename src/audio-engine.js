const OUTPUT_WARMUP_MILLISECONDS = 250;
const OUTPUT_WARMUP_VOLUME = 0.001;

function resolveAudioSource(source) {
  return new URL(`../${source}`, import.meta.url).href;
}

function createDistortionCurve() {
  return Float32Array.from({ length: 256 }, (_, index) => {
    const input = (index * 2) / 255 - 1;
    return Math.tanh(input * 2.8);
  });
}

function createMicrophoneGraph(context, stream, output, effect) {
  const source = context.createMediaStreamSource(stream);
  const nodes = [source];
  const gain = (value) => {
    const node = context.createGain();
    node.gain.value = value;
    nodes.push(node);
    return node;
  };

  if (effect === "clean") {
    const level = gain(0.36);
    source.connect(level);
    level.connect(output);
  } else if (effect === "robot") {
    const ring = gain(0.5);
    const modulationDepth = gain(0.5);
    const level = gain(0.42);
    const oscillator = context.createOscillator();
    oscillator.frequency.value = 38;
    nodes.push(oscillator);
    source.connect(ring);
    oscillator.connect(modulationDepth);
    modulationDepth.connect(ring.gain);
    ring.connect(level);
    level.connect(output);
    oscillator.start();
  } else if (effect === "echo") {
    const dry = gain(0.3);
    const wet = gain(0.28);
    const feedback = gain(0.24);
    const delay = context.createDelay(1);
    delay.delayTime.value = 0.18;
    nodes.push(delay);
    source.connect(dry);
    dry.connect(output);
    source.connect(delay);
    delay.connect(wet);
    wet.connect(output);
    delay.connect(feedback);
    feedback.connect(delay);
  } else if (effect === "megaphone") {
    const highpass = context.createBiquadFilter();
    highpass.type = "highpass";
    highpass.frequency.value = 500;
    const lowpass = context.createBiquadFilter();
    lowpass.type = "lowpass";
    lowpass.frequency.value = 3_500;
    const distortion = context.createWaveShaper();
    distortion.curve = createDistortionCurve();
    distortion.oversample = "2x";
    const level = gain(0.3);
    nodes.push(highpass, lowpass, distortion);
    source.connect(highpass);
    highpass.connect(lowpass);
    lowpass.connect(distortion);
    distortion.connect(level);
    level.connect(output);
  } else {
    throw new Error(`Unknown microphone effect: ${effect}`);
  }

  return { nodes };
}

function disconnectMicrophoneGraph(graph) {
  if (!graph) return;
  for (const node of [...graph.nodes].reverse()) {
    try {
      node.stop?.();
    } catch {
      // A source node may already have stopped during browser teardown.
    }
    node.disconnect?.();
  }
}

function createRecordedEffect({
  AudioClass,
  clearTimeoutFn,
  id,
  mode,
  onEnded,
  setTimeoutFn,
  source,
  volume,
}) {
  if (!AudioClass) throw new Error("This browser does not support audio playback");
  if (!source) throw new Error(`No recording configured for ${id}`);

  const media = new AudioClass(resolveAudioSource(source));
  let resolveStarted;
  let rejectStarted;
  let stopped = false;
  let warmupTimer = null;
  let startedSettled = false;

  const started = new Promise((resolve, reject) => {
    resolveStarted = resolve;
    rejectStarted = reject;
  });

  const settleStarted = (error) => {
    if (startedSettled) return;
    startedSettled = true;
    if (error) rejectStarted(error);
    else resolveStarted();
  };

  const clearWarmup = () => {
    if (warmupTimer === null) return;
    clearTimeoutFn(warmupTimer);
    warmupTimer = null;
  };

  media.preload = "auto";
  media.volume = Math.min(volume, OUTPUT_WARMUP_VOLUME);
  media.loop = mode === "loop";

  const finish = () => {
    if (stopped) return;
    stopped = true;
    clearWarmup();
    settleStarted();
    media.onended = null;
    media.onerror = null;
    media.pause();
    onEnded();
  };

  media.onended = finish;
  media.onerror = finish;

  let playResult;
  try {
    playResult = media.play();
  } catch (error) {
    finish();
    throw error;
  }

  Promise.resolve(playResult).then(() => {
    if (stopped) {
      settleStarted();
      return;
    }
    warmupTimer = setTimeoutFn(() => {
      warmupTimer = null;
      if (!stopped) {
        try {
          media.currentTime = 0;
        } catch {
          // Some browsers reject seeking before media metadata has loaded.
        }
        media.volume = volume;
      }
      settleStarted();
    }, OUTPUT_WARMUP_MILLISECONDS);
  }, (error) => settleStarted(stopped ? undefined : error));

  return {
    media,
    started,
    stop() {
      if (stopped) return;
      stopped = true;
      clearWarmup();
      settleStarted();
      media.onended = null;
      media.onerror = null;
      media.pause();
      try {
        media.currentTime = 0;
      } catch {
        // Some browsers reject seeking before media metadata has loaded.
      }
    },
  };
}

export class AudioEngine {
  constructor({
    AudioClass = globalThis.Audio,
    AudioContextClass = globalThis.AudioContext ?? globalThis.webkitAudioContext,
    clearTimeoutFn = globalThis.clearTimeout.bind(globalThis),
    mediaDevices = globalThis.navigator?.mediaDevices,
    mediaEffectFactory = createRecordedEffect,
    setTimeoutFn = globalThis.setTimeout.bind(globalThis),
    speechSynthesis = globalThis.speechSynthesis,
    SpeechSynthesisUtteranceClass = globalThis.SpeechSynthesisUtterance,
  } = {}) {
    this.dependencies = {
      AudioClass,
      AudioContextClass,
      clearTimeoutFn,
      mediaDevices,
      mediaEffectFactory,
      setTimeoutFn,
      speechSynthesis,
      SpeechSynthesisUtteranceClass,
    };
    this.context = null;
    this.output = null;
    this.active = new Map();
    this.listeners = new Set();
    this.gallopMode = "off";
    this.gallopPendingMode = null;
    this.gallopTransition = 0;
    this.microphoneState = "off";
    this.microphoneError = "";
    this.microphoneId = null;
    this.microphoneEffect = "clean";
    this.microphone = null;
    this.microphoneRequest = 0;
    this.disposed = false;
  }

  subscribe(listener) {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  getState() {
    return {
      activeSoundIds: [...this.active.values()].map(({ soundId }) => soundId),
      gallopMode: this.gallopMode,
      microphoneState: this.microphoneState,
      microphoneError: this.microphoneError,
      microphoneId: this.microphoneId,
    };
  }

  emit() {
    const state = this.getState();
    this.listeners.forEach((listener) => listener(state));
  }

  assertUsable() {
    if (this.disposed) throw new Error("Audio engine has been disposed");
  }

  async ensureContext() {
    this.assertUsable();
    if (!this.context) {
      if (!this.dependencies.AudioContextClass) {
        throw new Error("This browser does not support Web Audio");
      }
      this.context = new this.dependencies.AudioContextClass();
      const gain = this.context.createGain();
      gain.gain.value = 0.72;
      const compressor = this.context.createDynamicsCompressor();
      compressor.threshold.value = -12;
      compressor.knee.value = 18;
      compressor.ratio.value = 10;
      compressor.attack.value = 0.003;
      compressor.release.value = 0.25;
      gain.connect(compressor);
      compressor.connect(this.context.destination);
      this.output = gain;
    }
    if (this.context.state === "suspended") await this.context.resume();
    return this.context;
  }

  resumeExistingContext() {
    if (this.context?.state !== "suspended") return;
    void Promise.resolve(this.context.resume()).catch(() => {});
  }

  activeKeyForSound(soundId) {
    for (const [key, active] of this.active) {
      if (active.soundId === soundId) return key;
    }
    return null;
  }

  play(id, source, volume = 1) {
    this.assertUsable();
    const activeKey = this.activeKeyForSound(id);
    if (activeKey !== null) {
      this.stop(activeKey);
      return Promise.resolve();
    }
    this.resumeExistingContext();
    if (id === "gallop") {
      if ((this.gallopPendingMode ?? this.gallopMode) !== "off") {
        this.stop("gallop");
        return Promise.resolve();
      }
      return this.startGallop("once", source, volume);
    }
    if (id === "yee-haw") return this.speak(id, "Yee-haw!", { rate: 0.92, pitch: 1.08 });
    if (id === "howdy-partner") {
      return this.speak(id, "Howdy, partner!", { rate: 0.84, pitch: 0.9 });
    }

    return this.startEffect(id, source, "once", volume);
  }

  async startEffect(id, source, mode = "once", volume = 1) {
    this.stopActive(id, false);
    const token = Symbol(id);
    let handle;

    try {
      handle = this.dependencies.mediaEffectFactory({
        AudioClass: this.dependencies.AudioClass,
        clearTimeoutFn: this.dependencies.clearTimeoutFn,
        id,
        mode,
        source,
        volume,
        onEnded: () => {
          if (this.active.get(id)?.token !== token) return;
          this.active.delete(id);
          if (id === "gallop") {
            this.gallopTransition += 1;
            this.gallopMode = "off";
            this.gallopPendingMode = null;
          }
          this.emit();
        },
        setTimeoutFn: this.dependencies.setTimeoutFn,
      });
      this.active.set(id, { handle, soundId: id, token });
      this.emit();
      await handle.started;
      return handle;
    } catch (error) {
      const removed = this.active.get(id)?.token === token;
      if (removed) this.active.delete(id);
      handle?.stop();
      if (removed && id !== "gallop") this.emit();
      throw error;
    }
  }

  stop(id) {
    if (id === "gallop") {
      const changed = this.active.has(id) || this.gallopPendingMode !== null || this.gallopMode !== "off";
      this.gallopTransition += 1;
      this.gallopPendingMode = null;
      this.gallopMode = "off";
      this.stopActive(id, false);
      if (changed) this.emit();
      return;
    }
    this.stopActive(id);
  }

  stopActive(id, notify = true) {
    const current = this.active.get(id);
    if (!current) return false;
    this.active.delete(id);
    current.handle.stop?.();
    if (notify) this.emit();
    return true;
  }

  async startGallop(mode, source, volume = 1) {
    const transition = ++this.gallopTransition;
    this.gallopPendingMode = mode;

    try {
      await this.startEffect("gallop", source, mode, volume);
    } catch (error) {
      if (transition !== this.gallopTransition) return;
      this.gallopPendingMode = null;
      this.gallopMode = "off";
      this.emit();
      throw error;
    }

    if (transition !== this.gallopTransition) return;
    this.gallopPendingMode = null;
    this.gallopMode = mode;
    this.emit();
  }

  async toggleGallopLoop(source, volume = 1) {
    this.resumeExistingContext();
    if ((this.gallopPendingMode ?? this.gallopMode) === "loop") {
      this.stop("gallop");
      return;
    }
    await this.startGallop("loop", source, volume);
  }

  async speak(id, text, { rate, pitch }) {
    this.assertUsable();
    const synth = this.dependencies.speechSynthesis;
    const Utterance = this.dependencies.SpeechSynthesisUtteranceClass;
    if (!synth || !Utterance) throw new Error("This browser does not support speech synthesis");

    this.stopActive("speech", false);
    const utterance = new Utterance(text);
    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.volume = 0.85;
    utterance.lang = "en-US";
    const englishVoice = synth.getVoices?.().find((voice) => voice.lang?.toLowerCase().startsWith("en"));
    if (englishVoice) utterance.voice = englishVoice;
    const token = Symbol(id);
    const finish = () => {
      if (this.active.get("speech")?.token !== token) return;
      this.active.delete("speech");
      this.emit();
    };
    utterance.onend = finish;
    utterance.onerror = finish;
    const handle = { stop: () => synth.cancel() };
    this.active.set("speech", { handle, soundId: id, token });
    this.emit();
    synth.speak(utterance);
  }

  async toggleMicrophone(id = "microphone", effect = "clean") {
    this.assertUsable();
    if (this.microphoneState === "requesting") {
      if (this.microphoneId === id) {
        this.stopMicrophone();
      } else {
        this.microphoneId = id;
        this.microphoneEffect = effect;
        this.emit();
      }
      return;
    }

    if (this.microphoneState === "live") {
      if (this.microphoneId === id) {
        this.stopMicrophone();
        return;
      }
      const graph = createMicrophoneGraph(this.context, this.microphone.stream, this.output, effect);
      disconnectMicrophoneGraph(this.microphone.graph);
      this.microphone.graph = graph;
      this.microphoneId = id;
      this.microphoneEffect = effect;
      this.emit();
      return;
    }

    const request = ++this.microphoneRequest;
    this.microphoneId = id;
    this.microphoneEffect = effect;
    this.microphoneState = "requesting";
    this.microphoneError = "";
    this.emit();

    try {
      const context = await this.ensureContext();
      if (request !== this.microphoneRequest || this.disposed) return;
      if (!this.dependencies.mediaDevices?.getUserMedia) {
        this.microphoneState = "error";
        this.microphoneError = "Microphone access is not supported in this browser.";
        this.emit();
        return;
      }
      const stream = await this.dependencies.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
      if (request !== this.microphoneRequest || this.disposed) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      const graph = createMicrophoneGraph(context, stream, this.output, this.microphoneEffect);
      this.microphone = { stream, graph };
      this.microphoneState = "live";
      this.emit();
    } catch (error) {
      if (request !== this.microphoneRequest || this.disposed) return;
      this.microphoneState = "error";
      this.microphoneError =
        error?.name === "NotAllowedError"
          ? "Microphone permission was denied. Check browser settings and try again."
          : "The microphone could not be started. Try headphones or another browser.";
      this.emit();
    }
  }

  stopMicrophone() {
    this.microphoneRequest += 1;
    if (this.microphone) {
      disconnectMicrophoneGraph(this.microphone.graph);
      this.microphone.stream.getTracks().forEach((track) => track.stop());
      this.microphone = null;
    }
    this.microphoneState = "off";
    this.microphoneError = "";
    this.microphoneId = null;
    this.microphoneEffect = "clean";
    this.emit();
  }

  async release() {
    this.stopMicrophone();
    for (const id of [...this.active.keys()]) this.stop(id);
    const context = this.context;
    this.context = null;
    this.output = null;
    await context?.close?.();
  }

  async dispose() {
    if (this.disposed) return;
    await this.release();
    this.disposed = true;
    this.listeners.clear();
  }
}
