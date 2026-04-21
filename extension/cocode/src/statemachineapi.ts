import { Session, QuestionPostResult } from "./types"
import { State, StateMachineHandler, isInSession, isTakingSuggestions } from "./statemachine"

export interface StateMachineAPICallbacks {
  fetch: (uri: string, method: string, body: string | null, id: string) => void
  subscribeToSSE: (uri: string, event: string) => void
  editorReplaceContent: (fromLine: number, toLine: number, content: string) => void 
  onStateChange: (state: string) => void
  onError: (message: string) => void
}

export interface StateMachineAPI {
  editorCreateSession: () => void
  editorRejoinSession: () => void
  editorPoseQuestion: (content: string, fromLine: number, toLine: number, language: string) => void
  editorModifyRange: (fromLine: number, toLine: number) => void
  editorSelectSuggestion: (suggId: string | null) => void
  editorReplacedContent: () => void
  editorAcceptSelectedSuggestion: () => void
  editorRejectSuggestions: () => void
  editorDeleteSuggestion: (suggId: string) => void
  editorEndSession: () => void

  handleHttpResponse: (id: string, body: string) => void
  handleSSE: (event: string) => void

  currentState: () => string
}

export function constructStateMachineAPI(
  oldSessionId: string | null, 
  oldSessionCode: number | null, 
  callbacks: StateMachineAPICallbacks
): StateMachineAPI {
  type WhatWasFetch = "Create Session" | "Pose Question" | "Delete Suggestion" | "Accept Selected Suggestion" | "Reject Suggestion" | "Poll Suggestions"
  const oldExists = oldSessionId !== null && oldSessionCode !== null;

  const machineHandler = new StateMachineHandler(
    {
      enum: 'no session', 
      rejoinableSession: oldExists ? { id: oldSessionId, code: oldSessionCode } : null,
    }, 
    {
      onApiCreateSession: () => {
        callbacks.fetch("api/sessions", "POST", null, "Create Session")
      },
      onApiPoseQuestion(sessionId, question) {
        callbacks.fetch(`api/sessions/${sessionId}/questions`, "POST", JSON.stringify({
          ...question,
          fromLine: question.range.fromLine,
          toLine: question.range.toLine
        }), "Pose Question")

      },
      onApiDeleteSuggestion(sessionId, questionId, suggId) {
        callbacks.fetch(`api/sessions/${sessionId}/questions/${questionId}/answers/${suggId}`, "DELETE", null, "Delete Suggestion")
      },
      onApiAcceptSelectedSuggestion(sessionId, questionId, suggId) {
        callbacks.fetch(
          `api/sessions/${sessionId}/questions/${questionId}/accept-answer`, 
          "POST",
          JSON.stringify({ acceptedAnswerId: suggId }),
          "Accept Suggestion"
        );
      },
      onApiRejectSuggestions(sessionId, questionId) {
        callbacks.fetch(
          `api/sessions/${sessionId}/questions/${questionId}/reject-answers`,
          "POST",
          JSON.stringify({ rejectAnswers: true }),
          "Reject Suggestion"
        )
      },
      onEditorReplaceContent(range, newContent) {
        callbacks.editorReplaceContent(range.fromLine, range.toLine, newContent)
      },
    }
  )

  machineHandler.attach({
    onStateUpdate: (state: State) => {
      callbacks.onStateChange(JSON.stringify(state))
    }
  })

  return {
    editorCreateSession() { machineHandler.doTransition({ enum: "EDITOR: create session" }); },
    editorRejoinSession() { machineHandler.doTransition({ enum: "EDITOR: rejoin session" }); },
    editorPoseQuestion(content, fromLine, toLine, language) { machineHandler.doTransition({ enum: "EDITOR: pose question", question: { content, range: { fromLine, toLine }, language } }); },
    editorModifyRange(fromLine: number, toLine: number) { machineHandler.doTransition({ enum: "EDITOR: modify range", newRange: { fromLine, toLine } }); },
    editorSelectSuggestion(suggId: string | null) { machineHandler.doTransition({ enum: "EDITOR: select suggestion", suggId }); },
    editorReplacedContent() { machineHandler.doTransition({ enum: "EDITOR: replaced content" }); },
    editorAcceptSelectedSuggestion() { machineHandler.doTransition({ enum: "EDITOR: accept selected suggestion" }); },
    editorRejectSuggestions() { machineHandler.doTransition({ enum: "EDITOR: reject suggestions" }); },
    editorDeleteSuggestion(suggId: string) { machineHandler.doTransition({ enum: "EDITOR: delete suggestion", suggId }); },
    editorEndSession() { machineHandler.doTransition({ enum: "EDITOR: end session" }); },

    handleHttpResponse: (id: string, body: string) => {
      switch (id as WhatWasFetch) {
        case "Create Session":
          const session = JSON.parse(body) as Session
          machineHandler.handleServerSessionCreated(session)
          break;
          
        case "Pose Question":
          const { id: questionId } = JSON.parse(body) as QuestionPostResult
          machineHandler.handleServerQuestionLoaded(questionId)

          const state = machineHandler.currentState();
          if (!isInSession(state)) {
            callbacks.onError(`Got HTTP response for posted question, but is not in session anymore... State: ${state}`)
            return
          }

          const { session: { id: sessionId } } = state
          callbacks.subscribeToSSE(`api/events/sessions/${sessionId}/questions/${questionId}/answers`, `answer-to-question:${questionId}`)
          break;

        case "Accept Selected Suggestion":
        case "Reject Suggestion":
        case "Delete Suggestion":
          // don't care
          break;
      }
    },
    handleSSE: (_: string) => {
      const state = machineHandler.currentState();
      if (!isTakingSuggestions(state)) { return; }
      const { session, question } = state;

      callbacks.fetch(
        `api/sessions/${session.id}/questions/${question.id}/answers`,
        "GET",
        null,
        "Poll Suggestions"
      )
    },
    currentState: () => JSON.stringify(machineHandler.currentState())
  }
}
