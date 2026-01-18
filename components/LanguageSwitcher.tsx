'use client';

import { useState, useRef, useEffect } from 'react';
import { useTranslation, Language } from '@/lib/i18n';

const LANGUAGES: { code: Language; label: string; flag: string }[] = [
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'es', label: 'Español', flag: '🇲🇽' },
];

export function LanguageSwitcher() {
  const { language, setLanguage, isLoading } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLanguage = LANGUAGES.find((l) => l.code === language) || LANGUAGES[0];

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLanguageSelect = async (lang: Language) => {
    if (lang !== language) {
      await setLanguage(lang);
      // Refresh the page to reload all translations
      window.location.reload();
    }
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className="flex items-center gap-2 px-2.5 py-1.5 bg-white/80 hover:bg-white border border-gray-200/50 rounded-lg transition-all duration-200 disabled:opacity-50"
        title={currentLanguage.label}
      >
        <span className="text-base">{currentLanguage.flag}</span>
        <span className="text-sm font-medium text-gray-700 hidden sm:inline">
          {currentLanguage.code.toUpperCase()}
        </span>
        <svg
          className={`w-3 h-3 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-1 w-40 bg-white rounded-xl border border-gray-200/50 shadow-lg py-1 z-50">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleLanguageSelect(lang.code)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition-colors ${
                lang.code === language ? 'bg-blue-50' : ''
              }`}
            >
              <span className="text-base">{lang.flag}</span>
              <span
                className={`text-sm flex-1 text-left ${
                  lang.code === language ? 'font-medium text-blue-700' : 'text-gray-700'
                }`}
              >
                {lang.label}
              </span>
              {lang.code === language && (
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
