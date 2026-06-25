import React, { useState, useEffect } from 'react';
import { Editor } from '@bytemd/react';
import gfm from '@bytemd/plugin-gfm';
import highlight from '@bytemd/plugin-highlight';
import math from '@bytemd/plugin-math';
import mermaid from '@bytemd/plugin-mermaid';
import 'bytemd/dist/index.css';

interface ByteMdEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const plugins = [
  gfm(),
  highlight(),
  math(),
  mermaid(),
];

export default function ByteMdEditor({ value, onChange, placeholder }: ByteMdEditorProps) {
  const [uploading, setUploading] = useState(false);
  const [editorValue, setEditorValue] = useState(value);

  useEffect(() => {
    setEditorValue(value);
  }, [value]);

  const handleChange = (v: string) => {
    setEditorValue(v);
    onChange(v);
  };

  const handleUpload = async (files: File[]) => {
    setUploading(true);
    const urls = await Promise.all(
      files.map(async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        return URL.createObjectURL(file);
      })
    );
    setUploading(false);
    return urls;
  };

  return (
    <div className="bytemd-editor">
      <Editor
        value={editorValue}
        plugins={plugins}
        placeholder={placeholder}
        onChange={handleChange}
        uploadImages={handleUpload}
      />
      <style>{`
        .bytemd {
          border: 1px solid var(--color-border);
          background: var(--color-bg-primary);
        }
        .bytemd-toolbar {
          background: var(--color-bg-secondary);
          border-bottom: 1px solid var(--color-border);
        }
        .bytemd-toolbar-icon:hover {
          background: var(--color-content-code-bg);
          color: var(--color-content-code-text);
        }
        .bytemd-editor {
          font-family: 'FZ YouSong', 'Source Han Serif SC', 'Noto Serif SC', 'SimSun', serif;
        }
        .bytemd-preview {
          background: var(--color-bg-primary);
          font-family: 'FZ YouSong', 'Source Han Serif SC', 'Noto Serif SC', 'SimSun', serif;
        }
        .bytemd-status {
          background: var(--color-bg-secondary);
          border-top: 1px solid var(--color-border);
        }
      `}</style>
    </div>
  );
}
