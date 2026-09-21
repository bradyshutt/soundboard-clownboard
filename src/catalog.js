export const PAGE_SIZE = 12;

export const sounds = Object.freeze([
  {
    id: "horse-whinny",
    label: "Horse Whinny",
    icon: "🐎",
    color: "#9b5f3d",
    kind: "effect",
    src: "assets/audio/horse-whinny.mp3",
    volume: 0.85,
  },
  {
    id: "horse-snort",
    label: "Horse Snort",
    icon: "🌬️",
    color: "#72513d",
    kind: "effect",
    src: "assets/audio/horse-snort.mp3",
    volume: 1,
  },
  {
    id: "gallop",
    label: "30s Gallop",
    icon: "🏇",
    color: "#87542f",
    kind: "effect",
    canLoop: true,
    src: "assets/audio/gallop.mp3",
    volume: 1,
  },
  { id: "clown-horn", label: "Clown Horn", icon: "🤡", color: "#d92f45", kind: "effect", src: "assets/audio/clown-horn.mp3", volume: 1 },
  { id: "sad-horn", label: "Sad Horn", icon: "🎺", color: "#4e6dad", kind: "effect", src: "assets/audio/sad-horn.mp3", volume: 0.5 },
  { id: "engine-rev", label: "Engine Rev", icon: "🏎️", color: "#c8472f", kind: "effect", src: "assets/audio/engine-rev.mp3", volume: 0.3 },
  { id: "muscle-rev", label: "Muscle Rev", icon: "🚗", color: "#a84131", kind: "effect", src: "assets/audio/muscle-rev.mp3", volume: 1 },
  { id: "burnout", label: "Burnout", icon: "💨", color: "#575d68", kind: "effect", src: "assets/audio/burnout.mp3", volume: 0.25 },
  { id: "squeaky-toy", label: "Squeaky Toy", icon: "🦆", color: "#e09a1f", kind: "effect", src: "assets/audio/squeaky-toy.mp3", volume: 0.9 },
  { id: "kitten-meow", label: "Kitten Meow", icon: "🐱", color: "#b66a9c", kind: "effect", src: "assets/audio/kitten-meow.mp3", volume: 1 },
  { id: "cat-yowl", label: "Cat Yowl", icon: "😼", color: "#8056a6", kind: "effect", src: "assets/audio/cat-yowl.mp3", volume: 0.7 },
  { id: "circus", label: "Circus Time", icon: "🎪", color: "#bc2e75", kind: "effect", src: "assets/audio/circus.mp3", volume: 0.35 },
  { id: "rising-pad", label: "Big Reveal", icon: "✨", color: "#7756ba", kind: "effect", src: "assets/audio/big-reveal.mp3", volume: 0.45 },
  { id: "yee-haw", label: "Yee-Haw!", icon: "🤠", color: "#ad6f20", kind: "speech" },
  { id: "howdy-partner", label: "Howdy Partner", icon: "🌵", color: "#7d6534", kind: "speech" },
  { id: "microphone", label: "Live Microphone", icon: "🎙️", color: "#257d69", kind: "microphone" },
]);

export const pageCount = Math.ceil(sounds.length / PAGE_SIZE);

export function clampPage(page) {
  return Math.min(Math.max(Number.isFinite(page) ? Math.trunc(page) : 0, 0), pageCount - 1);
}

export function getPage(page) {
  const safePage = clampPage(page);
  const entries = sounds.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  return Array.from({ length: PAGE_SIZE }, (_, index) => {
    return entries[index] ?? {
      id: `future-${safePage}-${index}`,
      label: "More sounds soon",
      kind: "placeholder",
      disabled: true,
    };
  });
}
