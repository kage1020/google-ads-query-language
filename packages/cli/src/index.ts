#!/usr/bin/env node
import { Command } from 'commander';
import packageJson from '../package.json' with { type: 'json' };
import { validateCommand } from './commands/validate.js';

const program = new Command();

program
  .name('gaql')
  .description('CLI tool for Google Ads Query Language (GAQL) validation and type generation')
  .version(packageJson.version);

// Validate command
program
  .command('validate')
  .description('Validate GAQL queries in a file or from stdin')
  .argument('[file]', 'File containing GAQL queries (if omitted, reads from stdin)')
  .option('-v, --api-version <version>', 'Google Ads API version (19, 20, or 21)', '21')
  .option('-f, --format <format>', 'Output format (text, json, or llm)', 'text')
  .option('--no-color', 'Disable colored output')
  .action(validateCommand);

program.parse();
