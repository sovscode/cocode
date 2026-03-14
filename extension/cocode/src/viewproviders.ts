
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export class StartSessionViewProvider implements vscode.TreeDataProvider<string> {
  getTreeItem(element: string): vscode.TreeItem {
    return new vscode.TreeItem(element);
  }

  getChildren(): Thenable<string[]> {
    return Promise.resolve([]);
  }
}

export class MyPanelViewProvider implements vscode.WebviewViewProvider {
  private _view?: vscode.WebviewView;
  private html: string;
  constructor(htmlPath: string) {
	  this.html = fs.readFileSync(htmlPath, 'utf-8');
  }

  resolveWebviewView(webviewView: vscode.WebviewView) {
    this._view = webviewView;

    webviewView.webview.options = { enableScripts: true };
    webviewView.webview.html = this._getHtml();

    // Handle messages sent from the webview
    webviewView.webview.onDidReceiveMessage((message) => {
      if (message.command === 'submit') {
        vscode.window.showInformationMessage(`Input: ${message.value}`);
      }
    });
  }

  // Call this from anywhere in your extension to update the label
  updateLabel(text: string) {
    this._view?.webview.postMessage({ command: 'updateLabel', text });
  }

  private _getHtml(): string {
	  return this.html;
  }
}