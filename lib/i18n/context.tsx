'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import en from './translations/en.json';
import es from './translations/es.json';

export type Language = 'en' | 'es';

type TranslationValue = string | { [key: string]: TranslationValue };
type Translations = { [key: string]: TranslationValue };

const translations: Record<Language, Translations> = {
  en,
  es,
};

interface TranslationContextType {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  t: (key: string, params?: Record<string, string | number>) => string;
  isLoading: boolean;
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

interface TranslationProviderProps {
  children: React.ReactNode;
  initialLanguage?: Language;
}

export function TranslationProvider({ children, initialLanguage = 'en' }: TranslationProviderProps) {
  const [language, setLanguageState] = useState<Language>(initialLanguage);
  const [isLoading, setIsLoading] = useState(false);

  // Get nested translation value
  const getNestedValue = useCallback((obj: Translations, path: string): string | undefined => {
    const keys = path.split('.');
    let current: TranslationValue | undefined = obj;

    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = (current as { [key: string]: TranslationValue })[key];
      } else {
        return undefined;
      }
    }

    return typeof current === 'string' ? current : undefined;
  }, []);

  // Translation function
  const t = useCallback((key: string, params?: Record<string, string | number>): string => {
    const translation = getNestedValue(translations[language], key);

    if (!translation) {
      // Fallback to English if key not found in current language
      const fallback = getNestedValue(translations.en, key);
      if (!fallback) {
        console.warn(`Translation key not found: ${key}`);
        return key;
      }
      return replaceParams(fallback, params);
    }

    return replaceParams(translation, params);
  }, [language, getNestedValue]);

  // Replace placeholders like {name} with values
  const replaceParams = (text: string, params?: Record<string, string | number>): string => {
    if (!params) return text;

    return Object.entries(params).reduce((result, [key, value]) => {
      return result.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
    }, text);
  };

  // Set language and persist to server
  const setLanguage = useCallback(async (lang: Language) => {
    setIsLoading(true);
    try {
      // Update language preference on the server
      const response = await fetch('/api/user/preferences', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ preferredLanguage: lang }),
      });

      if (!response.ok) {
        throw new Error('Failed to update language preference');
      }

      setLanguageState(lang);
    } catch (error) {
      console.error('Failed to update language:', error);
      // Still update locally even if server fails
      setLanguageState(lang);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <TranslationContext.Provider value={{ language, setLanguage, t, isLoading }}>
      {children}
    </TranslationContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(TranslationContext);
  if (context === undefined) {
    throw new Error('useTranslation must be used within a TranslationProvider');
  }
  return context;
}

// Hook to get the opposite language translation for subtitles
export function useAlternateTranslation() {
  const { language } = useTranslation();

  const tAlt = useCallback((key: string, params?: Record<string, string | number>): string | null => {
    const altLanguage: Language = language === 'en' ? 'es' : 'en';

    const getNestedValue = (obj: Translations, path: string): string | undefined => {
      const keys = path.split('.');
      let current: TranslationValue | undefined = obj;

      for (const key of keys) {
        if (current && typeof current === 'object' && key in current) {
          current = (current as { [key: string]: TranslationValue })[key];
        } else {
          return undefined;
        }
      }

      return typeof current === 'string' ? current : undefined;
    };

    const translation = getNestedValue(translations[altLanguage], key);

    if (!translation) return null;

    if (!params) return translation;

    return Object.entries(params).reduce((result, [key, value]) => {
      return result.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
    }, translation);
  }, [language]);

  return { tAlt, altLanguage: language === 'en' ? 'es' : 'en' };
}
