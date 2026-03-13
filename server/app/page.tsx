"use client";
import { useRef } from 'react';

import Editor, { OnMount } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
export default function App() {
  const editorRef = useRef<editor.IStandaloneCodeEditor>(null);

  const handleEditorDidMount: OnMount = editor => {
    editorRef.current = editor;
    editor.setValue("// Start value")
    // editor.updateOptions({ readOnly: true })
  }

  function showValue() {
    if (editorRef.current && editorRef.current) {
      alert(editorRef.current.getValue());
    }
  }

  return (
    <>
      <button onClick={showValue}>Show value</button>
      <Editor
        height="90vh"
        defaultLanguage="javascript"
        onMount={handleEditorDidMount}
      />
    </>
  );
}
