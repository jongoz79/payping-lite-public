import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { PropsWithChildren } from 'react';
import { NativeModules, Platform } from 'react-native';

import { en } from './en';
import type { TranslationKey } from './en';
import { ms } from './ms';

export type LanguagePreference = 'auto' | 'en' | 'ms';
export type Language = Exclude<LanguagePreference, 'auto'>;
export type TranslationParams = Record<string, string | number>;

export interface I18nContextValue {
  language: Language;
  preference: LanguagePreference;
  setPreference: (preference: LanguagePreference) => Promise<void>;
  t: (key: TranslationKey, params?: TranslationParams) => string;
}

export interface I18nProviderProps {
  initialPreference?: LanguagePreference;
  onPreferenceChange?: (preference: LanguagePreference) => void | Promise<void>;
}

const translations = { en, ms };
const I18nContext = createContext<I18nContextValue | null>(null);

function systemLocale(): string | undefined {
  if (Platform.OS === 'ios') {
    const settings = NativeModules.SettingsManager?.settings as
      | { AppleLocale?: string; AppleLanguages?: string[] }
      | undefined;
    return settings?.AppleLocale ?? settings?.AppleLanguages?.[0];
  }

  if (Platform.OS === 'android') {
    return NativeModules.I18nManager?.localeIdentifier as string | undefined;
  }

  if (Platform.OS === 'web' && typeof navigator !== 'undefined') {
    return navigator.language;
  }

  return undefined;
}

function languageFor(preference: LanguagePreference): Language {
  if (preference !== 'auto') return preference;
  return systemLocale()?.toLowerCase().replace('_', '-').split('-')[0] === 'ms' ? 'ms' : 'en';
}

function interpolate(template: string, params?: TranslationParams): string {
  if (!params) return template;
  return template.replace(/\{([A-Za-z][A-Za-z0-9_]*)\}/g, (placeholder, name: string) =>
    Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : placeholder,
  );
}

export function I18nProvider({
  children,
  initialPreference = 'auto',
  onPreferenceChange,
}: PropsWithChildren<I18nProviderProps>) {
  const [preference, setPreferenceState] = useState<LanguagePreference>(initialPreference);
  const language = languageFor(preference);

  const setPreference = useCallback(
    async (nextPreference: LanguagePreference) => {
      setPreferenceState(nextPreference);
      await onPreferenceChange?.(nextPreference);
    },
    [onPreferenceChange],
  );

  const t = useCallback(
    (key: TranslationKey, params?: TranslationParams) =>
      interpolate(translations[language][key], params),
    [language],
  );

  const value = useMemo(
    () => ({ language, preference, setPreference, t }),
    [language, preference, setPreference, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useI18n must be used within an I18nProvider');
  return context;
}

export type { TranslationKey };
