import { getCompletions } from '@gaql/core';
import * as vscode from 'vscode';
import { getActivationMode, getApiVersion, getEnabled } from './config.js';

export class GAQLCompletionProvider implements vscode.CompletionItemProvider {
  public provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
  ): vscode.CompletionItem[] | undefined {
    const enabled = getEnabled();
    if (!enabled) {
      return undefined;
    }

    // Check if we're inside a template literal
    if (!this.isInsideTemplateLiteral(document, position)) {
      return undefined;
    }

    // Check activation mode and comments
    if (!this.shouldActivate(document, position)) {
      return undefined;
    }

    // Extract the query text up to the cursor position
    const { query, cursorOffset } = this.extractQuery(document, position);
    if (!query) {
      return undefined;
    }

    // Use @gaql/core to get completions
    const version = getApiVersion();
    const result = getCompletions(query, cursorOffset, version);

    // Convert to VSCode CompletionItems
    return result.suggestions.map((suggestion) => {
      const item = new vscode.CompletionItem(
        suggestion.label,
        this.mapCompletionType(suggestion.type),
      );
      item.detail = suggestion.description;
      if (suggestion.documentation) {
        item.documentation = new vscode.MarkdownString(suggestion.documentation);
      }
      return item;
    });
  }

  private mapCompletionType(type: string): vscode.CompletionItemKind {
    switch (type) {
      case 'keyword':
        return vscode.CompletionItemKind.Keyword;
      case 'resource':
        return vscode.CompletionItemKind.Class;
      case 'field':
        return vscode.CompletionItemKind.Field;
      case 'operator':
        return vscode.CompletionItemKind.Operator;
      case 'value':
        return vscode.CompletionItemKind.Value;
      default:
        return vscode.CompletionItemKind.Text;
    }
  }

  private isInsideTemplateLiteral(
    document: vscode.TextDocument,
    position: vscode.Position,
  ): boolean {
    const fullText = document.getText(new vscode.Range(new vscode.Position(0, 0), position));

    // Count backticks before cursor
    const backtickCount = (fullText.match(/`/g) || []).length;

    // If odd number of backticks, we're inside a template literal
    return backtickCount % 2 === 1;
  }

  private shouldActivate(document: vscode.TextDocument, position: vscode.Position): boolean {
    const activationMode = getActivationMode();

    const text = document.getText();

    // Check for file-level directives
    const lines = text.split('\n');
    let hasEnable = false;
    let hasDisable = false;

    for (const line of lines.slice(0, 10)) {
      // Check first 10 lines
      if (line.includes('@gaql-enable') || line.includes('@gaql')) {
        hasEnable = true;
      }
      if (line.includes('@gaql-disable')) {
        hasDisable = true;
      }
    }

    // Check for line-level directives
    if (position.line > 0) {
      const previousLine = document.lineAt(position.line - 1).text;
      if (previousLine.includes('@gaql-disable-next-line')) {
        return false;
      }
    }

    // Priority: disable > enable > activationMode
    if (hasDisable) {
      return false;
    }
    if (hasEnable) {
      return true;
    }

    return activationMode === 'always';
  }

  private extractQuery(
    document: vscode.TextDocument,
    position: vscode.Position,
  ): { query: string; cursorOffset: number } | { query: null; cursorOffset: number } {
    const fullText = document.getText();

    // Find template literal boundaries
    let backtickCount = 0;
    let startIndex = -1;
    let endIndex = -1;

    for (let i = 0; i < fullText.length; i++) {
      if (fullText[i] === '`') {
        backtickCount++;
        if (backtickCount % 2 === 1) {
          // Opening backtick
          startIndex = i;
        } else {
          // Closing backtick
          endIndex = i;

          // Check if cursor is within this template literal
          const cursorOffset = document.offsetAt(position);
          if (cursorOffset > startIndex && cursorOffset <= endIndex) {
            const query = fullText.substring(startIndex + 1, endIndex);
            const queryOffset = cursorOffset - startIndex - 1;
            return { query, cursorOffset: queryOffset };
          }
        }
      }
    }

    return { query: null, cursorOffset: 0 };
  }
}
