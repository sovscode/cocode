import * as path from "path";
import * as vscode from "vscode";

import { State, isInSession } from "./statemachine"
import { constructStateMachineAPI } from "./statemachineapi"

import { Answer, Session } from "./types";

import { EventSource } from "eventsource";
import { ViewProvider } from "./providers/view-provider";
import { DocumentHandler } from "./document-handler";

// Fetch base url from env var
const baseUrl = vscode.workspace
  .getConfiguration("cocode")
  .get("serverUrl", "https://cocode.felixberg.dev");

function ensureSuggestionsVisibleHasValue(context: vscode.ExtensionContext) {
  const suggestionsVisible = context.workspaceState.get<boolean | null>(
    "cocodeSuggestionsVisible",
    false,
  );
  if (suggestionsVisible === null) {
    context.workspaceState.update("cocodeSuggestionsVisible", true);
  }
}

export async function activate(context: vscode.ExtensionContext) {
  console.log("CoCode started");

  ensureSuggestionsVisibleHasValue(context);

  const previousId = context.workspaceState.get<Session["id"] | null>(
    "cocodeSessionId",
    null,
  );
  const previousCode = context.workspaceState.get<Session["code"] | null>(
    "cocodeSessionCode",
    null,
  );

  const oldSessionExists = previousId !== null && previousCode !== null;
  vscode.commands.executeCommand(
    "setContext",
    "cocode.showRejoin",
    oldSessionExists,
  );

  const setInSessionBool = (b: boolean) =>
    vscode.commands.executeCommand("setContext", "cocode.inSession", b);

  const stateMachineAPI = constructStateMachineAPI(
    previousId, previousCode, {
      fetch: async (uri, method, body, id) => {
        try {
          const response = await fetch(`${baseUrl}/${uri}`, {
            method: method,
            body: body,
            headers: body !== null ? { "Content-Type": "application/json", } : undefined
          })
          if (!response.ok) {
            console.log(`FETCH didn't respond with OK:`, await response.text())
            return;
          }
          const json = await response.json()
          stateMachineAPI.handleHttpResponse(id, JSON.stringify(json))
        } catch (e) {
          console.log(`FETCH error:`, e)
        }
      },
      onStateChange: (stateStr: string) => {
        const state = JSON.parse(stateStr) as State
        setInSessionBool(isInSession(state))
        sidepanelViewProvider.updateView(state)
        documentHandler?.updateEditor(state)
      },
      subscribeToSSE: (uri, event) => {
        console.log("doing thing")
        const sse = new EventSource(`${baseUrl}/${uri}`);
        sse.addEventListener(event, async (_) => {
          stateMachineAPI.handleSSE(event)
        });
      },
      editorReplaceContent: async (fromLine, toLine, content) => {
        await documentHandler?.replaceContent({ fromLine, toLine }, content);
        stateMachineAPI.editorReplacedContent();
      },
      onError: msg => console.error(msg),
    }
  )


  const onChooseAnswerInPanel = (id: Answer["id"] | null) => {
    console.log(`chose ${id}`);
    stateMachineAPI.editorSelectSuggestion(id);
  };

  const viewHtmlPath = path.join(context.extensionPath, "media", "view.html");

  const viewJsPath = path.join(
    context.extensionPath,
    "out",
    "media",
    "view.js",
  );

  const sidepanelViewProvider = new ViewProvider(
    viewHtmlPath,
    viewJsPath,
    context,
    onChooseAnswerInPanel,
    baseUrl,
    () => {
      const state = JSON.parse(stateMachineAPI.currentState()) as State
      sidepanelViewProvider.updateView(state)
    },
  );

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      "cocodeSidepanelView",
      sidepanelViewProvider,
    ),
  );

  let documentHandler: DocumentHandler | null = null;
  // register command to rejoin previous session
  context.subscriptions.push(
    vscode.commands.registerCommand("cocode.rejoinSession", () => {
      stateMachineAPI.editorRejoinSession();
    }),
  );

  // register command to start a new  session
  context.subscriptions.push(
    vscode.commands.registerCommand("cocode.startSession", () => {
      stateMachineAPI.editorCreateSession();
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("cocode.postQuestion", () => {
      const editor = vscode.window.activeTextEditor;
      const state = JSON.parse(stateMachineAPI.currentState()) as State;

      if (!isInSession(state)) {
        vscode.window.showWarningMessage("No active session.");
        return;
      }

      if (!editor) {
        vscode.window.showWarningMessage("No active file.");
        return;
      }

      documentHandler = DocumentHandler.fromEditor(editor, (r) =>
        stateMachineAPI.editorModifyRange(r.fromLine, r.toLine),
      );

      const range = documentHandler.getSelectedRange();
      if (!range) {
        console.assert(false, "This should be impossible");
        return;
      }

      const content = documentHandler.getFullEditorContent()
      stateMachineAPI.editorPoseQuestion(content, range.fromLine, range.toLine, editor.document.languageId);
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("cocode.acceptSuggestion", () => {
      stateMachineAPI.editorAcceptSelectedSuggestion();
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("cocode.rejectSuggestions", () => {
      stateMachineAPI.editorRejectSuggestions();
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "cocode.deleteSuggestion",
      (id: Answer["id"]) => {
        stateMachineAPI.editorDeleteSuggestion(id);
      },
    ),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("cocode.endSession", () => {
      stateMachineAPI.editorEndSession();
    }),
  );
}

export function deactivate() {}

