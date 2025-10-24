import { extractResource, GAQL_KEYWORDS, getFieldsForResource } from '@gaql/core';
import * as vscode from 'vscode';
import { getEnabled } from './config.js';

export class GAQLHoverProvider implements vscode.HoverProvider {
  public provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
  ): vscode.Hover | undefined {
    const enabled = getEnabled();
    if (!enabled) {
      return undefined;
    }

    // Check if we're inside a template literal
    if (!this.isInsideTemplateLiteral(document, position)) {
      return undefined;
    }

    // Extract query from template literal
    const query = this.extractQuery(document, position);
    if (!query) {
      return undefined;
    }

    // Get word at cursor position
    const wordRange = document.getWordRangeAtPosition(position, /[a-z_][a-z0-9_.]*/i);
    if (!wordRange) {
      return undefined;
    }

    const word = document.getText(wordRange);

    // Check if it's a GAQL keyword
    if (GAQL_KEYWORDS.some((keyword) => keyword.toLowerCase() === word.toLowerCase())) {
      return new vscode.Hover(
        new vscode.MarkdownString(`**GAQL Keyword**: \`${word.toUpperCase()}\``),
      );
    }

    // Extract resource from query
    const resource = extractResource(query);
    if (!resource) {
      return undefined;
    }

    // Get all fields for the resource
    const fields = getFieldsForResource(resource);

    // Find matching field
    const field = fields.find((f) => f.description === word || f.name === word);
    if (!field) {
      return undefined;
    }

    // Build markdown documentation
    const markdown = new vscode.MarkdownString();
    markdown.appendMarkdown(`**${field.description}**\n\n`);
    markdown.appendMarkdown(`Type: \`${field.type}\`\n\n`);
    if (field.documentation) {
      markdown.appendMarkdown(`${field.documentation}\n\n`);
    }

    return new vscode.Hover(markdown);
  }

  private isInsideTemplateLiteral(
    document: vscode.TextDocument,
    position: vscode.Position,
  ): boolean {
    const fullText = document.getText(new vscode.Range(new vscode.Position(0, 0), position));
    const backtickCount = (fullText.match(/`/g) || []).length;
    return backtickCount % 2 === 1;
  }

  private extractQuery(document: vscode.TextDocument, position: vscode.Position): string | null {
    const fullText = document.getText();
    let backtickCount = 0;
    let startIndex = -1;

    for (let i = 0; i < fullText.length; i++) {
      if (fullText[i] === '`') {
        backtickCount++;
        if (backtickCount % 2 === 1) {
          startIndex = i;
        } else {
          const cursorOffset = document.offsetAt(position);
          if (cursorOffset > startIndex && cursorOffset <= i) {
            return fullText.substring(startIndex + 1, i);
          }
        }
      }
    }

    return null;
  }
}
