import { ConfigUtils, DENDRON_COLORS, IntermediateDendronConfig } from '@dendronhq/common-all';
import { EmbedBuilder } from '@discordjs/builders';
import { APIEmbedField } from 'discord.js';
import _ from 'lodash';

export type LookupResultCreateOpts = {
  frontmatter: {
    [key: string]: string
  },
  body: string,
  dendronConfig: IntermediateDendronConfig | undefined,
  blobUrl: string,
}

export class LookupResultBuilder {
  opts: LookupResultCreateOpts;

  DENDRON_GREEN = Number(DENDRON_COLORS['dendron green'].replace('#', '0x'));

  private buildFrontmatterEmbed() {
    const { frontmatter, dendronConfig, blobUrl } = this.opts;
    const { id } = frontmatter;

    const fields: APIEmbedField[] = _.map(frontmatter, (value, key): APIEmbedField => ({
      name: key,
      value: value.toString(),
      inline: true,
    })).filter((field) => field.name !== 'desc'
        && field.name !== 'config'
        && (
          _.isString(field.value) || _.isNumber(field.value)
        ));

    fields.push({
      name: 'Github URL',
      value: blobUrl,
    });

    const frontmatterEmbedBuilder = new EmbedBuilder()
      .setColor(this.DENDRON_GREEN)
      .setTitle(frontmatter.title)
      .addFields(fields);

    if (frontmatter.desc !== '') {
      frontmatterEmbedBuilder.setDescription(`_*${frontmatter.desc}*_`);
    }

    if (dendronConfig !== undefined) {
      const publishingConfig = ConfigUtils.getPublishingConfig(dendronConfig);
      const { siteUrl } = publishingConfig;
      const publishedUrl = `${siteUrl}/notes/${id}`;
      frontmatterEmbedBuilder.setURL(publishedUrl);
    }
    return frontmatterEmbedBuilder;
  }

  private buildBodyEmbed() {
    let { body } = this.opts;
    if (body.length > 4096) {
      body = `${body.substring(0, 4000)}\n\n...\n_*(truncated)*_`;
    }
    const bodyEmbedBuilder = new EmbedBuilder()
      .setColor(this.DENDRON_GREEN)
      .setDescription(body);
    return bodyEmbedBuilder;
  }

  public build(mode: string | null) {
    const payload = [];
    if (mode !== 'body') {
      payload.push(this.buildFrontmatterEmbed());
    }

    if (mode !== 'fm') {
      payload.push(this.buildBodyEmbed());
    }
    return payload;
  }

  constructor(opts: LookupResultCreateOpts) {
    this.opts = opts;
  }
}
