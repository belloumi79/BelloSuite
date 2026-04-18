'use client';

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/routing';
import { Globe } from 'lucide-react';

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const toggleLanguage = (newLocale: string) => {
    router.replace(pathname, { locale: newLocale });
  };

  const languages = [
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'ar', name: 'العربية', flag: '🇹🇳' },
  ];

  return (
    <div className="flex items-center gap-2 bg-zinc-100 p-1 rounded-lg border border-zinc-200">
      {languages.map((lang) => (
        <button
          key={lang.code}
          onClick={() => toggleLanguage(lang.code)}
          className={`px-2 py-1 text-xs font-bold rounded-md transition-all ${
            locale === lang.code
              ? 'bg-white text-teal-600 shadow-sm'
              : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50'
          }`}
          title={lang.name}
        >
          <span className="md:hidden">{lang.flag}</span>
          <span className="hidden md:inline">{lang.name}</span>
        </button>
      ))}
    </div>
  );
}
