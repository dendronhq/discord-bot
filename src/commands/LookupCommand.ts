import { ActionRowBuilder, ButtonBuilder, MessageActionRowComponentBuilder } from '@discordjs/builders';
import {
  ButtonStyle,
  ChatInputCommandInteraction,
  MessagePayload,
  SlashCommandBuilder,
  WebhookEditMessageOptions,
} from 'discord.js';
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
    interaction.deferReply();
    try {
      const fetchNoteResp = await github.fetchNote({ name });
      const { content, url, id } = fetchNoteResp;
      const { dendronConfig } = github;
      if (content.length < 2000) {
        interaction.editReply({
          content: `\`\`\`${content}\`\`\``,
        });
      } else {
        interaction.editReply(LookupCommand.noteTooLongReplyPayload({
          id, name, url, dendronConfig,
        }));
      }
    } catch (error) {
      interaction.editReply({
        content: `Couldn't find note \`${name}\``,
      });
    }
  }

  static noteTooLongReplyPayload(opts: {
    id: string,
    name: string,
    url: string,
    dendronConfig: any,
  }): string | MessagePayload | WebhookEditMessageOptions {
    const {
      id, name, url, dendronConfig,
    } = opts;
    const content = `The note \`${name}\` is too long to display in Discord :face_with_spiral_eyes:`;

    const actionRow = new ActionRowBuilder<MessageActionRowComponentBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setLabel('Open in GitHub')
          .setURL(url)
          .setStyle(ButtonStyle.Link),
      );
    if (dendronConfig !== undefined) {
      const publishingConfig = dendronConfig.publishing;
      const urlRoot: string = publishingConfig.siteUrl;
      actionRow.addComponents(
        new ButtonBuilder()
          .setLabel(`Open in ${urlRoot.split('//').slice(-1)}`)
          .setURL(`${urlRoot}/notes/${id}`)
          .setStyle(ButtonStyle.Link),
      );
    }
    return {
      content,
      components: [actionRow],
    };
  }
}
