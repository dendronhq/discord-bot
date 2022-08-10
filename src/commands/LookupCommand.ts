import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
} from 'discord.js';
import { LookupResultBuilder } from '../components';
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
      .addStringOption(
        (option) => option.setName('query')
          .setDescription('Exact match')
          .setRequired(true),
      )
      .addStringOption(
        (option) => option.setName('mode')
          .setDescription('Select mode')
          .setRequired(false)
          .addChoices(
            { name: 'full', value: 'full' },
            { name: 'fm', value: 'fm' },
          ),
      );
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
    interaction.deferReply();
    const mode = interaction.options.getString('mode');
    try {
      const fetchNoteResp = await github.fetchNote({ name });
      const {
        url: blobUrl,
        frontmatter,
        body,
      } = fetchNoteResp;
      const { dendronConfig } = github;

      interaction.editReply({
        embeds: new LookupResultBuilder({
          frontmatter, body, dendronConfig, blobUrl,
        }).build(mode),
      });
    } catch (error) {
      console.log({ error });
      interaction.editReply({
        content: `Couldn't find note \`${name}\``,
      });
    }
  }
}
