import * as vscode from 'vscode';
import * as fs from 'fs';
import { Answer, Question } from '../types';
import { State } from '../statemachine';

export class ViewProvider implements vscode.WebviewViewProvider {
  private _view?: vscode.WebviewView;
  private html: string;
  private extensionUri: vscode.Uri;
  private cocodeBaseUrl: string;
  private jsFileContents: string

  private onChooseAnswer: (id: number | null) => void; // id = null means unselecting chosen answer
  private rejoinableSessionCode: number | null = null;

  constructor(
    htmlPath: string, 
    jsPath: string,
    rejoinableSessionCode: number | null,
    extensionUri: vscode.Uri, 
    onChooseAnswer: (id: number | null) => void,
    cocodeBaseUrl: string,
  ) {
    this.html = fs.readFileSync(htmlPath, 'utf-8');
    this.jsFileContents = fs.readFileSync(jsPath, 'utf-8')
      .split('\n')
      .filter(l => !l.includes('Object.defineProperty(exports') && !l.includes('use strict')) // remove stuff that tsc generates
      .join('\n');
    this.extensionUri = extensionUri;
    this.onChooseAnswer = onChooseAnswer;
    this.rejoinableSessionCode = rejoinableSessionCode;
    this.cocodeBaseUrl = cocodeBaseUrl;
  }

  resolveWebviewView(webviewView: vscode.WebviewView) {
    this._view = webviewView;

    const codiconsUri = webviewView.webview
      .asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'node_modules', '@vscode/codicons', 'dist', 'codicon.css'));

    let codeCompletionStylesheet = null;
    if (vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.Dark) {
      codeCompletionStylesheet = "atom-one-dark";
    } else if (vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.Light) {
      codeCompletionStylesheet = "atom-one-light";
    } else {
      codeCompletionStylesheet = "atom-one-dark";
    }

    webviewView.webview.options = { enableScripts: true };
    webviewView.webview.html = this._getHtml()      
      .replaceAll("{{CODEICONS_URI_MAGICAL_STRING}}", codiconsUri.toString())
      .replaceAll("{{CODE_COMPLETION_STYLESHEET_MAGICAL_STRING}}", codeCompletionStylesheet)
      .replaceAll("{{COCODE_BASE_URL}}", this.cocodeBaseUrl)
      .replaceAll("{{COCODE_BASE_SHORT_URL}}", this.cocodeBaseUrl.replaceAll("https://", "").replaceAll("http://", ""))
      .replaceAll("{{COCODE_VIEWJS_FILE_CONTENTS}}", this.jsFileContents);

    // Handle messages sent from the webview
    webviewView.webview.onDidReceiveMessage(({ command, ...data }) => {
      if (command === 'StartSession') {
        vscode.commands.executeCommand('cocode.startSession');
      } else if (command === 'RejoinSession') {
        vscode.commands.executeCommand('cocode.rejoinSession');
      } else if(command === 'postQuestion') {
        vscode.commands.executeCommand('cocode.postQuestion');
      } else if (command === 'debug') {
        vscode.window.showInformationMessage(`[WEBVIEW DEBUG]: ${data.msg}`);
      } else if (command === 'updateSuggestionsVisible') {
        vscode.commands.executeCommand('updateSuggestionsVisible', data.visible)
      } else if (command === 'chooseAnswer') {
        this.onChooseAnswer(data.id)
      } else if (command === 'acceptSuggestion') {
        vscode.commands.executeCommand('cocode.acceptSuggestion');
      } else if (command === 'rejectSuggestions') {
        vscode.commands.executeCommand('cocode.rejectSuggestions');
      } else if (command === 'deleteSuggestion') {
        vscode.commands.executeCommand('cocode.deleteSuggestion', data.id)
      }
    });

    webviewView.onDidChangeVisibility(() => { throw new Error("TODO") }); // TODO
  }

  updateView(state: State) {
    this.sendRejoinableSessionCodeToWebview()
    switch (state.enum) {
      case 'no session':
        this.sendShowStartSessionPage()
        this.sendSessionCodeToWebview(null);
        this.sendQuestionDetailsToWebview(null, null);
        this.sendAnswerDetailsToWebView([], null);
        this.sendStartSessionButtonEnabled(false);
        this.sendPostQuestionButtonEnabled(false);
        break;

      case 'creating session':
        this.sendShowStartSessionPage()
        this.sendSessionCodeToWebview(null);
        this.sendQuestionDetailsToWebview(null, null);
        this.sendAnswerDetailsToWebView([], null);
        this.sendStartSessionButtonEnabled(false);
        this.sendPostQuestionButtonEnabled(false);
        break;

      case 'in session, idle':
        this.sendShowAnswerPage();
        this.sendSessionCodeToWebview(state.session.code);
        this.sendQuestionDetailsToWebview(null, null);
        this.sendAnswerDetailsToWebView([], null);
        this.sendStartSessionButtonEnabled(false);
        this.sendPostQuestionButtonEnabled(true);
        break;

      case 'in session, loading question':
        this.sendShowAnswerPage();
        this.sendSessionCodeToWebview(state.session.code);
        this.sendQuestionDetailsToWebview(null, null);
        this.sendAnswerDetailsToWebView([], null);
        this.sendStartSessionButtonEnabled(false);
        this.sendPostQuestionButtonEnabled(false);
        break;

      case 'in session, taking suggestions':
        this.sendShowAnswerPage();
        this.sendSessionCodeToWebview(state.session.code)
        this.sendQuestionDetailsToWebview(state.question.id, state.question.language)
        this.sendAnswerDetailsToWebView(state.suggestions, state.selectedSuggestionId)
        this.sendStartSessionButtonEnabled(false);
        this.sendPostQuestionButtonEnabled(false);
        break;
    }
  }

  private sendRejoinableSessionCodeToWebview(): void {
    this._view?.webview?.postMessage({ command: 'setRejoinableSessionCode', code: this.rejoinableSessionCode })
  }

  private sendSessionCodeToWebview(sessionCode: number | null): void {
    if (this._view) {
      this._view.webview.postMessage({ command: 'setSessionCode', code: sessionCode });
    }
  }

  private sendAnswerDetailsToWebView(answers: Answer[], chosenAnswerId: Answer["id"] | null): void {
    if (this._view) {
      this._view.webview.postMessage({ command: 'updateAnswers', answers, chosenAnswerId });
    }
  }

  private sendQuestionDetailsToWebview(id: Question["id"] | null, language: Question["language"] | null): void {
    if (this._view) {
      this._view.webview.postMessage({ command: 'updateQuestion', id, language, });
    }
  }

  private sendStartSessionButtonEnabled(enabled: boolean): void {
    if (this._view) {
      this._view.webview.postMessage({ command: 'setStartSessionButtonEnabled', enabled });
    }
  }

  private sendPostQuestionButtonEnabled(enabled: boolean): void {
    if (this._view) {
      this._view.webview.postMessage({ command: 'setPostQuestionButtonEnabled', enabled });
    }
  }

  private sendSuggestionsVisibleToWebview(visible: boolean): void {
    if (this._view) {
      this._view.webview.postMessage({ command: 'updateSuggestionsVisible', visible });
    }
  }

  private sendShowAnswerPage() {
    if (this._view) {
      this._view.webview.postMessage({ command: 'showAnswerPage' });
    }
  }

  private sendShowStartSessionPage() {
    if (this._view) {
      this._view.webview.postMessage({ command: 'showStartSessionPage' });
    }
  }


  private _getHtml(): string {
	  return this.html;
  }
}
