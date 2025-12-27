import arcjet, { shield, detectBot, slidingWindow } from '@arcjet/node';

// Use DRY_RUN mode in development to avoid strict enforcement
const isDevelopment = process.env.NODE_ENV !== 'production';
const arcjetMode = isDevelopment ? 'DRY_RUN' : 'LIVE';

const aj = arcjet({
  key: process.env.ARCJET_KEY,
  rules: [
    shield({ mode: arcjetMode }),
    detectBot({
      mode: arcjetMode,
      allow: ['CATEGORY:SEARCH_ENGINE', 'CATEGORY:PREVIEW'],
      // In DRY_RUN mode, bot detection won't fail on missing user-agent
    }),
    slidingWindow({
      mode: arcjetMode,
      interval: isDevelopment ? '1m' : '2s',
      max: isDevelopment ? 100 : 5, // Much higher limit in development
    }),
  ],
});

export default aj;