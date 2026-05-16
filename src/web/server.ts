import express from 'express';
import { config } from '../config';
import {
  exchangeCode,
  fetchDiscordUser,
  fetchUserGuilds,
  addMemberToGuild,
  addRoleToMember,
} from './oauth';
import { userRepo, guildRepo } from '../database/db';

const app = express();

app.get('/callback', async (req, res) => {
  const code = req.query.code as string | undefined;
  const guildId = req.query.state as string | undefined;
  const error = req.query.error as string | undefined;

  if (error) {
    return res.send(page('❌ Acesso Negado', 'Cancelaste a verificação. Fecha esta janela e tenta novamente.', false));
  }

  if (!code || !guildId) {
    return res.status(400).send(page('❌ Erro', 'Parâmetros inválidos.', false));
  }

  try {
    const tokens = await exchangeCode(code);
    const discordUser = await fetchDiscordUser(tokens.access_token);
    const guilds = await fetchUserGuilds(tokens.access_token);

    userRepo.upsert({
      id: discordUser.id,
      username: discordUser.username,
      discriminator: discordUser.discriminator,
      global_name: discordUser.global_name ?? null,
      email: discordUser.email ?? null,
      avatar: discordUser.avatar ?? null,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_expires_at: Date.now() + tokens.expires_in * 1000,
      guilds: JSON.stringify(guilds),
      verified_at: Date.now(),
      verified_guild_id: guildId,
    });

    const guildConfig = guildRepo.get(guildId);

    try {
      await addMemberToGuild(tokens.access_token, guildId, discordUser.id);
    } catch {}

    if (guildConfig?.role_id) {
      try {
        await addRoleToMember(guildId, discordUser.id, guildConfig.role_id);
      } catch {}
    }

    return res.send(page(
      '✅ Verificado!',
      `Olá <strong>${discordUser.global_name ?? discordUser.username}</strong>, a tua verificação foi concluída com sucesso! Podes fechar esta janela.`,
      true
    ));
  } catch (err: any) {
    console.error('OAuth callback error:', err?.response?.data ?? err.message);
    return res.status(500).send(page('❌ Erro', 'Ocorreu um erro durante a verificação. Tenta novamente.', false));
  }
});

app.get('/health', (_req, res) => res.json({ status: 'ok', users: userRepo.count() }));

function page(title: string, message: string, success: boolean): string {
  const color = success ? '#57f287' : '#ed4245';
  const bg = success ? '#1e3a2f' : '#3a1e1e';
  return `<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${title} — Ease Bot</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'gg sans', 'Noto Sans', Arial, sans-serif;
      background: #313338;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      color: #dbdee1;
    }
    .card {
      background: #2b2d31;
      border: 1px solid ${color}44;
      border-top: 4px solid ${color};
      border-radius: 12px;
      padding: 40px 48px;
      text-align: center;
      max-width: 420px;
      width: 90%;
      background: ${bg}44;
    }
    .icon { font-size: 48px; margin-bottom: 16px; }
    h1 { font-size: 24px; font-weight: 700; margin-bottom: 12px; color: ${color}; }
    p { font-size: 15px; line-height: 1.5; color: #b5bac1; }
    .brand { margin-top: 28px; font-size: 12px; color: #4e5058; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${success ? '✅' : '❌'}</div>
    <h1>${title}</h1>
    <p>${message}</p>
    <div class="brand">Ease Bot • OAuth2 Verification</div>
  </div>
</body>
</html>`;
}

export function startWebServer() {
  app.listen(config.web.port, () => {
    console.log(`🌐 Web server: http://localhost:${config.web.port}`);
  });
}
