import assert from "node:assert/strict";
import test from "node:test";

import { AppController, getPadPresentation, releaseOnPageHide } from "../src/app.js";
import { sounds } from "../src/catalog.js";

function createController() {
  const commands = [];
  const engine = {
    play(id, src, volume) {
      commands.push(["play", id, src, volume]);
      return Promise.resolve();
    },
    toggleMicrophone() {
      commands.push(["microphone"]);
      return Promise.resolve();
    },
    toggleGallopLoop(src, volume) {
      commands.push(["gallop-loop", src, volume]);
      return Promise.resolve();
    },
  };
  return { controller: new AppController(engine), commands };
}

test("controller clamps navigation without touching active audio", () => {
  const { controller, commands } = createController();
  assert.equal(controller.previousPage(), 0);
  assert.equal(controller.nextPage(), 1);
  assert.equal(controller.nextPage(), 1);
  assert.equal(controller.previousPage(), 0);
  assert.deepEqual(commands, []);
});

test("pad activation maps microphone and sound entries to distinct engine commands", async () => {
  const { controller, commands } = createController();
  const clownHorn = sounds.find(({ id }) => id === "clown-horn");
  const gallop = sounds.find(({ id }) => id === "gallop");
  await controller.activate(clownHorn);
  await controller.activate(sounds.find(({ id }) => id === "microphone"));
  await controller.toggleGallopLoop(gallop);
  assert.deepEqual(commands, [
    ["play", "clown-horn", clownHorn.src, clownHorn.volume],
    ["microphone"],
    ["gallop-loop", gallop.loopSrc, gallop.volume],
  ]);
});

test("microphone accessibility text reflects permission, live, and error states", () => {
  const microphone = sounds.find(({ id }) => id === "microphone");
  const off = getPadPresentation(microphone, { microphoneState: "off" });
  const live = getPadPresentation(microphone, { microphoneState: "live" });
  const error = getPadPresentation(microphone, {
    microphoneState: "error",
    microphoneError: "Permission denied.",
  });

  assert.match(off.ariaLabel, /headphones/i);
  assert.match(live.ariaLabel, /turn it off/i);
  assert.match(error.ariaLabel, /permission denied/i);
});

test("pad presentation describes each active tap action", () => {
  const gallop = sounds.find(({ id }) => id === "gallop");
  const horn = sounds.find(({ id }) => id === "clown-horn");
  const off = { activeSoundIds: [], gallopMode: "off" };
  const playing = { activeSoundIds: ["gallop", "clown-horn"], gallopMode: "once" };
  const looping = { activeSoundIds: ["gallop"], gallopMode: "loop" };

  assert.equal(getPadPresentation(gallop, off).state, "off");
  assert.equal(getPadPresentation(gallop, playing).state, "playing");
  assert.match(getPadPresentation(gallop, playing).ariaLabel, /stop/i);
  assert.equal(getPadPresentation(gallop, looping).state, "looping");
  assert.equal(getPadPresentation(horn, playing).state, "playing");
  assert.match(getPadPresentation(horn, playing).ariaLabel, /stop/i);
  assert.match(getPadPresentation(horn, playing).hint, /tap to stop/i);
});

test("pagehide releases reusable audio for bfcache and disposes final exits", async () => {
  const calls = [];
  const engine = {
    release() {
      calls.push("release");
      return Promise.resolve();
    },
    dispose() {
      calls.push("dispose");
      return Promise.resolve();
    },
  };

  await releaseOnPageHide(engine, { persisted: true });
  await releaseOnPageHide(engine, { persisted: false });
  assert.deepEqual(calls, ["release", "dispose"]);
});
