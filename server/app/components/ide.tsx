"use client";

import "./editor-styles.css";

import MonacoEditor, { OnMount } from "@monaco-editor/react";
import { useEffect, useRef } from "react";

import { IdeProps } from "./answer";
import { Spinner } from "@/components/ui/spinner";
/* @ts-ignore */
import { constrainedEditor } from "constrained-editor-plugin";
import type { editor } from "monaco-editor";

export default function IDE({
  before,
  content,
  after,
  language,
  readonly,
  onContentChange,
}: IdeProps & {
  onContentChange: (answer: string) => void;
}) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof import("monaco-editor") | null>(null);
  const selectionListenerRef = useRef<{ dispose: () => void } | null>(null);
  const constrainedInstanceRef = useRef<any>(null);

  // Calculate the immutable line counts

  const editorContent = [before, content, after].join("\n");
  const initialTotalLines = editorContent.split("\n").length;
  // Region
  const topReadonlyCount = before.split("\n").length;
  const bottomReadonlyCount = after.split("\n").length;
  const fromLine = topReadonlyCount + 1;
  const fromLineIndex = Math.max(0, fromLine - 1);
  const toLine = initialTotalLines - bottomReadonlyCount + 1;

  const extractUserAnswer = () => {
    if (!editorRef.current) {
      return "";
    }

    const currentCode = editorRef.current.getValue();
    const currentLines = currentCode.split(/\r?\n/);

    const userCodeLines = currentLines.slice(
      fromLineIndex,
      currentLines.length - bottomReadonlyCount,
    );

    const userAnswerContent = userCodeLines.join("\n");
    return userAnswerContent;
  };

  const setupEditorForQuestion = () => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    const constrainedInstance = constrainedInstanceRef.current;

    if (!editor || !monaco || !constrainedInstance) return;

    // Destroy the old model
    const oldModel = editor.getModel();
    if (oldModel) {
      oldModel.dispose();
    }

    const newModel = monaco.editor.createModel(
      editorContent,
      language || "javascript",
    );
    editor.setModel(newModel);

    constrainedInstance.initializeIn(editor);
    editor.focus();
    editor.updateOptions({
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
    });

    const initialPosition = { lineNumber: fromLine || 1, column: 1 };
    editor.setPosition(initialPosition);
    editor.revealLineInCenter(fromLine);

    setupHighlightedArea(editor, newModel, constrainedInstance, monaco);

    // Ping the parent with the initial extracted answer
    // onChangeUserAnswer(extractUserAnswer());
  };

  // Run setup whenever the question prop changes
  useEffect(() => {
    setupEditorForQuestion();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readonly]);
  useEffect(() => {
    const currentEditorValue = editorRef.current?.getValue();
    const newEditorValue = [before, content, after].join("\n");
    if (currentEditorValue != newEditorValue) {
      const editor = editorRef.current;
      const model = editor?.getModel();
      const monaco = monacoRef.current;
      if (!(editor && model && monaco)) return;
      editor.setValue(newEditorValue);
      // TODO: Update grey-out here
      setupHighlightedArea(
        editor,
        model,
        constrainedInstanceRef.current,
        monaco,
      );
    }
  }, [before, content, after]);

  // Initial mount
  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    constrainedInstanceRef.current = constrainedEditor(monaco);

    setupEditorForQuestion();
  };

  function setupHighlightedArea(
    editor: editor.IStandaloneCodeEditor,
    newModel: editor.ITextModel,
    constrainedInstance: any,
    monaco: typeof import("monaco-editor"),
  ) {
    if (fromLine <= toLine) {
      editor.updateOptions({ readOnly: false });

      const endColumn = newModel.getLineMaxColumn(toLine - 1);
      const range = [fromLine, 1, toLine - 1, endColumn];

      const restrictions = [
        {
          range,
          allowMultiline: true,
          label: "editableRegion",
        },
      ];

      constrainedInstance.addRestrictionsTo(newModel, restrictions);

      // --- 1. Track the editable decoration separately ---
      // By putting this in its own collection, we can query its dynamic range later
      const editableAreaDecoration = editor.createDecorationsCollection([
        {
          range: new monaco.Range(range[0], range[1], range[2], range[3]),
          options: {
            isWholeLine: true,
            className: "editable-area-highlight",
            marginClassName: "editable-area-margin",
            stickiness:
              monaco.editor.TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges,
          },
        },
      ]);

      // --- 2. Add the Dimmed Decorations ---
      const dimmedDecorations = [];
      const lineCount = newModel.getLineCount();

      if (fromLine > 1) {
        dimmedDecorations.push({
          range: new monaco.Range(
            1,
            1,
            fromLine - 1,
            newModel.getLineMaxColumn(fromLine - 1),
          ),
          options: {
            isWholeLine: true,
            className: "dimmed-area-highlight",
            inlineClassName: "dimmed-code",
            marginClassName: "dimmed-margin",
            stickiness:
              monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
          },
        });
      }

      if (toLine <= lineCount) {
        dimmedDecorations.push({
          range: new monaco.Range(
            toLine,
            1,
            lineCount,
            newModel.getLineMaxColumn(lineCount),
          ),
          options: {
            isWholeLine: true,
            className: "dimmed-area-highlight",
            inlineClassName: "dimmed-code",
            marginClassName: "dimmed-margin",
            stickiness:
              monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
          },
        });
      }

      editor.createDecorationsCollection(dimmedDecorations);

      // --- 3. Update the Selection Listener ---
      if (selectionListenerRef.current) {
        selectionListenerRef.current.dispose();
      }

      selectionListenerRef.current = editor.onDidChangeCursorSelection(() => {
        const selections = editor.getSelections();
        // Fetch the LIVE range of the editable area
        const currentEditableRange = editableAreaDecoration.getRanges()[0];

        if (!selections || !currentEditableRange) return;

        // Compare against the dynamically updating start/end lines
        const isOutside = selections.some(
          (sel) =>
            sel.startLineNumber < currentEditableRange.startLineNumber ||
            sel.endLineNumber > currentEditableRange.endLineNumber,
        );

        editor.updateOptions({ readOnly: isOutside || readonly });
      });
    } else {
      editor.updateOptions({ readOnly: readonly });
    }
  }

  function handleChange() {
    const userAnswer = extractUserAnswer();
    onContentChange(userAnswer);
  }

  return (
    <MonacoEditor
      defaultLanguage="javascript"
      onMount={handleEditorDidMount}
      onChange={handleChange}
      loading={<Spinner className="w-8 h-8 text-slate-400" />}
      options={{
        domReadOnly: readonly,
        readOnly: readonly,
        cursorStyle: readonly ? "line-thin" : "line",
        cursorBlinking: readonly ? "solid" : "blink",
        automaticLayout: true,
        fixedOverflowWidgets: true,
        readOnlyMessage: {
          value: readonly
            ? "The question is currently not open for answers."
            : "Edit the area highlighted with green.",
        },
      }}
    />
  );
}

/**
 * Extracts a specific range of lines from a multi-line string.
 *
 * @param {string} text - The full multi-line string.
 * @param {number} fromLine - The starting line number (1-indexed, inclusive).
 * @param {number} toLine - The ending line number (1-indexed, exclusive).
 * @returns {string} The extracted lines.
 */
export function extractLineRange(
  text: string,
  fromLine: number,
  toLine: number,
) {
  if (!text) return "";

  const lines = text.split(/\r?\n/);

  // Convert 1-based line numbers to 0-based array indices
  const startIndex = Math.max(0, fromLine - 1);
  const endIndex = Math.max(0, toLine - 1);

  // slice(start, end) includes start and excludes end
  const extractedLines = lines.slice(startIndex, endIndex);

  return extractedLines.join("\n");
}
