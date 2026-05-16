import { REST, Routes } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { config } from '../config';
import { Command } from './client';

const commands: unknown[] = [];
const commandsPath = path.join(__dirname, 'commands');

for (const file of fs.readdirSync(commandsPath).filter(f => f.endsWith('.ts') || f.endsWith('.js'))) {
  const cmd: Command = require(path.join(commandsPath, file)).default;
  commands.push(cmd.data.toJSON());
}

const rest = new REST().setToken(config.discord.token);

(async () => {
  console.log(`🔄 A registar ${commands.length} slash commands...`);
  await rest.put(Routes.applicationCommands(config.discord.clientId), { body: commands });
  console.log('✅ Slash commands registados!');
})();
