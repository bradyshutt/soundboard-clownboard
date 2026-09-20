const GALLOP_SECONDS = 30;

function setParam(param, value, time) {
  param.cancelScheduledValues?.(time);
  param.setValueAtTime?.(value, time);
}

function rampParam(param, value, time) {
  if (param.exponentialRampToValueAtTime && value > 0) {
    param.exponentialRampToValueAtTime(value, time);
  } else {
    param.linearRampToValueAtTime?.(value, time);
  }
}

function createEnvelope(context, destination, duration, peak = 0.45, attack = 0.015) {
  const gain = context.createGain();
  const now = context.currentTime;
  setParam(gain.gain, 0.0001, now);
  rampParam(gain.gain, peak, now + attack);
  rampParam(gain.gain, 0.0001, now + duration);
  gain.connect(destination);
  return gain;
}

function createNoiseBuffer(context, duration) {
  const frameCount = Math.ceil(context.sampleRate * duration);
  const buffer = context.createBuffer(1, frameCount, context.sampleRate);
  const data = buffer.getChannelData(0);

  for (let index = 0; index < frameCount; index += 1) {
    data[index] = Math.random() * 2 - 1;
  }

  return buffer;
}

function createGallopBuffer(context) {
  const frameCount = Math.ceil(context.sampleRate * GALLOP_SECONDS);
  const buffer = context.createBuffer(1, frameCount, context.sampleRate);
  const data = buffer.getChannelData(0);
  const beatSpacing = 0.19;
  const pattern = [1, 0.62, 0.82, 0.5];

  for (let beat = 0; beat * beatSpacing < GALLOP_SECONDS; beat += 1) {
    const start = Math.floor(beat * beatSpacing * context.sampleRate);
    const length = Math.floor(context.sampleRate * 0.075);
    const accent = pattern[beat % pattern.length];

    for (let offset = 0; offset < length && start + offset < data.length; offset += 1) {
      const age = offset / context.sampleRate;
      const decay = Math.exp(-age * 48);
      const hoof = Math.sin(age * Math.PI * 2 * (105 - age * 480));
      const grit = (Math.random() * 2 - 1) * 0.28;
      data[start + offset] += (hoof * 0.75 + grit) * decay * accent;
    }
  }

  return buffer;
}

function createSynthEffect({ context, destination, id, mode, onEnded, gallopBuffer }) {
  const nodes = [];
  let stopped = false;

  const track = (node) => {
    nodes.push(node);
    return node;
  };

  const finishWith = (node) => {
    node.onended = () => {
      if (!stopped) onEnded();
      nodes.forEach((entry) => entry.disconnect?.());
    };
  };

  const oscillator = (type, frequency, stopAfter, output, startDelay = 0) => {
    const node = track(context.createOscillator());
    node.type = type;
    setParam(node.frequency, frequency, context.currentTime);
    node.connect(output);
    node.start(context.currentTime + startDelay);
    node.stop(context.currentTime + startDelay + stopAfter);
    return node;
  };

  const noise = (duration, output, filterType, filterFrequency) => {
    const source = track(context.createBufferSource());
    source.buffer = createNoiseBuffer(context, duration);
    if (filterType) {
      const filter = track(context.createBiquadFilter(), false);
      filter.type = filterType;
      filter.frequency.value = filterFrequency;
      source.connect(filter);
      filter.connect(output);
    } else {
      source.connect(output);
    }
    source.start();
    source.stop(context.currentTime + duration);
    return source;
  };

  const now = context.currentTime;
  let primary;

  switch (id) {
    case "horse-whinny": {
      const envelope = track(createEnvelope(context, destination, 1.75, 0.3, 0.06));
      const lead = oscillator("sawtooth", 330, 1.75, envelope);
      lead.frequency.exponentialRampToValueAtTime(690, now + 0.42);
      lead.frequency.exponentialRampToValueAtTime(410, now + 1.7);
      const depth = track(context.createGain());
      const tremolo = oscillator("sine", 17, 1.75, depth);
      tremolo.frequency.value = 17;
      depth.gain.value = 38;
      depth.connect(lead.frequency);
      primary = lead;
      break;
    }
    case "horse-snort": {
      const envelope = track(createEnvelope(context, destination, 0.85, 0.5, 0.008));
      primary = noise(0.85, envelope, "bandpass", 620);
      break;
    }
    case "gallop": {
      const source = track(context.createBufferSource());
      const envelope = track(context.createGain());
      envelope.gain.value = 0.72;
      source.buffer = gallopBuffer;
      source.loop = mode === "loop";
      source.connect(envelope);
      envelope.connect(destination);
      source.start();
      if (!source.loop) source.stop(now + GALLOP_SECONDS);
      primary = source;
      break;
    }
    case "clown-horn": {
      const envelope = track(createEnvelope(context, destination, 0.58, 0.34, 0.01));
      const lead = oscillator("square", 255, 0.58, envelope);
      lead.frequency.linearRampToValueAtTime(390, now + 0.12);
      lead.frequency.linearRampToValueAtTime(285, now + 0.52);
      primary = lead;
      break;
    }
    case "sad-horn": {
      const envelope = track(createEnvelope(context, destination, 1.25, 0.34, 0.04));
      const lead = oscillator("sawtooth", 350, 1.25, envelope);
      lead.frequency.exponentialRampToValueAtTime(180, now + 1.18);
      primary = lead;
      break;
    }
    case "engine-rev":
    case "muscle-rev": {
      const duration = id === "engine-rev" ? 1.35 : 1.8;
      const base = id === "engine-rev" ? 68 : 44;
      const top = id === "engine-rev" ? 230 : 155;
      const envelope = track(createEnvelope(context, destination, duration, 0.32, 0.08));
      const lead = oscillator("sawtooth", base, duration, envelope);
      lead.frequency.exponentialRampToValueAtTime(top, now + duration * 0.68);
      lead.frequency.exponentialRampToValueAtTime(base * 1.15, now + duration);
      const harmonic = oscillator("triangle", base * 2.02, duration, envelope);
      harmonic.frequency.exponentialRampToValueAtTime(top * 2.02, now + duration * 0.68);
      harmonic.frequency.exponentialRampToValueAtTime(base * 2.3, now + duration);
      primary = lead;
      break;
    }
    case "burnout": {
      const envelope = track(createEnvelope(context, destination, 1.9, 0.42, 0.04));
      const tire = noise(1.9, envelope, "highpass", 900);
      const motor = oscillator("sawtooth", 92, 1.9, envelope);
      motor.frequency.exponentialRampToValueAtTime(245, now + 1.2);
      primary = tire;
      break;
    }
    case "squeaky-toy": {
      const envelope = track(createEnvelope(context, destination, 0.72, 0.28, 0.008));
      const lead = oscillator("sine", 760, 0.72, envelope);
      lead.frequency.exponentialRampToValueAtTime(1380, now + 0.17);
      lead.frequency.exponentialRampToValueAtTime(690, now + 0.68);
      primary = lead;
      break;
    }
    case "kitten-meow":
    case "cat-yowl": {
      const yowl = id === "cat-yowl";
      const duration = yowl ? 1.55 : 0.82;
      const envelope = track(createEnvelope(context, destination, duration, yowl ? 0.32 : 0.25, 0.05));
      const lead = oscillator(yowl ? "sawtooth" : "triangle", yowl ? 430 : 610, duration, envelope);
      lead.frequency.exponentialRampToValueAtTime(yowl ? 720 : 890, now + duration * 0.36);
      lead.frequency.exponentialRampToValueAtTime(yowl ? 300 : 520, now + duration);
      primary = lead;
      break;
    }
    case "circus": {
      const envelope = track(createEnvelope(context, destination, 1.6, 0.26, 0.01));
      const notes = [523.25, 659.25, 783.99, 659.25, 698.46, 587.33, 523.25];
      notes.forEach((frequency, index) => {
        const note = oscillator("square", frequency, 0.19, envelope, index * 0.205);
        if (index === notes.length - 1) primary = note;
      });
      break;
    }
    case "rising-pad": {
      const envelope = track(createEnvelope(context, destination, 2.4, 0.2, 0.45));
      [110, 138.59, 164.81].forEach((frequency, index) => {
        const voice = oscillator(index === 1 ? "triangle" : "sine", frequency, 2.4, envelope);
        voice.frequency.exponentialRampToValueAtTime(frequency * 2, now + 2.25);
        if (index === 0) primary = voice;
      });
      break;
    }
    default:
      throw new Error(`Unknown sound: ${id}`);
  }

  finishWith(primary);

  return {
    stop() {
      if (stopped) return;
      stopped = true;
      nodes.forEach((node) => {
        try {
          node.stop?.();
        } catch {
          // The node may already have stopped naturally.
        }
      });
      nodes.forEach((node) => node.disconnect?.());
    },
  };
}

export class AudioEngine {
  constructor({
    AudioContextClass = globalThis.AudioContext ?? globalThis.webkitAudioContext,
    mediaDevices = globalThis.navigator?.mediaDevices,
    speechSynthesis = globalThis.speechSynthesis,
    SpeechSynthesisUtteranceClass = globalThis.SpeechSynthesisUtterance,
    effectFactory = createSynthEffect,
    gallopBufferFactory = createGallopBuffer,
  } = {}) {
    this.dependencies = {
      AudioContextClass,
      mediaDevices,
      speechSynthesis,
      SpeechSynthesisUtteranceClass,
      effectFactory,
      gallopBufferFactory,
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
    this.gallopBuffer = null;
    this.disposed = false;
  }

  subscribe(listener) {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  getState() {
    return {
      gallopMode: this.gallopMode,
      microphoneState: this.microphoneState,
      microphoneError: this.microphoneError,
    };
  }

  emit() {
    const state = this.getState();
    this.listeners.forEach((listener) => listener(state));
  }

  async ensureContext() {
    if (this.disposed) throw new Error("Audio engine has been disposed");
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

  async play(id) {
    if (id === "gallop") return this.startGallop("once");
    if (id === "yee-haw") return this.speak(id, "Yee-haw!", { rate: 0.92, pitch: 1.08 });
    if (id === "howdy-partner") {
      return this.speak(id, "Howdy, partner!", { rate: 0.84, pitch: 0.9 });
    }

    await this.ensureContext();
    return this.startEffect(id);
  }

  startEffect(id, mode = "once") {
    this.stopActive(id);
    const token = Symbol(id);
    const context = this.context;
    if (id === "gallop" && !this.gallopBuffer) {
      this.gallopBuffer = this.dependencies.gallopBufferFactory(context);
    }
    const handle = this.dependencies.effectFactory({
      context,
      destination: this.output,
      id,
      mode,
      gallopBuffer: this.gallopBuffer,
      onEnded: () => {
        if (this.active.get(id)?.token !== token) return;
        this.active.delete(id);
        if (id === "gallop") {
          this.gallopMode = "off";
          this.gallopPendingMode = null;
          this.emit();
        }
      },
    });
    this.active.set(id, { handle, token });
    return handle;
  }

  stop(id) {
    this.stopActive(id);
    if (id === "gallop") {
      this.gallopTransition += 1;
      this.gallopPendingMode = null;
      if (this.gallopMode !== "off") {
        this.gallopMode = "off";
        this.emit();
      }
    }
  }

  stopActive(id) {
    const current = this.active.get(id);
    if (!current) return;
    this.active.delete(id);
    current.handle.stop?.();
  }

  async startGallop(mode) {
    const transition = ++this.gallopTransition;
    this.gallopPendingMode = mode;
    await this.ensureContext();
    if (transition !== this.gallopTransition) return;
    this.gallopPendingMode = null;
    this.stopActive("gallop");
    this.gallopMode = mode;
    this.startEffect("gallop", mode);
    this.emit();
  }

  async toggleGallopLoop() {
    if ((this.gallopPendingMode ?? this.gallopMode) === "loop") {
      this.gallopTransition += 1;
      this.gallopPendingMode = null;
      this.stopActive("gallop");
      this.gallopMode = "off";
      this.emit();
      return;
    }
    await this.startGallop("loop");
  }

  async speak(id, text, { rate, pitch }) {
    await this.ensureContext();
    const synth = this.dependencies.speechSynthesis;
    const Utterance = this.dependencies.SpeechSynthesisUtteranceClass;
    if (!synth || !Utterance) throw new Error("This browser does not support speech synthesis");

    this.stop("speech");
    const utterance = new Utterance(text);
    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.volume = 0.85;
    utterance.lang = "en-US";
    const englishVoice = synth.getVoices?.().find((voice) => voice.lang?.toLowerCase().startsWith("en"));
    if (englishVoice) utterance.voice = englishVoice;
    const token = Symbol(id);
    const finish = () => {
      if (this.active.get("speech")?.token === token) this.active.delete("speech");
    };
    utterance.onend = finish;
    utterance.onerror = finish;
    const handle = { stop: () => synth.cancel() };
    this.active.set("speech", { handle, token });
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
    this.gallopBuffer = null;
    await context?.close?.();
  }

  async dispose() {
    if (this.disposed) return;
    await this.release();
    this.disposed = true;
    this.listeners.clear();
  }
}
