const paths: Record<string, string> = {
  play: '<path fill="currentColor" stroke="none" d="M8 4 22 14 8 24z"/>',
  back: '<path fill="currentColor" stroke="none" d="M20 4 6 14 20 24z"/>',
  book: '<path d="M14 6C9 2 3 4 2 4v20c4-2 8-1 12 1 4-2 8-3 12-1V4c-4-1-8-1-12 2Z M14 6v19 M5 7v13 M23 7v13"/>',
  settings:
    '<path d="m11 2 6 0 1 4 3 1 4-1 3 5-3 3v3l2 3-3 5-4-1-3 2-1 3h-6l-1-4-3-1-4 1-3-5 3-3v-3l-2-3 3-5 4 1 3-2Z" transform="translate(1 -1) scale(.9)"/><circle cx="14" cy="14" r="5"/>',
  fullscreen: '<path d="M3 10V3h7 M18 3h7v7 M25 18v7h-7 M10 25H3v-7"/>',
  fish: '<path fill="currentColor" stroke="none" d="M7 10C12 3 22 4 27 14 22 24 12 25 7 18L1 22l1-8-1-8z"/><circle cx="21" cy="12" r="1.2" fill="#f5ecd5" stroke="none"/>',
  reel: '<path d="M8 3c7-3 15 1 17 8 M3 10C0 18 6 26 14 26"/><circle cx="14" cy="16" r="8" fill="currentColor" stroke="none"/><circle cx="14" cy="16" r="3" fill="#234b50" stroke="none"/><path d="m14 16 9-9 3 1" stroke-width="3"/><path d="m6 1 3 2-3 2 M1 8l2 3 2-3"/>',
  cast: '<path d="M4 25 14 5q2-5 6 0 M17 4q8 2 7 11 M24 15v6"/><path fill="currentColor" d="m24 20-3 4 3 3 3-3Z"/>',
  hook: '<path d="M15 2v16c0 10-12 10-12 1v-4l4 4 M11 2h8"/><path d="m24 4-2 5 M27 13h-5"/>',
};
export const icon = (name: string) =>
  `<svg class="icon" viewBox="0 0 28 28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] ?? paths.fish}</svg>`;
export const silhouette = (index: number) => {
  const bodies = [
    "M23 39Q48 14 81 26L115 37 143 23 140 42 145 58 115 48Q72 73 23 50L12 44Z M50 27 55 12 61 23 69 12 74 25",
    "M14 41Q43 22 112 35L143 22 137 43 144 60 111 51Q49 65 14 47Z",
    "M17 43Q47 9 92 27L119 39 142 24 140 60 118 50Q70 76 17 49Z",
    "M7 44Q36 27 113 38L145 26 138 46 145 61 112 52Q34 60 7 48Z",
    "M18 41Q43 15 92 29L119 39 143 24 138 44 144 60 113 51Q51 73 18 51Z M51 26 61 13 79 27",
    "M10 38Q40 26 92 41T141 36Q155 64 105 58T10 49Z",
    "M16 41Q44 20 96 32L119 42 145 29 138 46 143 59 114 52Q54 72 16 52Z M25 44 7 34 M24 48 5 53 M62 31 71 18 80 33",
  ];
  return `<svg class="silhouette" viewBox="0 0 160 85" aria-hidden="true"><path fill="currentColor" stroke="currentColor" stroke-width="3" stroke-linejoin="round" d="${bodies[index % bodies.length]}"/></svg>`;
};
