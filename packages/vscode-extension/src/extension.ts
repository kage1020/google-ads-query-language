import * as vscode from 'vscode';
import { GAQLCompletionProvider } from './completion.js';
import { configName, getApiVersion, getLanguage } from './config.js';
import { GAQLHoverProvider } from './hover.js';
import { initializeLocalization, updateLanguage } from './localization.js';
import { GAQLCodeActionProvider, GAQLValidator } from './validator.js';

const supportedCodeLanguages = ['typescript', 'javascript'] as const;
type SupportedCodeLanguage = (typeof supportedCodeLanguages)[number];

export function activate(context: vscode.ExtensionContext) {
  // Initialize localization
  initializeLocalization(getLanguage());

  const version = getApiVersion();

  // Register completion provider
  const completionProvider = vscode.languages.registerCompletionItemProvider(
    supportedCodeLanguages,
    new GAQLCompletionProvider(),
    '.',
    ' ',
    '\n',
    '@',
  );

  // Register hover provider
  const hoverProvider = vscode.languages.registerHoverProvider(
    supportedCodeLanguages,
    new GAQLHoverProvider(),
  );

  // Register code action provider (Quick Fix)
  const codeActionProvider = vscode.languages.registerCodeActionsProvider(
    supportedCodeLanguages,
    new GAQLCodeActionProvider(),
    {
      providedCodeActionKinds: GAQLCodeActionProvider.providedCodeActionKinds,
    },
  );

  // Create diagnostic collection for validation
  const diagnosticCollection = vscode.languages.createDiagnosticCollection(configName.prefix);
  const validator = new GAQLValidator(diagnosticCollection);

  // Validate on document open
  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument((document) => {
      if (supportedCodeLanguages.includes(document.languageId as SupportedCodeLanguage)) {
        validator.validateDocument(document, version);
      }
    }),
  );

  // Validate on document change
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((event) => {
      if (supportedCodeLanguages.includes(event.document.languageId as SupportedCodeLanguage)) {
        validator.validateDocument(event.document, version);
      }
    }),
  );

  // Validate on editor switch
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor) {
        const document = editor.document;
        if (supportedCodeLanguages.includes(document.languageId as SupportedCodeLanguage)) {
          validator.validateDocument(document, version);
        }
      }
    }),
  );

  // Validate current document on activation
  if (vscode.window.activeTextEditor) {
    const document = vscode.window.activeTextEditor.document;
    if (supportedCodeLanguages.includes(document.languageId as SupportedCodeLanguage)) {
      validator.validateDocument(document, version);
    }
  }

  // Listen for configuration changes
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration(`${configName.prefix}.${configName.apiVersion}`)) {
        const newVersion = getApiVersion();

        // Re-validate all open documents
        for (const document of vscode.workspace.textDocuments) {
          if (supportedCodeLanguages.includes(document.languageId as SupportedCodeLanguage)) {
            validator.validateDocument(document, newVersion);
          }
        }
      }

      if (event.affectsConfiguration(`${configName.prefix}.${configName.language}`)) {
        const newLanguage = getLanguage();
        updateLanguage(newLanguage);

        // Re-validate all open documents to update error messages
        for (const document of vscode.workspace.textDocuments) {
          if (supportedCodeLanguages.includes(document.languageId as SupportedCodeLanguage)) {
            validator.validateDocument(document, version);
          }
        }
      }
    }),
  );

  context.subscriptions.push(
    completionProvider,
    hoverProvider,
    codeActionProvider,
    diagnosticCollection,
  );
}

export function deactivate() {}
