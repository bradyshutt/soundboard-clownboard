import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { PAGE_SIZE, clampPage, getPage, pageCount, sounds } from "../src/catalog.js";

test("catalog contains the sound and live microphone pads", () => {
  assert.equal(sounds.length, 19);
  assert.deepEqual(
    sounds.map(({ id }) => id),
    [
      "horse-whinny",
      "horse-snort",
      "gallop",
      "clown-horn",
      "sad-horn",
      "engine-rev",
      "muscle-rev",
      "burnout",
      "squeaky-toy",
      "kitten-meow",
      "cat-yowl",
      "circus",
      "rising-pad",
      "yee-haw",
      "howdy-partner",
      "microphone",
      "microphone-robot",
      "microphone-echo",
      "microphone-megaphone",
    ],
  );
  assert.equal(new Set(sounds.map(({ id }) => id)).size, sounds.length);
});

test("catalog capabilities identify the long-running controls", () => {
  assert.equal(sounds.find(({ id }) => id === "gallop").canLoop, true);
  assert.equal(sounds.find(({ id }) => id === "gallop").loopSrc, "assets/audio/gallop-loop.mp3");
  assert.equal(sounds.find(({ id }) => id === "microphone").kind, "microphone");
  assert.deepEqual(
    sounds.filter(({ kind }) => kind === "microphone").map(({ microphoneEffect }) => microphoneEffect),
    ["clean", "robot", "echo", "megaphone"],
  );
  assert.equal(sounds.filter(({ kind }) => kind === "speech").length, 2);
});

test("pages always contain twelve slots and page two has five placeholders", () => {
  assert.equal(PAGE_SIZE, 12);
  assert.equal(pageCount, 2);
  assert.equal(getPage(0).length, 12);
  assert.equal(getPage(1).length, 12);
  assert.equal(getPage(1).filter(({ disabled }) => disabled).length, 5);
});

test("page navigation clamps to available boundaries", () => {
  assert.equal(clampPage(-8), 0);
  assert.equal(clampPage(0), 0);
  assert.equal(clampPage(1), 1);
  assert.equal(clampPage(99), 1);
  assert.equal(clampPage(Number.NaN), 0);
  assert.equal(getPage(99)[0].id, "rising-pad");
});

test("every named effect uses a unique bundled MP3 recording", async () => {
  const effects = sounds.filter(({ kind }) => kind === "effect");
  const sources = [];
  const manifestPath = fileURLToPath(new URL("../assets/audio/manifest.json", import.meta.url));
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));

  for (const effect of effects) {
    assert.equal(typeof effect.src, "string", `${effect.id} must declare a bundled recording`);
    assert.match(effect.src, /^assets\/audio\/[a-z0-9-]+\.mp3$/);
    assert.ok(effect.volume > 0 && effect.volume <= 1, `${effect.id} must declare a safe volume`);
    const asset = fileURLToPath(new URL(`../${effect.src}`, import.meta.url));
    assert.ok((await stat(asset)).size > 1_000, `${effect.src} must contain audio data`);
    const provenance = manifest[effect.src];
    assert.ok(provenance, `${effect.src} must have a provenance record`);
    assert.equal(provenance.license, "CC0-1.0");
    assert.match(provenance.source, /^https:\/\/freesound\.org\//);
    assert.ok(provenance.creator);
    const digest = createHash("sha256").update(await readFile(asset)).digest("hex");
    assert.equal(digest, provenance.sha256, `${effect.src} must match its provenance hash`);
    sources.push(effect.src);
  }

  assert.equal(effects.length, 13);
  assert.equal(new Set(sources).size, effects.length);
  const loopSource = effects.find(({ id }) => id === "gallop").loopSrc;
  const loopAsset = fileURLToPath(new URL(`../${loopSource}`, import.meta.url));
  const loopDigest = createHash("sha256").update(await readFile(loopAsset)).digest("hex");
  assert.equal(loopDigest, manifest[loopSource].sha256);
  assert.deepEqual(Object.keys(manifest).sort(), [...sources, loopSource].sort());
});
