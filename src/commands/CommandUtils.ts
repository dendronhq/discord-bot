import { REST } from '@discordjs/rest';
import { Routes } from 'discord.js';
import { CHAT_INPUT_COMMAND_INSTANCES } from '.';

export default class CommandUtils {
  static async registerCommands() {
    if (process.env.BOT_TOKEN === undefined) {
      throw Error('No bot token set.');
    }

    if (process.env.CLIENT_ID === undefined) {
      throw Error('No client id set.');
    }

    if (process.env.GUILD_ID === undefined) {
      throw Error('No guild id set.');
    }

    const rest = new REST({ version: '9' }).setToken(process.env.BOT_TOKEN);

    const commands = CHAT_INPUT_COMMAND_INSTANCES.map((command) => {
      const data = command.builder();
      return data.toJSON();
    });

    await rest.put(
      Routes.applicationGuildCommands(
        process.env.CLIENT_ID,
        process.env.GUILD_ID,
      ),
      { body: commands },
    );

    console.log('Successfully registered commands');
  }
}
