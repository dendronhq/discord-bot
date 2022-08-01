import 'dotenv/config';
import { Client, GatewayIntentBits } from 'discord.js';
import CommandUtils from './commands/CommandUtils';
import InteractionHandler from './handlers/InteractionHandler';
import config from './config';

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

client.once('ready', () => {
  console.log('client is ready');
});

client.on(
  'interactionCreate',
  async (interaction) => InteractionHandler.onInteraction(interaction),
);

CommandUtils.registerCommands();
client.login(config.BOT_TOKEN);
