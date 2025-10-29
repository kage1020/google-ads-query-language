import {
  type SupportedApiVersion,
  type ValidationError,
  ValidationErrorType,
  validateQuery,
} from '@gaql/core';
import * as vscode from 'vscode';
import { getActivationMode, getEnabled } from './config.js';
import { getMessage, MessageKey } from './localization.js';

/**
 * GAQL query validator
 */
export class GAQLValidator {
  private diagnosticCollection: vscode.DiagnosticCollection;

  constructor(diagnosticCollection: vscode.DiagnosticCollection) {
    this.diagnosticCollection = diagnosticCollection;
  }

  /**
   * Validate GAQL queries in the document
   */
  public async validateDocument<T extends SupportedApiVersion>(
    document: vscode.TextDocument,
    version: T,
  ): Promise<void> {
    const enabled = getEnabled();
    if (!enabled) {
      this.diagnosticCollection.set(document.uri, []);
      return;
    }

    const diagnostics: vscode.Diagnostic[] = [];
    const text = document.getText();

    // Check activation mode
    const shouldValidate = this.shouldValidate(text);
    if (!shouldValidate) {
      this.diagnosticCollection.set(document.uri, []);
      return;
    }

    // Detect and validate queries in template literals
    const queries = this.extractQueries(text);
    for (const query of queries) {
      // Skip if validation is disabled with @gaql-disable-next-line
      if (query.disabled) {
        continue;
      }

      // Validate query using @gaql/core
      const result = validateQuery(query.text, version);

      // Convert validation errors to VS Code diagnostics
      for (const error of result.errors) {
        const diagnostic = this.createDiagnostic(error, query.startLine);
        diagnostics.push(diagnostic);
      }
    }

    this.diagnosticCollection.set(document.uri, diagnostics);
  }

  private shouldValidate(text: string): boolean {
    const activationMode = getActivationMode();

    const lines = text.split('\n');
    let hasEnable = false;
    let hasDisable = false;

    for (const line of lines.slice(0, 10)) {
      if (line.includes('@gaql-enable') || line.includes('@gaql')) {
        hasEnable = true;
      }
      if (line.includes('@gaql-disable')) {
        hasDisable = true;
      }
    }

    if (hasDisable) {
      return false;
    }
    if (hasEnable) {
      return true;
    }

    return activationMode === 'always';
  }

  private extractQueries(
    text: string,
  ): Array<{ text: string; startLine: number; disabled: boolean }> {
    const queries: Array<{
      text: string;
      startLine: number;
      disabled: boolean;
    }> = [];
    const lines = text.split('\n');

    let backtickCount = 0;
    let queryStart = -1;
    let queryLines: string[] = [];
    let disabled = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Check for @gaql-disable-next-line
      if (i > 0 && lines[i - 1].includes('@gaql-disable-next-line')) {
        disabled = true;
      }

      for (const char of line) {
        if (char === '`') {
          backtickCount++;
          if (backtickCount % 2 === 1) {
            // Opening backtick
            queryStart = i;
            queryLines = [];
          } else {
            // Closing backtick
            const queryText = queryLines.join('\n');
            if (queryText.match(/\bSELECT\b/i) && queryText.match(/\bFROM\b/i)) {
              queries.push({
                text: queryText,
                startLine: queryStart,
                disabled,
              });
            }
            disabled = false;
          }
        }
      }

      if (backtickCount % 2 === 1) {
        // Inside template literal
        // Remove backtick from first line
        const cleanLine = i === queryStart ? line.substring(line.indexOf('`') + 1) : line;
        queryLines.push(cleanLine);
      }
    }

    return queries;
  }

  private createDiagnostic(error: ValidationError, queryStartLine: number): vscode.Diagnostic {
    const line = queryStartLine + error.line;
    const range = new vscode.Range(line, error.column, line, error.column + error.length);

    const diagnostic = new vscode.Diagnostic(
      range,
      this.getLocalizedMessage(error),
      vscode.DiagnosticSeverity.Error,
    );
    diagnostic.source = 'GAQL';
    diagnostic.code = error.type;

    return diagnostic;
  }

  private getLocalizedMessage(error: ValidationError): string {
    switch (error.type) {
      case ValidationErrorType.MISSING_SELECT:
        return getMessage(MessageKey.MISSING_SELECT);
      case ValidationErrorType.MISSING_FROM:
        return getMessage(MessageKey.MISSING_FROM);
      case ValidationErrorType.INVALID_RESOURCE:
        return getMessage(MessageKey.INVALID_RESOURCE, error.field || '');
      case ValidationErrorType.INVALID_FIELD:
        return getMessage(MessageKey.INVALID_FIELD, error.resource || '', error.field || '');
      case ValidationErrorType.INVALID_SYNTAX:
        return getMessage(MessageKey.INVALID_SYNTAX);
      case ValidationErrorType.INVALID_OPERATOR:
        return getMessage(MessageKey.INVALID_OPERATOR);
      default:
        return error.message;
    }
  }
}

/**
 * Code action provider for GAQL validation errors
 * Provides Quick Fix to add @gaql-disable-next-line comment before error line
 */
export class GAQLCodeActionProvider implements vscode.CodeActionProvider {
  public static readonly providedCodeActionKinds = [vscode.CodeActionKind.QuickFix];

  public provideCodeActions(
    document: vscode.TextDocument,
    _range: vscode.Range,
    context: vscode.CodeActionContext,
  ): vscode.CodeAction[] {
    // Only target GAQL diagnostics
    const gaqlDiagnostics = context.diagnostics.filter((d) => d.source === 'GAQL');
    if (gaqlDiagnostics.length === 0) {
      return [];
    }

    const actions: vscode.CodeAction[] = [];

    for (const diagnostic of gaqlDiagnostics) {
      // Create action to add @gaql-disable-next-line before error line
      const disableNextLineAction = this.createDisableNextLineAction(document, diagnostic);
      actions.push(disableNextLineAction);
    }

    // Add action to disable validation for entire file
    const disableFileAction = this.createDisableFileAction(document, gaqlDiagnostics);
    actions.push(disableFileAction);

    return actions;
  }

  private createDisableNextLineAction(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic,
  ): vscode.CodeAction {
    const action = new vscode.CodeAction(
      getMessage(MessageKey.CODE_ACTION_DISABLE_LINE),
      vscode.CodeActionKind.QuickFix,
    );
    action.diagnostics = [diagnostic];
    action.isPreferred = true;

    const line = diagnostic.range.start.line;
    const lineText = document.lineAt(line).text;
    const indent = lineText.match(/^\s*/)?.[0] || '';

    const edit = new vscode.WorkspaceEdit();
    edit.insert(
      document.uri,
      new vscode.Position(line, 0),
      `${indent}// @gaql-disable-next-line\n`,
    );
    action.edit = edit;

    return action;
  }

  private createDisableFileAction(
    document: vscode.TextDocument,
    diagnostics: readonly vscode.Diagnostic[],
  ): vscode.CodeAction {
    const action = new vscode.CodeAction(
      getMessage(MessageKey.CODE_ACTION_DISABLE_FILE),
      vscode.CodeActionKind.QuickFix,
    );
    action.diagnostics = [...diagnostics];

    const edit = new vscode.WorkspaceEdit();
    edit.insert(document.uri, new vscode.Position(0, 0), '// @gaql-disable\n');
    action.edit = edit;

    return action;
  }
}
