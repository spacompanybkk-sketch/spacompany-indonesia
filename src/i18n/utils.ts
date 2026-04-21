import { translations, type Locale, type TranslationKey } from './translations';

export function getLangFromUrl(url: URL): Locale {
  const [, lang] = url.pathname.split('/');
  if (lang === 'en') return 'en';
  return 'id';
}

export function t(lang: Locale, key: TranslationKey): string {
  return translations[lang][key] ?? translations['en'][key] ?? key;
}

export function localizedPath(lang: Locale, path: string): string {
  const cleanPath = path.replace(/^\/(en|id)/, '');
  return `/${lang}${cleanPath || '/'}`;
}
