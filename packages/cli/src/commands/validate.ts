import { readFile } from 'node:fs/promises';
import { stdin } from 'node:process';
import { setApiVersion, type ValidationResult, validateText } from '@gaql/core';
import boxen from 'boxen';
import chalk from 'chalk';
import Table from 'cli-table3';
import ora from 'ora';

interface ValidateOptions {
  apiVersion: string;
  format: string;
  color: boolean;
}

export async function validateCommand(
  file: string | undefined,
  options: ValidateOptions,
): Promise<void> {
  // Set API version
  const version = options.apiVersion as '19' | '20' | '21';
  if (!['19', '20', '21'].includes(version)) {
    console.error(chalk.red(`Invalid API version: ${version}. Must be 19, 20, or 21.`));
    process.exit(1);
  }
  setApiVersion(version);

  // Read input
  const spinner = ora('Reading input...').start();
  let text: string;
  try {
    if (file) {
      text = await readFile(file, 'utf-8');
      spinner.succeed(`Read file: ${file}`);
    } else {
      text = await readStdin();
      spinner.succeed('Read from stdin');
    }
  } catch (error) {
    spinner.fail('Failed to read input');
    console.error(chalk.red((error as Error).message));
    process.exit(1);
  }

  // Validate
  spinner.start('Validating GAQL queries...');
  const results = validateText(text);
  spinner.stop();

  // Output results
  if (options.format === 'json') {
    outputJson(results);
  } else if (options.format === 'llm') {
    outputLlm(results, options.color);
  } else if (options.format === 'rich') {
    outputRich(results, options.color);
  } else {
    outputText(results, options.color);
  }

  // Exit with error code if validation failed
  const hasErrors = results.some((result) => !result.valid);
  process.exit(hasErrors ? 1 : 0);
}

async function readStdin(): Promise<string> {
  // Check if stdin is a TTY (interactive terminal)
  if (stdin.isTTY) {
    throw new Error(
      'No input provided. Please provide a file path or pipe input via stdin.\n' +
      'Examples:\n' +
      '  gaql validate query.gaql\n' +
      '  cat query.gaql | gaql validate\n' +
      '  echo "SELECT campaign.id FROM campaign" | gaql validate'
    );
  }

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let hasData = false
    let timeoutId: NodeJS.Timeout

    // Set a timeout to detect if no data arrives
    timeoutId = setTimeout(() => {
      if (!hasData) {
        stdin.removeAllListeners()
        reject(
          new Error(
            "No input detected. Please provide a file path or pipe input via stdin.\n" +
              "Examples:\n" +
              "  gaql validate query.gaql\n" +
              "  cat query.gaql | gaql validate\n" +
              '  echo "SELECT campaign.id FROM campaign" | gaql validate'
          )
        )
      }
    }, 1000) // 1 second timeout for first data

    stdin.on("data", (chunk: Buffer) => {
      hasData = true
      chunks.push(chunk)
      clearTimeout(timeoutId)
    })

    stdin.on("end", () => {
      clearTimeout(timeoutId)
      resolve(Buffer.concat(chunks).toString("utf-8"))
    })

    stdin.on("error", (err: Error) => {
      clearTimeout(timeoutId)
      reject(err)
    })
  });
}

function outputJson(results: Array<ValidationResult & { query: string; line: number }>): void {
  console.log(
    JSON.stringify(
      {
        totalQueries: results.length,
        validQueries: results.filter((r) => r.valid).length,
        invalidQueries: results.filter((r) => !r.valid).length,
        results: results
          .filter((result) => !result.valid) // Only include invalid queries
          .map((result) => ({
            query: result.query,
            line: result.line,
            valid: result.valid,
            errors: result.errors,
          })),
      },
      null,
      2,
    ),
  );
}

function outputLlm(
  results: Array<ValidationResult & { query: string; line: number }>,
  useColor: boolean,
): void {
  const c = useColor ? chalk : noColorChalk();

  if (results.length === 0) {
    console.log('SUMMARY: Total=0, Valid=0, Invalid=0');
    console.log();
    console.log(c.yellow('[WARN] No GAQL queries found in input.'));
    return;
  }

  // Summary line
  const validCount = results.filter((r) => r.valid).length;
  const invalidCount = results.filter((r) => !r.valid).length;
  console.log(
    c.bold(`SUMMARY: Total=${results.length}, Valid=${validCount}, Invalid=${invalidCount}`),
  );
  console.log();

  // Only show invalid queries to reduce noise
  for (const result of results) {
    if (result.valid) {
      continue; // Skip valid queries
    }

    const queryOneLine = result.query.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();

    // Output each error on its own line
    for (const error of result.errors) {
      const parts = [
        c.red('[ERROR]'),
        `Line ${result.line + 1}`,
        `(col ${error.column}-${error.column + error.length}):`,
        `${error.type}`,
        `-`,
        `${error.message}`,
      ];

      if (error.suggestion) {
        parts.push(`|`, `Suggestion: ${error.suggestion}`);
      }

      if (error.field) {
        parts.push(`|`, `Field: ${error.field}`);
      }

      parts.push(`|`, `Query: ${queryOneLine}`);

      console.log(parts.join(' '));
    }
  }
}

function outputText(
  results: Array<ValidationResult & { query: string; line: number }>,
  useColor: boolean,
): void {
  const c = useColor ? chalk : noColorChalk();

  console.log(c.bold('\n=== GAQL Validation Results ===\n'));

  if (results.length === 0) {
    console.log(c.yellow('No GAQL queries found in input.'));
    return;
  }

  const validCount = results.filter((r) => r.valid).length;
  const invalidCount = results.filter((r) => !r.valid).length;

  console.log(c.bold(`Total queries: ${results.length}`));
  console.log(c.green(`✓ Valid: ${validCount}`));
  if (invalidCount > 0) {
    console.log(c.red(`✗ Invalid: ${invalidCount}`));
  }
  console.log();

  // Display only invalid queries
  for (const result of results) {
    if (result.valid) {
      continue; // Skip valid queries
    }

    console.log(c.red(`✗ Query at line ${result.line + 1}: Invalid`));
    console.log(c.dim('  Query:'));
    console.log(c.dim(`    ${result.query.replace(/\n/g, '\n    ')}`));
    console.log();
    console.log(c.bold('  Errors:'));
    for (const error of result.errors) {
      console.log(c.red(`    • ${error.message}`));
      if (error.suggestion) {
        console.log(c.yellow(`      Suggestion: ${error.suggestion}`));
      }
    }
    console.log();
  }
}

function outputRich(
  results: Array<ValidationResult & { query: string; line: number }>,
  useColor: boolean,
): void {
  const c = useColor ? chalk : noColorChalk();

  if (results.length === 0) {
    console.log(
      boxen(c.yellow('No GAQL queries found in input.'), {
        padding: 1,
        borderColor: 'yellow',
        borderStyle: 'round',
      }),
    );
    return;
  }

  const validCount = results.filter((r) => r.valid).length;
  const invalidCount = results.filter((r) => !r.valid).length;

  // Display summary in a box
  const summaryText = [
    c.bold('GAQL Validation Results'),
    '',
    `Total queries: ${c.bold(results.length.toString())}`,
    `${c.green('✓')} Valid: ${c.green(validCount.toString())}`,
    `${c.red('✗')} Invalid: ${c.red(invalidCount.toString())}`,
  ].join('\n');

  console.log(
    boxen(summaryText, {
      padding: 1,
      borderColor: invalidCount > 0 ? 'red' : 'green',
      borderStyle: 'round',
      title: '📊 Summary',
      titleAlignment: 'center',
    }),
  );
  console.log();

  // Display only invalid queries in tables
  const invalidResults = results.filter((r) => !r.valid);

  if (invalidResults.length === 0) {
    console.log(c.green('✨ All queries are valid!'));
    return;
  }

  for (const result of invalidResults) {
    // Create a table for each invalid query
    const table = new Table({
      head: [c.bold('Property'), c.bold('Value')],
      colWidths: [20, 80],
      wordWrap: true,
      style: {
        head: useColor ? ['cyan'] : [],
        border: useColor ? ['gray'] : [],
      },
    });

    table.push(
      [c.bold('Line'), c.red((result.line + 1).toString())],
      [
        c.bold('Query'),
        c.dim(result.query.length > 100 ? `${result.query.substring(0, 100)}...` : result.query),
      ],
    );

    // Collect suggestions from all errors
    const suggestions: Array<{ field: string; suggestion: string }> = [];

    // Add errors
    for (let i = 0; i < result.errors.length; i++) {
      const error = result.errors[i];
      table.push(
        [c.bold(`Error ${i + 1}`), c.red(error.message)],
        [c.bold('Type'), c.yellow(error.type)],
        [
          c.bold('Position'),
          `Line ${error.line}, Column ${error.column}-${error.column + error.length}`,
        ],
      );

      if (error.field) {
        table.push([c.bold('Field'), useColor ? chalk.cyan(error.field) : error.field]);
      }

      // Collect suggestions instead of adding to table
      if (error.suggestion && error.field) {
        suggestions.push({ field: error.field, suggestion: error.suggestion });
      }
    }

    console.log(table.toString());

    // Display suggestions in a rich box with corrected query
    if (suggestions.length > 0) {
      const suggestionText = suggestions
        .map((s, i) => {
          // Create corrected query by replacing the error field with suggestion
          const correctedQuery = result.query.replaceAll(s.field, s.suggestion);
          const prefix = suggestions.length > 1 ? `${i + 1}. ` : '';
          return `${prefix}${c.green(c.bold(correctedQuery))}`;
        })
        .join('\n\n');

      console.log(
        boxen(suggestionText, {
          padding: 1,
          margin: { left: 2 },
          borderColor: 'green',
          borderStyle: 'round',
          title: '💡 Did you mean?',
          titleAlignment: 'center',
        }),
      );
    }

    console.log();
  }
}

function noColorChalk() {
  const identity = (str: string) => str;
  return {
    bold: identity,
    green: identity,
    red: identity,
    yellow: identity,
    dim: identity,
    cyan: identity,
  };
}
