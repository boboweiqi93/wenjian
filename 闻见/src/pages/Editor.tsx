import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  FileText,
  Plus,
  Save,
  Clock,
  AlertCircle,
  CheckCircle,
  RotateCcw,
  MoreHorizontal,
  Trash2,
  Download,
  FilePlus
} from 'lucide-react';

interface DocumentState {
  id: string;
  title: string;
  content: string;
  lastSaved: number;
  isAutoSaved: boolean;
}

type EditorMode = 'new' | 'continue' | 'recovered';

const STORAGE_KEY = 'editor_autosave';
const BACKUP_KEY = 'editor_backup';
const AUTOSAVE_INTERVAL = 3000;

export default function Editor() {
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [documentId, setDocumentId] = useState('');
  const [lastSaved, setLastSaved] = useState<number | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [editorMode, setEditorMode] = useState<EditorMode>('new');
  const [showRecoveryDialog, setShowRecoveryDialog] = useState(false);
  const [recoveryContent, setRecoveryContent] = useState<DocumentState | null>(null);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [wordCount, setWordCount] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const generateId = () => `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const checkForUnsavedContent = useCallback(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    const backup = localStorage.getItem(BACKUP_KEY);

    if (saved) {
      try {
        const parsed: DocumentState = JSON.parse(saved);
        if (parsed.content || parsed.title) {
          setRecoveryContent(parsed);
          setShowRecoveryDialog(true);
          return true;
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }

    if (backup) {
      try {
        const parsed: DocumentState = JSON.parse(backup);
        if (parsed.content || parsed.title) {
          setRecoveryContent(parsed);
          setShowRecoveryDialog(true);
          return true;
        }
      } catch {
        localStorage.removeItem(BACKUP_KEY);
      }
    }

    return false;
  }, []);

  useEffect(() => {
    const hasUnsaved = checkForUnsavedContent();
    if (!hasUnsaved) {
      createNewDocument();
    }
  }, [checkForUnsavedContent]);

  useEffect(() => {
    const count = content.trim().split(/\s+/).filter(w => w.length > 0).length;
    setWordCount(count);
  }, [content]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        const backup: DocumentState = {
          id: documentId,
          title,
          content,
          lastSaved: Date.now(),
          isAutoSaved: true
        };
        localStorage.setItem(BACKUP_KEY, JSON.stringify(backup));
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty, content, title, documentId]);

  const autoSave = useCallback(() => {
    if (!content && !title) return;

    setSaveStatus('saving');

    const doc: DocumentState = {
      id: documentId || generateId(),
      title,
      content,
      lastSaved: Date.now(),
      isAutoSaved: true
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(doc));

    setTimeout(() => {
      setLastSaved(Date.now());
      setSaveStatus('saved');
      setIsDirty(false);
    }, 500);
  }, [content, title, documentId]);

  useEffect(() => {
    if (content || title) {
      setIsDirty(true);
      setSaveStatus('unsaved');

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(() => {
        autoSave();
      }, AUTOSAVE_INTERVAL);
    }

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [content, title, autoSave]);

  const createNewDocument = () => {
    setContent('');
    setTitle('');
    setDocumentId(generateId());
    setLastSaved(null);
    setIsDirty(false);
    setSaveStatus('saved');
    setEditorMode('new');
    setShowRecoveryDialog(false);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(BACKUP_KEY);

    setTimeout(() => {
      textareaRef.current?.focus();
    }, 100);
  };

  const recoverDocument = () => {
    if (recoveryContent) {
      setContent(recoveryContent.content);
      setTitle(recoveryContent.title);
      setDocumentId(recoveryContent.id);
      setLastSaved(recoveryContent.lastSaved);
      setIsDirty(false);
      setSaveStatus('saved');
      setEditorMode('recovered');
      setShowRecoveryDialog(false);

      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    }
  };

  const dismissRecovery = () => {
    setShowRecoveryDialog(false);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(BACKUP_KEY);
    createNewDocument();
  };

  const manualSave = () => {
    autoSave();
  };

  const formatLastSaved = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`;
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  };

  const downloadDocument = () => {
    const blob = new Blob([`# ${title}\n\n${content}`], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title || '未命名文档'}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#f7f6f3]">
      {showRecoveryDialog && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <RotateCcw className="w-6 h-6 text-[#2383e2]" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-[#37352f] mb-2">
                  恢复未保存的内容？
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  检测到您有未保存的文档内容。是否恢复继续编辑？
                </p>
                {recoveryContent && (
                  <div className="bg-[#f7f6f3] rounded-md p-3 mb-4">
                    <p className="text-sm font-medium text-[#37352f] truncate">
                      {recoveryContent.title || '未命名文档'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {recoveryContent.content.slice(0, 100)}
                      {recoveryContent.content.length > 100 ? '...' : ''}
                    </p>
                    <p className="text-xs text-gray-400 mt-2">
                      最后编辑: {new Date(recoveryContent.lastSaved).toLocaleString('zh-CN')}
                    </p>
                  </div>
                )}
                <div className="flex gap-3">
                  <button
                    onClick={recoverDocument}
                    className="flex-1 bg-[#2383e2] text-white text-sm font-medium py-2 px-4 rounded-md hover:bg-[#1a6fc2]"
                  >
                    恢复内容
                  </button>
                  <button
                    onClick={dismissRecovery}
                    className="flex-1 bg-transparent text-gray-700 text-sm font-medium py-2 px-4 rounded-md border border-gray-300 hover:bg-gray-100"
                  >
                    新建文档
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              {editorMode === 'new' ? (
                <FilePlus className="w-5 h-5 text-gray-400" />
              ) : editorMode === 'recovered' ? (
                <RotateCcw className="w-5 h-5 text-[#2383e2]" />
              ) : (
                <FileText className="w-5 h-5 text-gray-400" />
              )}
              <span className="text-sm font-medium text-[#37352f]">
                {editorMode === 'new' && '新建文档'}
                {editorMode === 'continue' && '继续编辑'}
                {editorMode === 'recovered' && '已恢复'}
              </span>
            </div>
            <div className="h-4 w-px bg-gray-200" />
            <div className="flex items-center gap-2 text-xs text-gray-500">
              {saveStatus === 'saving' && (
                <>
                  <Clock className="w-3 h-3 animate-spin" />
                  <span>保存中...</span>
                </>
              )}
              {saveStatus === 'saved' && lastSaved && (
                <>
                  <CheckCircle className="w-3 h-3 text-green-500" />
                  <span>已保存 {formatLastSaved(lastSaved)}</span>
                </>
              )}
              {saveStatus === 'unsaved' && (
                <>
                  <AlertCircle className="w-3 h-3 text-amber-500" />
                  <span>未保存</span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={createNewDocument}
              className="flex items-center gap-1.5 text-sm font-medium text-gray-700 px-3 py-1.5 rounded-md hover:bg-[#efedea] active:bg-[#e3e1db]"
            >
              <Plus className="w-4 h-4" />
              新建
            </button>
            <button
              onClick={manualSave}
              disabled={saveStatus === 'saving' || !isDirty}
              className="flex items-center gap-1.5 text-sm font-medium text-gray-700 px-3 py-1.5 rounded-md hover:bg-[#efedea] active:bg-[#e3e1db] disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              保存
            </button>
            <div className="relative group">
              <button className="p-1.5 rounded-md hover:bg-[#efedea] active:bg-[#e3e1db]">
                <MoreHorizontal className="w-4 h-4 text-gray-600" />
              </button>
              <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible">
                <button
                  onClick={downloadDocument}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-[#f7f6f3] first:rounded-t-lg"
                >
                  <Download className="w-4 h-4" />
                  下载 Markdown
                </button>
                <button
                  onClick={createNewDocument}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-[#f7f6f3] last:rounded-b-lg"
                >
                  <Trash2 className="w-4 h-4" />
                  清空文档
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 min-h-[calc(100vh-8rem)]">
          <div className="p-8 md:p-12">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="无标题"
              className="w-full text-4xl font-bold text-[#37352f] placeholder:text-gray-300 border-0 outline-none bg-transparent mb-6"
            />

            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="开始输入内容..."
              className="w-full min-h-[60vh] text-lg text-[#37352f] placeholder:text-gray-300 border-0 outline-none bg-transparent resize-none leading-relaxed"
              spellCheck={false}
            />
          </div>
        </div>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
        <div className="max-w-4xl mx-auto px-4 h-8 flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-4">
            <span>{wordCount} 字</span>
            <span>{content.length} 字符</span>
          </div>
          <div className="flex items-center gap-4">
            {editorMode === 'recovered' && (
              <span className="text-[#2383e2]">已从自动保存恢复</span>
            )}
            <span>自动保存已开启</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
