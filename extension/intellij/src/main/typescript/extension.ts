import {isTakingSuggestions, StateMachineHandler} from "./statemachine";
import {Session, Question, QuestionPostResult, Range, Answer} from "./types";
import {UpdateView} from "./view";

declare const COCODE_BASE_URL: string;
declare const PREVIOUS_SESSION_ID : string;
declare const PREVIOUS_SESSION_CODE : number | null;
const oldSessionExists = PREVIOUS_SESSION_ID !== "null" && PREVIOUS_SESSION_CODE !== null;

const stateMachineHandler = new StateMachineHandler(
    { enum: 'no session', rejoinableSession: (oldSessionExists ? { id: PREVIOUS_SESSION_ID, code: PREVIOUS_SESSION_CODE } : null) },
    {
        onApiCreateSession: onApiCreateSession,
        onApiPoseQuestion: onApiPoseQuestion,
        onApiDeleteSuggestion: onApiDeleteSuggestion,
        onEditorReplaceContent: onEditorReplaceContent
    }
)

async function onApiCreateSession() {
    // call end point to get code, and sessionid
    const result = await fetch(`${COCODE_BASE_URL}/api/sessions`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
    });

    const session = (await result.json()) as Session;
    // TODO: might need to call up to intellij plugin again and set variables
    stateMachineHandler.handleServerSessionCreated(session)
}

async function onApiPoseQuestion(sessionId:string, question: Omit<Question, "id">) {
    const res = await fetch(`${COCODE_BASE_URL}/api/sessions/${sessionId}/questions`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            ...question,
            fromLine: question.range.fromLine,
            toLine: question.range.toLine,
        }),
    });

    const { id: questionId } = (await res.json()) as QuestionPostResult;
    subscribeToAnswers(sessionId, questionId);
    stateMachineHandler.handleServerQuestionLoaded(questionId)
}

async function onApiDeleteSuggestion (sessionId: string, questionId: string, suggId: string) {
    fetch(`${COCODE_BASE_URL}/api/sessions/${sessionId}/questions/${questionId}/answers/${suggId}`, {
        method: "DELETE"
    });
}

async function onEditorReplaceContent (range: Range, content: string) {
    //await documentHandler?.replaceContent(range, content)
    // TODO: call up to intellij and replace content
    stateMachineHandler.editorReplacedContent()
}

const apiPollAnswers = async () => {
    const state = stateMachineHandler.currentState()
    if (!isTakingSuggestions(state))
        return;

    const { session, question } = state

    const res = await fetch(`${COCODE_BASE_URL}/api/sessions/${session.id}/questions/${question.id}/answers`)
    const answers: Answer[] = (await res.json()) as Answer[]
    stateMachineHandler.handleServerSuggestionsUpdated(answers)
};

function subscribeToAnswers(sid: string, qid: string) {
    const url = `${COCODE_BASE_URL}/api/events/sessions/${sid}/questions/${qid}/answers`;
    const sse = new EventSource(url);
    // Listen for the custom 'answer-to-question' event we defined in our Next.js stream
    const eventId = `answer-to-question:${qid}`;
    sse.addEventListener(eventId, async _ => {
        apiPollAnswers().catch((err) => {
            console.error(err);
        });
    });
}

stateMachineHandler.attach({
    onStateUpdate: state => {
       UpdateView({
           suggestionsVisible: false, // TODO: store suggestionVisible
           ...state
       });
       // TODO: Call up to intellij documentHandler

    }
});

export function StartSession() {
    stateMachineHandler.editorCreateSession();
}

export function RejoinSession(){
    stateMachineHandler.editorRejoinSession();
}

export function EndSession() {
    stateMachineHandler.editorEndSession();
}

export function ToggleSuggestionsVisible() {
   // does nothing right now
}

export function PostQuestion() {
    // TODO: tell intellij to create section in current file
}

export function AcceptSuggestion() {
    stateMachineHandler.editorAcceptSelectedSuggestion();
}

export function RejectSuggestion() {
    stateMachineHandler.editorRejectSuggestions();
}

export function ChooseSuggestion(id: Answer['id'] | null) {
    stateMachineHandler.editorSelectSuggestion(id);
}

export function DeleteSuggestion(id: Answer['id']) {
    stateMachineHandler.editorDeleteSuggestion(id);
}
