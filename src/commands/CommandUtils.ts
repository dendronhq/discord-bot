import { REST } from '@discordjs/rest';
import { Routes } from 'discord.js';
import { CHAT_INPUT_COMMAND_INSTANCES } from '.';
import config from '../config';

export default class CommandUtils {
  static async registerCommands() {
    const rest = new REST({ version: '9' }).setToken(config.BOT_TOKEN);

    const commands = CHAT_INPUT_COMMAND_INSTANCES.map((command) => {
      const data = command.builder();
      return data.toJSON();
    });

    await rest.put(
      Routes.applicationGuildCommands(
        config.CLIENT_ID,
        config.GUILD_ID,
      ),
      { body: commands },
    );

    console.log('Successfully registered commands');
  }

  static async deleteAllCommands() {
    if (config.BOT_TOKEN === undefined) {
      throw Error('No bot token set.');
    }

    if (config.CLIENT_ID === undefined) {
      throw Error('No client id set.');
    }

    if (config.GUILD_ID === undefined) {
      throw Error('No guild id set.');
    }

    const rest = new REST({ version: '9' }).setToken(config.BOT_TOKEN);

    await rest.put(
      Routes.applicationGuildCommands(
        config.CLIENT_ID,
        config.GUILD_ID,
      ),
      { body: [] },
    );

    console.log('Successfully deleted commands');
  }
}
