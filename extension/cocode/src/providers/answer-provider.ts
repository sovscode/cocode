
import * as vscode from 'vscode';
import * as fs from 'fs';
import { Answer } from '../types';


export class AnswerViewProvider implements vscode.WebviewViewProvider {
  private _view?: vscode.WebviewView;
  private html: string;
  private extensionUri: vscode.Uri;
  private onChooseAnswer: (id: number | null) => void; // id = null means unselecting chosen answer
  private onCloseQuestion: () => void;
  private answers: Answer[] = [];
  private sessionCode: number | null = null;

  constructor(htmlPath: string, extensionUri: vscode.Uri, onChooseAnswer: (id: number | null) => void, onCloseQuestion: () => void) {
	  this.html = fs.readFileSync(htmlPath, 'utf-8');
    this.extensionUri = extensionUri;
    this.onChooseAnswer = onChooseAnswer
    this.onCloseQuestion = onCloseQuestion
  }

  resolveWebviewView(webviewView: vscode.WebviewView) {
    this._view = webviewView;

    const codiconsUri = webviewView.webview
      .asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'node_modules', '@vscode/codicons', 'dist', 'codicon.css'));

    webviewView.webview.options = { enableScripts: true };
    webviewView.webview.html = this._getHtml().replaceAll("{{CODEICONS_URI_MAGICAL_STRING}}", codiconsUri.toString());

    // Handle messages sent from the webview
    webviewView.webview.onDidReceiveMessage((message) => {
      if(message.command === 'postQuestion') {
        vscode.commands.executeCommand('cocode.postQuestion');
      } else if (message.command === 'debug') {
        vscode.window.showInformationMessage(`[WEBVIEW DEBUG]: ${message.msg}`);
      } else if (message.command === 'chooseAnswer') {
        this.onChooseAnswer(message.id)
      } else if (message.command === 'closeQuestion') {
        this.onCloseQuestion()
      }
    });

    webviewView.onDidChangeVisibility(() => {
      this.sendSessionCodeToWebview();
      this.sendAnswersToWebview();
    });

  }

  private sendSessionCodeToWebview(): void {
    if (this._view) {
      this._view.webview.postMessage({ command: 'setSessionCode', text: this.sessionCode });
    }
  }

  private sendAnswersToWebview(): void {
    if (this._view) {
      this._view.webview.postMessage({ command: 'updateAnswers', answers: this.answers });
    }
  }

  // Call this from anywhere in your extension to update the label
  updateSessionCode(code: number) {
    this.sessionCode = code;
    this.sendSessionCodeToWebview();
  }

  updateAnswers(answers: Answer[]) {
    this.answers = answers;
    this.sendAnswersToWebview();
  }

  updateQuestionId(id: number | null) {
    this._view?.webview.postMessage({ command: 'updateQuestion', id })
  }

  private _getHtml(): string {
	  return this.html;
  }
}
