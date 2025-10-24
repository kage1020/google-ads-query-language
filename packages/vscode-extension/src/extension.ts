import { setApiVersion } from '@gaql/core';
import * as vscode from 'vscode';
import { GAQLCompletionProvider } from './completion.js';
import { getApiVersion, getLanguage } from './config.js';
import { GAQLHoverProvider } from './hover.js';
import { initializeLocalization, updateLanguage } from './localization.js';
import { GAQLCodeActionProvider, GAQLValidator } from './validator.js';

export function activate(context: vscode.ExtensionContext) {
  // Initialize localization
  const language = getLanguage();
  initializeLocalization(language);

  // Initialize API version
  const apiVersion = getApiVersion();
  setApiVersion(apiVersion);

  // Register completion provider
  const completionProvider = vscode.languages.registerCompletionItemProvider(
    ['typescript', 'javascript'],
    new GAQLCompletionProvider(),
    '.', // Triggered by dot
    ' ', // Triggered by space
    '\n', // Triggered by newline
    '@', // Triggered by @ for directives
  );

  // Register hover provider
  const hoverProvider = vscode.languages.registerHoverProvider(
    ['typescript', 'javascript'],
    new GAQLHoverProvider(),
  );

  // Register code action provider (Quick Fix)
  const codeActionProvider = vscode.languages.registerCodeActionsProvider(
    ['typescript', 'javascript'],
    new GAQLCodeActionProvider(),
    {
      providedCodeActionKinds: GAQLCodeActionProvider.providedCodeActionKinds,
    },
  );

  // Create diagnostic collection for validation
  const diagnosticCollection = vscode.languages.createDiagnosticCollection('gaql');
  const validator = new GAQLValidator(diagnosticCollection);

  // Validate on document open
  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument((document) => {
      if (document.languageId === 'typescript' || document.languageId === 'javascript') {
        validator.validateDocument(document);
      }
    }),
  );

  // Validate on document change
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((event) => {
      if (
        event.document.languageId === 'typescript' ||
        event.document.languageId === 'javascript'
      ) {
        validator.validateDocument(event.document);
      }
    }),
  );

  // Validate on editor switch
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor) {
        const document = editor.document;
        if (document.languageId === 'typescript' || document.languageId === 'javascript') {
          validator.validateDocument(document);
        }
      }
    }),
  );

  // Validate current document on activation
  if (vscode.window.activeTextEditor) {
    const document = vscode.window.activeTextEditor.document;
    if (document.languageId === 'typescript' || document.languageId === 'javascript') {
      validator.validateDocument(document);
    }
  }

  // Listen for configuration changes
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration('gaql.apiVersion')) {
        const newVersion = getApiVersion();
        setApiVersion(newVersion);

        // Re-validate all open documents
        for (const document of vscode.workspace.textDocuments) {
          if (document.languageId === 'typescript' || document.languageId === 'javascript') {
            validator.validateDocument(document);
          }
        }
      }

      if (event.affectsConfiguration('gaql.language')) {
        const newLanguage = getLanguage();
        updateLanguage(newLanguage);

        // Re-validate all open documents to update error messages
        for (const document of vscode.workspace.textDocuments) {
          if (document.languageId === 'typescript' || document.languageId === 'javascript') {
            validator.validateDocument(document);
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

export function deactivate() {
  // Cleanup if needed
}
