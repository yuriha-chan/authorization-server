/** @format */

import React from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { vscodeDark } from '@uiw/codemirror-theme-vscode';
import { useColorModeValue } from '../hooks/useColorMode';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  height?: string;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  value,
  onChange,
  placeholder,
  height = '400px',
}) => {
  const isDark = useColorModeValue(false, true);

  const customTheme = isDark
    ? vscodeDark
    : 'light';

  const extensions = [javascript({ jsx: false })];

  return (
    <CodeMirror
      value={value}
      height={height}
      theme={customTheme}
      extensions={extensions}
      onChange={onChange}
      placeholder={placeholder}
      basicSetup={{
        lineNumbers: true,
        highlightActiveLineGutter: true,
        highlightActiveLine: true,
        foldGutter: true,
        dropCursor: true,
        allowMultipleSelections: true,
        indentOnInput: true,
        bracketMatching: true,
        closeBrackets: true,
        autocompletion: true,
        searchKeymap: true,
        lintKeymap: true,
      }}
      style={{
        fontSize: '13px',
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      }}
    />
  );
};
