// This method is called when your extension is deactivated
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { QuestionManager } from './questions';

import {StartSessionViewProvider, MyPanelViewProvider} from './viewproviders';

export function activate(context: vscode.ExtensionContext) {
  console.log("CoCode started");

  const previousId = context.workspaceState.get("cocodeSessionId", null);
  vscode.commands.executeCommand('setContext', 'cocode.showRejoin', previousId !== null); 
  
    
  const startSessionProvider = new StartSessionViewProvider();

  context.subscriptions.push(
    vscode.window.registerTreeDataProvider('cocodeCreateSession', startSessionProvider)
  );


  const htmlPath = path.join(context.extensionPath, 'media', 'view.html');
  const provider = new MyPanelViewProvider(htmlPath);

  const questionManager = new QuestionManager(provider);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('cocodeAnswers', provider)
  )

  let joinSession = async (sessionId: number, sessionCode: number) => {
    
    // store the session id in workspace state
    await vscode.commands.executeCommand('setContext', 'cocode.inSession', true);
    await context.workspaceState.update("cocodeSessionId", sessionId);
    await context.workspaceState.update("cocodeSessionCode", sessionCode);
    
    provider.updateLabel(`Joining session with code: ${sessionCode}`);
    
  };

  // register command to rejoin previous session
  context.subscriptions.push(
    vscode.commands.registerCommand('cocode.rejoinSession', () => {
      const sessionId = context.workspaceState.get("cocodeSessionId", null);
      const sessionCode = context.workspaceState.get("cocodeSessionCode", null);

      if (sessionId && sessionCode) {
        joinSession(sessionId, sessionCode);
      } else {
        vscode.window.showErrorMessage("No previous session found.");
      }
    })
  );
  
  // register command to start a new  session
  context.subscriptions.push(
    vscode.commands.registerCommand('cocode.startSession', () => {
      // call end point to get code, and sessionid
      const sessionId = 12345678;
      const sessionCode = 4321;

      joinSession(sessionId, sessionCode);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('cocode.postQuestion', async () => {
      const editor = vscode.window.activeTextEditor;

      if (!editor) {
        vscode.window.showWarningMessage('No active file.');
        return;
      }

      vscode.workspace.onDidChangeTextDocument((event) => {
        
      })

      const uri = editor.document.uri;
      const fileName = uri.fsPath.split('/').pop();

      // Lock the file as readonly in this session
      await vscode.commands.executeCommand(
        'workbench.action.files.setActiveEditorReadonlyInSession'
      );
      vscode.window.showInformationMessage(`${fileName} is now read-only.`);
    })
  );

}

export function deactivate() {}