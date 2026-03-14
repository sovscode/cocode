import { Answer, Question, QuestionPostResult } from "./types";
import * as vscode from 'vscode';
const { getUpdatedRanges } = require('vscode-position-tracking')

type State = {
    questionId: number;
    originalQuestionContent: string;

    editor: vscode.TextEditor;
    range: DynamicRange | null;
}

class DynamicRange {
    private range_: vscode.Range;
    private onRangeRemoved: () => void;

    constructor(range: vscode.Range, onRangeRemoved: () => void) {
        this.range_ = range
        this.onRangeRemoved = onRangeRemoved;
    }

    internalRange() { return this.range_; }

    update(event: vscode.TextDocumentChangeEvent) {            
        const updatedRanges = getUpdatedRanges(
            // The locations you want to update,
            // under the form of an array of ranges.
            // It is a required argument.
            [this.range_],
            // Array of document changes.
            // It is a required argument.
            event.contentChanges,
            // An object with various options.
            // It is not a required argument,
            // nor any of its options.
            { 
                onDeletion: 'shrink',
                onAddition: 'extend'
            }
        )

        if (updatedRanges.length == 0) {
            this.onRangeRemoved();
        }

        this.range_ = updatedRanges[0]
    }
}

export class QuestionManager {

    private state: State | null;

    private decorationHandler: DecorationHandler;
    private apiPostQuestion: (question: Omit<Question, "id">) => Promise<QuestionPostResult>

    constructor(apiPostQuestion: (question: Omit<Question, "id">) => Promise<QuestionPostResult>) {
        this.state = null;
        this.decorationHandler = new DecorationHandler();

        this.apiPostQuestion = apiPostQuestion

        vscode.workspace.onDidChangeTextDocument(event => {
            if (this.state === null) return;
            this.state.range?.update(event)
        })
    }

    onRangeRemoved() {
        this.endQuestion()
        vscode.window.showWarningMessage("Range removed. Pose a new question")
    }

    getCurrentRangeContent(): string | null {
        return null
    }

    async startQuestion(editor: vscode.TextEditor) {
        // send post request to backend to create question.
        const fullFileContent = editor.document.getText();
        const range = editor.selection;

        const question = {
            content: fullFileContent,
            fromLine: range.start.line + 1, // 1-indexing
            toLine: range.end.line + 2 // exclusive end line
        }

        console.log(question)

        const { id: questionId } = await this.apiPostQuestion(question)

        const fullLineRange = new vscode.Range(
            editor.document.lineAt(range.start.line).range.start,
            editor.document.lineAt(range.end.line).range.end
        )

        this.state = {
            questionId,
            editor,
            range: new DynamicRange(fullLineRange, this.onRangeRemoved),
            originalQuestionContent: editor.document.getText(fullLineRange)
        }


        this.decorationHandler.updateRange(editor, range);
    }

    // answer = null -> unselect answer and go back to original buffer
    chooseAnswer(answer: Answer | null) {
        if (!this.state || !this.state.range) {
            vscode.window.showErrorMessage("No question has been asked")
            return;
        }

        const replacement = answer ? answer.text : this.state.originalQuestionContent;
        const range = this.state.range?.internalRange()
        const editor = this.state.editor;

        editor.edit(editBuilder => {
            if (!this.state) {
                vscode.window.showErrorMessage("No question has been asked")
                return;
            }
            this.decorationHandler.clear(editor)
            this.state.range = null;

            editBuilder.replace(range, replacement);
        }).then(success => {
            if (success && this.state) {       
                const lines = replacement.split(/\r?\n/);
                const lineCount = lines.length;
                const lastLineLength = lines[lineCount - 1].length;

                // The new start is the same as the old start (beginning of the line)
                const newStart = range.start;

                // The new end line is (startLine + number of new lines added)
                // The character is the length of that final string segment
                const newEnd = new vscode.Position(
                    newStart.line + lineCount - 1,
                    lastLineLength
                );         

                this.state.range = new DynamicRange(new vscode.Range(newStart, newEnd), this.onRangeRemoved); 
                this.decorationHandler.updateRange(editor, this.state.range.internalRange())   
                vscode.window.showInformationMessage("Code updated with the chosen answer!");
            } else {
                vscode.window.showErrorMessage("Failed to apply the code change.");
            }
        });
    }

    endQuestion() {
        if (this.state?.editor) {
            this.decorationHandler.clear(this.state.editor)
        }
        this.state = null;
    }

    getActiveQuestionId(): number | null {
        return this.state?.questionId ?? null
    }
}

class DecorationHandler {
    private decoration: vscode.TextEditorDecorationType;
    constructor() {
        this.decoration = vscode.window.createTextEditorDecorationType({
            isWholeLine: true,
            backgroundColor: 'rgba(164, 37, 15, 0.3)'
        });
    }

    clear(editor: vscode.TextEditor) {
        editor.setDecorations(this.decoration, []);
    }

    updateRange(editor: vscode.TextEditor, range: vscode.Range) {
        editor.setDecorations(this.decoration, [range]);
    }
}
