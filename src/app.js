import { AudioEngine } from "./audio-engine.js";
import { clampPage, getPage, pageCount } from "./catalog.js";

export function getPadPresentation(entry, engineState) {
  const isPlaying = engineState.activeSoundIds?.includes(entry.id) ?? false;

  if (entry.kind === "microphone") {
    const state = engineState.microphoneState;
    const labels = {
      off: "Live microphone is off. Tap to request access. Headphones recommended to avoid feedback.",
      requesting: "Requesting microphone access. Tap to cancel.",
      live: "Live microphone is on. Tap to turn it off.",
      error: `${engineState.microphoneError || "Microphone error"} Tap to try again.`,
    };
    const hints = {
      off: "Headphones · avoid feedback",
      requesting: "Requesting…",
      live: "Live · tap to stop",
      error: "Unavailable · retry",
    };
    return { ariaLabel: labels[state], state, hint: hints[state] };
  }

  if (entry.id === "gallop") {
    if (isPlaying) {
      const looping = engineState.gallopMode === "loop";
      return {
        ariaLabel: "Stop gallop",
        state: looping ? "looping" : "playing",
        hint: looping ? "Looping · tap to stop" : "Playing · tap to stop",
      };
    }
    return {
      ariaLabel: "Play one 30-second gallop",
      state: "off",
      hint: "Tap for one run",
    };
  }

  return isPlaying
    ? { ariaLabel: `${entry.label} is playing. Tap to play again.`, state: "playing", hint: "Playing" }
    : { ariaLabel: `Play ${entry.label}`, state: "off", hint: "" };
}

export class AppController {
  constructor(engine) {
    this.engine = engine;
    this.page = 0;
  }

  setPage(page) {
    this.page = clampPage(page);
    return this.page;
  }

  nextPage() {
    return this.setPage(this.page + 1);
  }

  previousPage() {
    return this.setPage(this.page - 1);
  }

  activate(entry) {
    return entry.kind === "microphone"
      ? this.engine.toggleMicrophone()
      : this.engine.play(entry.id, entry.src, entry.volume);
  }

  toggleGallopLoop(entry) {
    return this.engine.toggleGallopLoop(entry.loopSrc, entry.volume);
  }
}

export function releaseOnPageHide(engine, event) {
  return event.persisted ? engine.release() : engine.dispose();
}

function createTextElement(documentRef, className, text) {
  const element = documentRef.createElement("span");
  element.className = className;
  element.textContent = text;
  return element;
}

export function mountApp(documentRef = document, windowRef = window) {
  const grid = documentRef.querySelector("#sound-grid");
  const pageCountElement = documentRef.querySelector("#page-count");
  const previousButton = documentRef.querySelector("#previous-page");
  const nextButton = documentRef.querySelector("#next-page");
  const dots = documentRef.querySelector("#page-dots");
  const status = documentRef.querySelector("#app-status");
  const engine = new AudioEngine();
  const controller = new AppController(engine);
  let engineState = engine.getState();
  let previousEngineState = engineState;

  const announce = (message) => {
    status.textContent = "";
    windowRef.setTimeout(() => {
      status.textContent = message;
    }, 20);
  };

  const handleError = (error) => {
    console.error(error);
    announce(error?.message || "That sound could not be played.");
  };

  const pulsePad = (button) => {
    button.classList.add("is-playing");
    windowRef.setTimeout(() => button.classList.remove("is-playing"), 170);
  };

  const syncEngineState = () => {
    const entries = getPage(controller.page);
    grid.querySelectorAll(".sound-pad").forEach((button) => {
      const entry = entries.find(({ id }) => id === button.dataset.soundId);
      if (!entry) return;
      const presentation = getPadPresentation(entry, engineState);
      button.dataset.state = presentation.state;
      button.setAttribute("aria-label", presentation.ariaLabel);
      button.querySelector(".pad-hint").textContent = presentation.hint;
    });

    const loop = grid.querySelector(".loop-button");
    if (loop) {
      const looping = engineState.gallopMode === "loop";
      loop.setAttribute("aria-pressed", String(looping));
      loop.setAttribute("aria-label", looping ? "Stop looping gallop" : "Loop 30-second gallop");
    }
  };

  const createSoundPad = (entry) => {
    const cell = documentRef.createElement("div");
    cell.className = "pad-cell";
    cell.style.setProperty("--pad-color", entry.color);

    const button = documentRef.createElement("button");
    const presentation = getPadPresentation(entry, engineState);
    button.type = "button";
    button.className = "sound-pad";
    button.dataset.soundId = entry.id;
    button.dataset.state = presentation.state;
    button.setAttribute("aria-label", presentation.ariaLabel);
    button.append(createTextElement(documentRef, "pad-icon", entry.icon));

    const labelGroup = documentRef.createElement("span");
    labelGroup.append(createTextElement(documentRef, "pad-label", entry.label));
    labelGroup.append(createTextElement(documentRef, "pad-hint", presentation.hint));
    button.append(labelGroup);

    if (entry.kind === "microphone") {
      button.append(createTextElement(documentRef, "pad-state", ""));
    }

    button.addEventListener("click", () => {
      pulsePad(button);
      controller.activate(entry).then(() => {
        if (entry.kind === "microphone") return;
        const gallopStopped = entry.id === "gallop" && !engineState.activeSoundIds.includes("gallop");
        announce(gallopStopped ? `${entry.label} stopped.` : `${entry.label} playing.`);
      }).catch(handleError);
    });
    cell.append(button);

    if (entry.canLoop) {
      const loop = documentRef.createElement("button");
      loop.type = "button";
      loop.className = "loop-button";
      loop.textContent = "↻";
      loop.setAttribute("aria-label", "Loop 30-second gallop");
      loop.setAttribute("aria-pressed", String(engineState.gallopMode === "loop"));
      loop.addEventListener("click", () => {
        controller.toggleGallopLoop(entry).catch(handleError);
      });
      cell.append(loop);
    }

    return cell;
  };

  const render = () => {
    grid.replaceChildren();
    getPage(controller.page).forEach((entry) => {
      if (entry.disabled) {
        const placeholder = documentRef.createElement("div");
        placeholder.className = "future-pad";
        placeholder.setAttribute("aria-hidden", "true");
        placeholder.textContent = entry.label;
        grid.append(placeholder);
      } else {
        grid.append(createSoundPad(entry));
      }
    });

    pageCountElement.textContent = `${controller.page + 1} / ${pageCount}`;
    previousButton.disabled = controller.page === 0;
    nextButton.disabled = controller.page === pageCount - 1;
    dots.replaceChildren();
    for (let index = 0; index < pageCount; index += 1) {
      const dot = documentRef.createElement("span");
      dot.className = `page-dot${index === controller.page ? " is-current" : ""}`;
      dots.append(dot);
    }
    grid.setAttribute("aria-busy", "false");
  };

  previousButton.addEventListener("click", () => {
    controller.previousPage();
    render();
    announce(`Sound page ${controller.page + 1} of ${pageCount}.`);
  });
  nextButton.addEventListener("click", () => {
    controller.nextPage();
    render();
    announce(`Sound page ${controller.page + 1} of ${pageCount}.`);
  });

  const unsubscribe = engine.subscribe((nextState) => {
    previousEngineState = engineState;
    engineState = nextState;
    syncEngineState();
    if (nextState.microphoneState !== previousEngineState.microphoneState) {
      const announcements = {
        requesting: "Requesting microphone permission.",
        live: "Live microphone is on. Use headphones to avoid feedback.",
        off: "Live microphone is off.",
        error: nextState.microphoneError,
      };
      announce(announcements[nextState.microphoneState]);
    }
  });

  const dispose = () => {
    unsubscribe();
    windowRef.removeEventListener("pagehide", handlePageHide);
    return engine.dispose();
  };
  const handlePageHide = (event) => {
    if (!event.persisted) unsubscribe();
    releaseOnPageHide(engine, event).catch(handleError);
  };
  windowRef.addEventListener("pagehide", handlePageHide);
  render();

  return { controller, engine, dispose, render };
}

if (typeof document !== "undefined" && typeof window !== "undefined") {
  mountApp();
}
