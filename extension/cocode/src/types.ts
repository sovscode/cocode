<<<<<<< HEAD
export type Session = { id: number ; code: number }
export type QuestionPostResult = { id: number }
export type Range = { fromLine: number; toLine: number }
export type Question = { id: number ; content: string; range: Range; language: string }
export type Answer = { id: number ; text: string }
=======
import * as vscode from "vscode";

export type Session = { id: string; code: number };
export type QuestionPostResult = { id: string };
export type Question = {
  id: string;
  content: string;
  fromLine: number;
  toLine: number;
  language: string;
};
export type Answer = { id: string; text: string };
>>>>>>> origin/main
