export type ThemeKey =
  | 'lime_charcoal'
  | 'emerald_mint'
  | 'azure_cobalt'
  | 'amber_bronze'
  | 'violet_plum'
  | 'rose_coral'
  | 'pure_white';

export interface SystemThemeDefinition {
  key: ThemeKey;
  name: string;
  subtitle: string;
  accentHex: string;
  accentInkHex: string;
  accentSoftHex: string;
  accentBorderHex: string;
  accentOnDarkHex: string;
  brandDarkHex: string;
  ambientOrbs: [string, string, string];
  particleColors: {
    primaryMid: string;
    primaryOuter: string;
    secondaryMid: string;
    secondaryOuter: string;
    tertiaryMid: string;
    tertiaryOuter: string;
  };
}

export const DEFAULT_THEME_KEY: ThemeKey = 'lime_charcoal';

export const SYSTEM_THEMES: SystemThemeDefinition[] = [
  {
    key: 'lime_charcoal',
    name: '极光黄绿',
    subtitle: '千视林经典炭黑黄绿对比',
    accentHex: '#D7FF00',
    accentInkHex: '#171916',
    accentSoftHex: '#ECF9A8',
    accentBorderHex: '#C2E600',
    accentOnDarkHex: '#D7FF00',
    brandDarkHex: '#171916',
    ambientOrbs: [
      'radial-gradient(circle, rgba(215, 255, 0, 0.16) 0%, rgba(236, 249, 168, 0.10) 48%, transparent 74%)',
      'radial-gradient(circle, rgba(255, 255, 255, 0.85) 0%, rgba(228, 245, 192, 0.36) 52%, transparent 76%)',
      'radial-gradient(circle, rgba(236, 249, 168, 0.28) 0%, rgba(238, 246, 224, 0.24) 52%, transparent 76%)',
    ],
    particleColors: {
      primaryMid: 'rgba(215, 255, 0, 0.42)',
      primaryOuter: 'rgba(215, 255, 0, 0)',
      secondaryMid: 'rgba(236, 249, 168, 0.50)',
      secondaryOuter: 'rgba(236, 249, 168, 0)',
      tertiaryMid: 'rgba(194, 232, 116, 0.36)',
      tertiaryOuter: 'rgba(194, 232, 116, 0)',
    },
  },
  {
    key: 'emerald_mint',
    name: '森翠青碧',
    subtitle: '医疗视光专业松柏青绿',
    accentHex: '#10B981',
    accentInkHex: '#FFFFFF',
    accentSoftHex: '#D1FAE5',
    accentBorderHex: '#6EE7B7',
    accentOnDarkHex: '#34D399',
    brandDarkHex: '#0F241D',
    ambientOrbs: [
      'radial-gradient(circle, rgba(16, 185, 129, 0.14) 0%, rgba(209, 250, 229, 0.12) 48%, transparent 74%)',
      'radial-gradient(circle, rgba(255, 255, 255, 0.88) 0%, rgba(209, 250, 229, 0.35) 52%, transparent 76%)',
      'radial-gradient(circle, rgba(167, 243, 208, 0.28) 0%, rgba(236, 253, 245, 0.24) 52%, transparent 76%)',
    ],
    particleColors: {
      primaryMid: 'rgba(16, 185, 129, 0.38)',
      primaryOuter: 'rgba(16, 185, 129, 0)',
      secondaryMid: 'rgba(167, 243, 208, 0.48)',
      secondaryOuter: 'rgba(167, 243, 208, 0)',
      tertiaryMid: 'rgba(52, 211, 153, 0.34)',
      tertiaryOuter: 'rgba(52, 211, 153, 0)',
    },
  },
  {
    key: 'azure_cobalt',
    name: '晴空钴蓝',
    subtitle: '精密验光冷冽光学蓝调',
    accentHex: '#2563EB',
    accentInkHex: '#FFFFFF',
    accentSoftHex: '#DBEAFE',
    accentBorderHex: '#93C5FD',
    accentOnDarkHex: '#60A5FA',
    brandDarkHex: '#101D33',
    ambientOrbs: [
      'radial-gradient(circle, rgba(37, 99, 235, 0.12) 0%, rgba(219, 234, 254, 0.14) 48%, transparent 74%)',
      'radial-gradient(circle, rgba(255, 255, 255, 0.88) 0%, rgba(219, 234, 254, 0.36) 52%, transparent 76%)',
      'radial-gradient(circle, rgba(191, 219, 254, 0.30) 0%, rgba(239, 246, 255, 0.26) 52%, transparent 76%)',
    ],
    particleColors: {
      primaryMid: 'rgba(59, 130, 246, 0.36)',
      primaryOuter: 'rgba(59, 130, 246, 0)',
      secondaryMid: 'rgba(191, 219, 254, 0.50)',
      secondaryOuter: 'rgba(191, 219, 254, 0)',
      tertiaryMid: 'rgba(96, 165, 250, 0.34)',
      tertiaryOuter: 'rgba(96, 165, 250, 0)',
    },
  },
  {
    key: 'amber_bronze',
    name: '暖阳琥珀',
    subtitle: '精品板材陈列温润金棕',
    accentHex: '#F59E0B',
    accentInkHex: '#171916',
    accentSoftHex: '#FEF3C7',
    accentBorderHex: '#FCD34D',
    accentOnDarkHex: '#FBBF24',
    brandDarkHex: '#231910',
    ambientOrbs: [
      'radial-gradient(circle, rgba(245, 158, 11, 0.14) 0%, rgba(254, 243, 199, 0.14) 48%, transparent 74%)',
      'radial-gradient(circle, rgba(255, 255, 255, 0.88) 0%, rgba(254, 243, 199, 0.35) 52%, transparent 76%)',
      'radial-gradient(circle, rgba(253, 230, 138, 0.28) 0%, rgba(255, 251, 235, 0.24) 52%, transparent 76%)',
    ],
    particleColors: {
      primaryMid: 'rgba(245, 158, 11, 0.36)',
      primaryOuter: 'rgba(245, 158, 11, 0)',
      secondaryMid: 'rgba(253, 230, 138, 0.50)',
      secondaryOuter: 'rgba(253, 230, 138, 0)',
      tertiaryMid: 'rgba(251, 191, 36, 0.34)',
      tertiaryOuter: 'rgba(251, 191, 36, 0)',
    },
  },
  {
    key: 'violet_plum',
    name: '暮光紫罗兰',
    subtitle: '设计师镜架买手雅致紫调',
    accentHex: '#7C3AED',
    accentInkHex: '#FFFFFF',
    accentSoftHex: '#EDE9FE',
    accentBorderHex: '#C4B5FD',
    accentOnDarkHex: '#A78BFA',
    brandDarkHex: '#1B142B',
    ambientOrbs: [
      'radial-gradient(circle, rgba(124, 58, 237, 0.12) 0%, rgba(237, 233, 254, 0.14) 48%, transparent 74%)',
      'radial-gradient(circle, rgba(255, 255, 255, 0.88) 0%, rgba(237, 233, 254, 0.35) 52%, transparent 76%)',
      'radial-gradient(circle, rgba(221, 214, 254, 0.28) 0%, rgba(245, 243, 255, 0.25) 52%, transparent 76%)',
    ],
    particleColors: {
      primaryMid: 'rgba(139, 92, 246, 0.36)',
      primaryOuter: 'rgba(139, 92, 246, 0)',
      secondaryMid: 'rgba(221, 214, 254, 0.50)',
      secondaryOuter: 'rgba(221, 214, 254, 0)',
      tertiaryMid: 'rgba(167, 139, 250, 0.34)',
      tertiaryOuter: 'rgba(167, 139, 250, 0)',
    },
  },
  {
    key: 'rose_coral',
    name: '珊瑚绯红',
    subtitle: '时尚零售活力玫瑰绯红',
    accentHex: '#E11D48',
    accentInkHex: '#FFFFFF',
    accentSoftHex: '#FFE4E6',
    accentBorderHex: '#FDA4AF',
    accentOnDarkHex: '#FB7185',
    brandDarkHex: '#261218',
    ambientOrbs: [
      'radial-gradient(circle, rgba(225, 29, 72, 0.11) 0%, rgba(255, 228, 230, 0.14) 48%, transparent 74%)',
      'radial-gradient(circle, rgba(255, 255, 255, 0.88) 0%, rgba(255, 228, 230, 0.34) 52%, transparent 76%)',
      'radial-gradient(circle, rgba(254, 205, 211, 0.28) 0%, rgba(255, 241, 242, 0.24) 52%, transparent 76%)',
    ],
    particleColors: {
      primaryMid: 'rgba(244, 63, 94, 0.36)',
      primaryOuter: 'rgba(244, 63, 94, 0)',
      secondaryMid: 'rgba(254, 205, 211, 0.50)',
      secondaryOuter: 'rgba(254, 205, 211, 0)',
      tertiaryMid: 'rgba(251, 113, 133, 0.34)',
      tertiaryOuter: 'rgba(251, 113, 133, 0)',
    },
  },
  {
    key: 'pure_white',
    name: '纯净极简白',
    subtitle: '素白极简无扰黑白对比',
    accentHex: '#FFFFFF',
    accentInkHex: '#171916',
    accentSoftHex: '#F3F4F3',
    accentBorderHex: '#C7CCC4',
    accentOnDarkHex: '#FFFFFF',
    brandDarkHex: '#181918',
    ambientOrbs: [
      'radial-gradient(circle, rgba(255, 255, 255, 0.96) 0%, rgba(244, 245, 244, 0.32) 50%, transparent 74%)',
      'radial-gradient(circle, rgba(255, 255, 255, 0.96) 0%, rgba(242, 244, 242, 0.36) 52%, transparent 76%)',
      'radial-gradient(circle, rgba(246, 247, 246, 0.45) 0%, rgba(255, 255, 255, 0.25) 52%, transparent 76%)',
    ],
    particleColors: {
      primaryMid: 'rgba(212, 216, 212, 0.34)',
      primaryOuter: 'rgba(212, 216, 212, 0)',
      secondaryMid: 'rgba(229, 232, 229, 0.42)',
      secondaryOuter: 'rgba(229, 232, 229, 0)',
      tertiaryMid: 'rgba(198, 203, 198, 0.28)',
      tertiaryOuter: 'rgba(198, 203, 198, 0)',
    },
  },
];

export const SYSTEM_THEME_MAP: Record<ThemeKey, SystemThemeDefinition> = Object.fromEntries(
  SYSTEM_THEMES.map((theme) => [theme.key, theme])
) as Record<ThemeKey, SystemThemeDefinition>;

export function isValidThemeKey(value: unknown): value is ThemeKey {
  return typeof value === 'string' && value in SYSTEM_THEME_MAP;
}

export function resolveThemeKey(value: unknown): ThemeKey {
  return isValidThemeKey(value) ? value : DEFAULT_THEME_KEY;
}

export function applyThemeToDocument(themeKey: ThemeKey): void {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.theme = themeKey;
}
