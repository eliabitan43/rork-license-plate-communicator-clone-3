import { getRequestConfig } from 'next-intl/server';

// Hebrew toggle is stubbed for launch: locale is pinned to 'en' and messages
// live in messages/en.json. Adding he.json + a locale cookie switch is the
// only change needed to go bilingual — no component rewrites.
export default getRequestConfig(async () => ({
  locale: 'en',
  messages: (await import('../messages/en.json')).default,
}));
