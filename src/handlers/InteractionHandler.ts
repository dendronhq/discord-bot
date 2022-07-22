import { ChatInputCommandInteraction, Interaction } from 'discord.js';
import { CHAT_INPUT_COMMANDS } from '../commands';

export default class InteractionHandler {
  static async onInteraction(interaction: Interaction) {
    if (interaction.isChatInputCommand()) {
      await this.onChatInputCommand(interaction);
    }
  }

  static async onChatInputCommand(interaction: ChatInputCommandInteraction) {
    const { commandName } = interaction;
    const command = CHAT_INPUT_COMMANDS.get(commandName);
    if (command === undefined) {
      return;
    }
    await command.execute({ interaction });
  }
}
