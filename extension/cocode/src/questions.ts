import { Question } from "./types";
import { MyPanelViewProvider } from "./viewproviders";
import * as vscode from 'vscode';
const { getUpdatedRanges } = require('vscode-position-tracking')

export class QuestionManager {
    private questions: Question[];
    private activeQuestion: Question | null;
    constructor(provider:MyPanelViewProvider) {
        this.questions = [];
        this.activeQuestion = null;

        vscode.workspace.onDidChangeTextDocument((event) => {

            const updatedRanges = getUpdatedRanges(
                // The locations you want to update,
                // under the form of an array of ranges.
                // It is a required argument.
                [],
                // Array of document changes.
                // It is a required argument.
                event.contentChanges,
                // An object with various options.
                // It is not a required argument,
                // nor any of its options.
                { 
                    onDeletion: 'remove',
                    onAddition: 'extend',
                    outputChannel: extensionOutputChannel
                }
            ) 
        // The function returns the updated locations
        // according to document changes,
        // under the form of a new array of ranges.
        })


    }

    async startQuestion(range: vscode.Range, content: string) {
        // send post request to backend to create question.

    }
}