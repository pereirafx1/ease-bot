import dotenv from 'dotenv';
dotenv.config();

function required(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing env var: ${key}`);
  return val;
}

export const config = {
  discord: {
    token: required('DISCORD_TOKEN'),
    clientId: required('DISCORD_CLIENT_ID'),
    clientSecret: required('DISCORD_CLIENT_SECRET'),
  },
  oauth: {
    redirectUri: required('REDIRECT_URI'),
    scopes: ['identify', 'email', 'guilds', 'guilds.join'],
  },
  web: {
    port: parseInt(process.env.PORT ?? '3000'),
    baseUrl: process.env.BASE_URL ?? 'http://localhost:3000',
  },
  dbPath: process.env.DB_PATH ?? './data/ease.db',
};
