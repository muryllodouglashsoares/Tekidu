import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type FontScale = 100 | 110 | 125 | 150;

export interface AccessibilitySettings {
  fontScale: FontScale;
  highContrast: boolean;
  reducedMotion: boolean;
  readingMode: boolean;
  highlightLinks: boolean;
  increasedSpacing: boolean;
}

interface AccessibilityContextValue extends AccessibilitySettings {
  setFontScale: (scale: FontScale) => void;
  toggleHighContrast: () => void;
  toggleReducedMotion: () => void;
  toggleReadingMode: () => void;
  toggleHighlightLinks: () => void;
  toggleIncreasedSpacing: () => void;
  resetSettings: () => void;
}

const AccessibilityContext = createContext<AccessibilityContextValue | undefined>(undefined);

const STORAGE_KEY = "tekidu-accessibility-settings";

const DEFAULT_SETTINGS: AccessibilitySettings = {
  fontScale: 100,
  highContrast: false,
  reducedMotion: false,
  readingMode: false,
  highlightLinks: false,
  increasedSpacing: false,
};

function getInitialSettings(): AccessibilitySettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(stored);
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

/**
 * Aplica os atributos `data-*` no `<html>` que os seletores CSS de
 * src/index.css usam (font-scale, contraste, movimento, leitura,
 * links, espaçamento). Extraída para ser reutilizada tanto pelo
 * `useEffect` do provider quanto pelo script inline de
 * `index.html` (que evita o "flash" de configurações padrão antes do
 * React montar — mesmo problema resolvido para o tema em `ThemeContext`).
 */
function applySettingsToDocument(settings: AccessibilitySettings) {
  const root = document.documentElement;
  root.setAttribute("data-font-scale", String(settings.fontScale));
  root.setAttribute("data-high-contrast", String(settings.highContrast));
  root.setAttribute("data-reduced-motion", String(settings.reducedMotion));
  root.setAttribute("data-reading-mode", String(settings.readingMode));
  root.setAttribute("data-highlight-links", String(settings.highlightLinks));
  root.setAttribute("data-increased-spacing", String(settings.increasedSpacing));
}

/**
 * Contexto global de acessibilidade — mesmo padrão do `ThemeContext`
 * (persistência em localStorage, aplicado como atributos no `<html>`,
 * lido uma única vez no mount). Controla as preferências do Painel de
 * Acessibilidade (ver AccessibilityPanel) e é consumido por qualquer
 * componente que precise se adaptar a elas (ex.: DevelopmentLineChart
 * respeitando `reducedMotion`).
 */
export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AccessibilitySettings>(getInitialSettings);

  useEffect(() => {
    applySettingsToDocument(settings);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  const setFontScale = useCallback((fontScale: FontScale) => {
    setSettings((prev) => ({ ...prev, fontScale }));
  }, []);
  const toggleHighContrast = useCallback(() => {
    setSettings((prev) => ({ ...prev, highContrast: !prev.highContrast }));
  }, []);
  const toggleReducedMotion = useCallback(() => {
    setSettings((prev) => ({ ...prev, reducedMotion: !prev.reducedMotion }));
  }, []);
  const toggleReadingMode = useCallback(() => {
    setSettings((prev) => ({ ...prev, readingMode: !prev.readingMode }));
  }, []);
  const toggleHighlightLinks = useCallback(() => {
    setSettings((prev) => ({ ...prev, highlightLinks: !prev.highlightLinks }));
  }, []);
  const toggleIncreasedSpacing = useCallback(() => {
    setSettings((prev) => ({ ...prev, increasedSpacing: !prev.increasedSpacing }));
  }, []);
  const resetSettings = useCallback(() => setSettings(DEFAULT_SETTINGS), []);

  const value = useMemo<AccessibilityContextValue>(
    () => ({
      ...settings,
      setFontScale,
      toggleHighContrast,
      toggleReducedMotion,
      toggleReadingMode,
      toggleHighlightLinks,
      toggleIncreasedSpacing,
      resetSettings,
    }),
    [
      settings,
      setFontScale,
      toggleHighContrast,
      toggleReducedMotion,
      toggleReadingMode,
      toggleHighlightLinks,
      toggleIncreasedSpacing,
      resetSettings,
    ]
  );

  return <AccessibilityContext.Provider value={value}>{children}</AccessibilityContext.Provider>;
}

export function useAccessibility(): AccessibilityContextValue {
  const ctx = useContext(AccessibilityContext);
  if (!ctx) throw new Error("useAccessibility deve ser usado dentro de <AccessibilityProvider>");
  return ctx;
}

/**
 * Preferência efetiva de movimento reduzido: combina a escolha manual
 * do usuário no painel com `prefers-reduced-motion` do sistema
 * operacional (item 30 do briefing — não obrigar configuração manual
 * de algo que o SO já sinalizou).
 */
export function usePrefersReducedMotion(): boolean {
  const { reducedMotion } = useAccessibility();
  const [systemPrefers, setSystemPrefers] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = (e: MediaQueryListEvent) => setSystemPrefers(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return reducedMotion || systemPrefers;
}
