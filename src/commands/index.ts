import { SlashCommandBuilder } from 'discord.js';
import LookupCommand from './LookupCommand';

export * from './LookupCommand';

export type CommandInstance = {
  _name: string;
  builder: () => Omit<SlashCommandBuilder, 'addSubcommand' | 'addSubcommandGroup'>;
  execute: () => Promise<any>
}

export type CommandConstructor = {
  new (): CommandInstance;
};

export const CHAT_INPUT_COMMAND_INSTANCES = [
  new LookupCommand(),
];

export const CHAT_INPUT_COMMANDS = new Map(
  CHAT_INPUT_COMMAND_INSTANCES.map(
    (command) => [command.name, command],
  ),
);
