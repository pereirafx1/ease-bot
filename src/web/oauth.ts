import axios from 'axios';
import { config } from '../config';
import { userRepo, UserRow } from '../database/db';

export interface DiscordTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
}

export interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  global_name: string | null;
  avatar: string | null;
  email?: string;
  verified?: boolean;
}

export interface DiscordGuild {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  permissions: string;
}

export function buildOAuthUrl(guildId: string): string {
  const params = new URLSearchParams({
    client_id: config.discord.clientId,
    redirect_uri: config.oauth.redirectUri,
    response_type: 'code',
    scope: config.oauth.scopes.join(' '),
    state: guildId,
    prompt: 'none',
  });
  return `https://discord.com/api/oauth2/authorize?${params}`;
}

export async function exchangeCode(code: string): Promise<DiscordTokenResponse> {
  const res = await axios.post<DiscordTokenResponse>(
    'https://discord.com/api/oauth2/token',
    new URLSearchParams({
      client_id: config.discord.clientId,
      client_secret: config.discord.clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: config.oauth.redirectUri,
    }),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  );
  return res.data;
}

export async function refreshToken(refreshTk: string): Promise<DiscordTokenResponse> {
  const res = await axios.post<DiscordTokenResponse>(
    'https://discord.com/api/oauth2/token',
    new URLSearchParams({
      client_id: config.discord.clientId,
      client_secret: config.discord.clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshTk,
    }),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  );
  return res.data;
}

export async function fetchDiscordUser(accessToken: string): Promise<DiscordUser> {
  const res = await axios.get<DiscordUser>('https://discord.com/api/v10/users/@me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return res.data;
}

export async function fetchUserGuilds(accessToken: string): Promise<DiscordGuild[]> {
  const res = await axios.get<DiscordGuild[]>('https://discord.com/api/v10/users/@me/guilds', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return res.data;
}

export async function addMemberToGuild(accessToken: string, guildId: string, userId: string, roleId?: string): Promise<number> {
  const body: Record<string, unknown> = { access_token: accessToken };
  if (roleId) body.roles = [roleId];

  const res = await axios.put(
    `https://discord.com/api/v10/guilds/${guildId}/members/${userId}`,
    body,
    { headers: { Authorization: `Bot ${config.discord.token}`, 'Content-Type': 'application/json' } }
  );
  return res.status;
}

export async function addRoleToMember(guildId: string, userId: string, roleId: string): Promise<void> {
  await axios.put(
    `https://discord.com/api/v10/guilds/${guildId}/members/${userId}/roles/${roleId}`,
    {},
    { headers: { Authorization: `Bot ${config.discord.token}` } }
  );
}

export async function refreshTokenIfNeeded(user: UserRow): Promise<string | null> {
  if (Date.now() < user.token_expires_at - 60_000) {
    return user.access_token;
  }

  if (!user.refresh_token) return null;

  try {
    const tokens = await refreshToken(user.refresh_token);
    userRepo.upsert({
      ...user,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_expires_at: Date.now() + tokens.expires_in * 1000,
    });
    return tokens.access_token;
  } catch {
    return null;
  }
}
