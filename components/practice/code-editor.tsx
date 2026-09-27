'use client'

import CodeMirror from '@uiw/react-codemirror'
import { python } from '@codemirror/lang-python'
import { EditorView } from '@codemirror/view'

export function CodeEditor({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <CodeMirror value={value} onChange={onChange} extensions={[python(), EditorView.lineWrapping]} theme="light" basicSetup={{ foldGutter: false, highlightActiveLineGutter: true }} placeholder={'function solve(input):\n    // Describe your approach in plain English or pseudocode\n    ...'} />
}
