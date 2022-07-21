import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { GithubService } from '../services';
import BaseCommand from './BaseCommand';

export default class LookupCommand extends BaseCommand {
  private NULL_QUERY_MESSAGE = 'Query cannot be empty.';

  _name = 'lookup';

  public get name() {
    return this._name;
  }

  public builder() {
    return new SlashCommandBuilder()
      .setName(this.name)
      .setDescription('Look up note')
      .addStringOption((option) => option.setName('query').setDescription('Exact match'));
  }

  public async execute(opts: {
    interaction: ChatInputCommandInteraction,
  }) {
    const { interaction } = opts;
    const github = GithubService.instance();
    const name = interaction.options.getString('query');
    if (name === null) {
      interaction.reply({
        content: this.NULL_QUERY_MESSAGE,
      });
      return;
    }
    interaction.deferReply({
      ephemeral: true,
    });
    const fetchNoteResp = await github.fetchNote({ name });
    const { content } = fetchNoteResp;
    interaction.editReply({
      content: `\`\`\`${content}\`\`\``,
    });
  }
}
