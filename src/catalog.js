export const PAGE_SIZE = 12;

export const sounds = Object.freeze([
  { id: "horse-whinny", label: "Horse Whinny", icon: "🐎", color: "#9b5f3d", kind: "effect" },
  { id: "horse-snort", label: "Horse Snort", icon: "🌬️", color: "#72513d", kind: "effect" },
  {
    id: "gallop",
    label: "30s Gallop",
    icon: "🏇",
    color: "#87542f",
    kind: "effect",
    canLoop: true,
  },
  { id: "clown-horn", label: "Clown Horn", icon: "🤡", color: "#d92f45", kind: "effect" },
  { id: "sad-horn", label: "Sad Horn", icon: "🎺", color: "#4e6dad", kind: "effect" },
  { id: "engine-rev", label: "Engine Rev", icon: "🏎️", color: "#c8472f", kind: "effect" },
  { id: "muscle-rev", label: "Muscle Rev", icon: "🚗", color: "#a84131", kind: "effect" },
  { id: "burnout", label: "Burnout", icon: "💨", color: "#575d68", kind: "effect" },
  { id: "squeaky-toy", label: "Squeaky Toy", icon: "🦆", color: "#e09a1f", kind: "effect" },
  { id: "kitten-meow", label: "Kitten Meow", icon: "🐱", color: "#b66a9c", kind: "effect" },
  { id: "cat-yowl", label: "Cat Yowl", icon: "😼", color: "#8056a6", kind: "effect" },
  { id: "circus", label: "Circus Time", icon: "🎪", color: "#bc2e75", kind: "effect" },
  { id: "rising-pad", label: "Big Reveal", icon: "✨", color: "#7756ba", kind: "effect" },
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
