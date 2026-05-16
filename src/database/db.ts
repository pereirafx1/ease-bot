import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';
import { config } from '../config';

const dbDir = path.dirname(config.dbPath);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

export const db = new DatabaseSync(config.dbPath);

db.exec(`PRAGMA journal_mode = WAL`);
db.exec(`PRAGMA foreign_keys = ON`);

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    discriminator TEXT NOT NULL DEFAULT '0',
    global_name TEXT,
    email TEXT,
    avatar TEXT,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    token_expires_at INTEGER NOT NULL,
    guilds TEXT DEFAULT '[]',
    verified_at INTEGER NOT NULL,
    verified_guild_id TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS guild_configs (
    guild_id TEXT PRIMARY KEY,
    channel_id TEXT,
    role_id TEXT,
    message_id TEXT,
    embed_title TEXT DEFAULT 'Verificação',
    embed_description TEXT DEFAULT 'Clica no botão abaixo para te verificares.',
    embed_color TEXT DEFAULT '5865F2'
  );
`);

export interface UserRow {
  id: string;
  username: string;
  discriminator: string;
  global_name: string | null;
  email: string | null;
  avatar: string | null;
  access_token: string;
  refresh_token: string | null;
  token_expires_at: number;
  guilds: string;
  verified_at: number;
  verified_guild_id: string;
}

export interface GuildConfig {
  guild_id: string;
  channel_id: string | null;
  role_id: string | null;
  message_id: string | null;
  embed_title: string;
  embed_description: string;
  embed_color: string;
}

export const userRepo = {
  upsert(user: UserRow) {
    db.prepare(`
      INSERT INTO users (id, username, discriminator, global_name, email, avatar, access_token, refresh_token, token_expires_at, guilds, verified_at, verified_guild_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        username = excluded.username,
        discriminator = excluded.discriminator,
        global_name = excluded.global_name,
        email = excluded.email,
        avatar = excluded.avatar,
        access_token = excluded.access_token,
        refresh_token = excluded.refresh_token,
        token_expires_at = excluded.token_expires_at,
        guilds = excluded.guilds,
        verified_at = excluded.verified_at,
        verified_guild_id = excluded.verified_guild_id
    `).run(
      user.id, user.username, user.discriminator, user.global_name,
      user.email, user.avatar, user.access_token, user.refresh_token,
      user.token_expires_at, user.guilds, user.verified_at, user.verified_guild_id
    );
  },

  getById(id: string): UserRow | undefined {
    return db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined;
  },

  getAll(): UserRow[] {
    return db.prepare('SELECT * FROM users ORDER BY verified_at DESC').all() as unknown as UserRow[];
  },

  search(query: string): UserRow[] {
    const q = `%${query}%`;
    return db.prepare(`
      SELECT * FROM users
      WHERE username LIKE ? OR global_name LIKE ? OR email LIKE ? OR id LIKE ?
      ORDER BY verified_at DESC
    `).all(q, q, q, q) as unknown as UserRow[];
  },

  count(): number {
    return (db.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number }).c;
  },

  delete(id: string) {
    db.prepare('DELETE FROM users WHERE id = ?').run(id);
  },
};

export const guildRepo = {
  get(guildId: string): GuildConfig | undefined {
    return db.prepare('SELECT * FROM guild_configs WHERE guild_id = ?').get(guildId) as GuildConfig | undefined;
  },

  upsert(cfg: Partial<GuildConfig> & { guild_id: string }) {
    const existing = guildRepo.get(cfg.guild_id);
    if (existing) {
      const merged = { ...existing, ...cfg };
      db.prepare(`
        UPDATE guild_configs
        SET channel_id=?, role_id=?, message_id=?, embed_title=?, embed_description=?, embed_color=?
        WHERE guild_id=?
      `).run(merged.channel_id, merged.role_id, merged.message_id, merged.embed_title, merged.embed_description, merged.embed_color, merged.guild_id);
    } else {
      const merged = {
        channel_id: null, role_id: null, message_id: null,
        embed_title: 'Verificação',
        embed_description: 'Clica no botão abaixo para te verificares.',
        embed_color: '5865F2',
        ...cfg,
      };
      db.prepare(`
        INSERT INTO guild_configs (guild_id, channel_id, role_id, message_id, embed_title, embed_description, embed_color)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(merged.guild_id, merged.channel_id, merged.role_id, merged.message_id, merged.embed_title, merged.embed_description, merged.embed_color);
    }
  },
};
