import { useState } from 'react';

const storageKey = 'qsl-display-font-size';
export const fontAreas = [
  { id: 'top', label: '顶部导航', baseline: 14, defaultSize: 16 },
  { id: 'side', label: '侧边菜单', baseline: 14, defaultSize: 16 },
  { id: 'main', label: '主视图区', baseline: 14, defaultSize: 15 },
] as const;
type FontSizes = Record<(typeof fontAreas)[number]['id'], number>;
export const defaultFontSizes: FontSizes = { top: 16, side: 16, main: 15 };

export function readFontSizes(): FontSizes {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) ?? '{}');
    const sizes = { ...defaultFontSizes };
    for (const { id } of fontAreas) {
      const value = saved?.[id];
      if (Number.isInteger(value) && value >= 14 && value <= 20) sizes[id] = value;
    }
    return sizes;
  } catch {
    return { ...defaultFontSizes };
  }
}

export function applyFontSizes(sizes: FontSizes) {
  for (const { id, baseline } of fontAreas) {
    document.documentElement.style.setProperty(`--qsl-font-offset-${id}`, `${sizes[id] - baseline}px`);
  }
}

export function useFontSizes() {
  const [sizes, setSizes] = useState(readFontSizes);
  function save(next: FontSizes) {
    applyFontSizes(next);
    setSizes(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
      return true;
    } catch {
      return false;
    }
  }
  return { sizes, save };
}
