function resolveAudioSource(source) {
  return new URL(`../${source}`, import.meta.url).href;
}

function createRecordedEffect({
  AudioClass,
  id,
  mode,
  onEnded,
  source,
  volume,
}) {
  if (!AudioClass) throw new Error("This browser does not support audio playback");
  if (!source) throw new Error(`No recording configured for ${id}`);

  const media = new AudioClass(resolveAudioSource(source));
  let stopped = false;

  media.preload = "auto";
  media.volume = volume;
  media.loop = mode === "loop";

  const finish = () => {
    if (stopped) return;
    stopped = true;
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

  const started = Promise.resolve(playResult);

  return {
    media,
    started,
    stop() {
      if (stopped) return;
      stopped = true;
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
    mediaDevices = globalThis.navigator?.mediaDevices,
    mediaEffectFactory = createRecordedEffect,
    speechSynthesis = globalThis.speechSynthesis,
    SpeechSynthesisUtteranceClass = globalThis.SpeechSynthesisUtterance,
  } = {}) {
    this.dependencies = {
      AudioClass,
      AudioContextClass,
      mediaDevices,
      mediaEffectFactory,
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

  play(id, source, volume = 1) {
    this.assertUsable();
    this.resumeExistingContext();
    if (id === "gallop") {
      if (this.active.has("gallop") || (this.gallopPendingMode ?? this.gallopMode) !== "off") {
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
      if (transition === this.gallopTransition) {
        this.gallopPendingMode = null;
        this.gallopMode = "off";
        this.emit();
      }
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

  async toggleMicrophone() {
    if (this.microphoneState === "live" || this.microphoneState === "requesting") {
      this.stopMicrophone();
      return;
    }

    const request = ++this.microphoneRequest;
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
      const source = context.createMediaStreamSource(stream);
      const gain = context.createGain();
      gain.gain.value = 0.36;
      source.connect(gain);
      gain.connect(this.output);
      this.microphone = { stream, source, gain };
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
      this.microphone.source.disconnect?.();
      this.microphone.gain.disconnect?.();
      this.microphone.stream.getTracks().forEach((track) => track.stop());
      this.microphone = null;
    }
    this.microphoneState = "off";
    this.microphoneError = "";
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
