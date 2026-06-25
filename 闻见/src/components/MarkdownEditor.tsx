import React, { useState, useRef, useCallback, useEffect, memo, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import {
  Bold, Italic, Heading1, Heading2, List, ListOrdered, Quote, Code,
  Link, Image, Video, Mic, Square, Eye, EyeOff, Smartphone, Monitor,
  FilePlus, Save, Clock, CheckCircle, AlertCircle, RotateCcw, Download,
  MoreHorizontal, Trash2, X, Music
} from 'lucide-react';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  storageKey?: string;
}

type EditorMode = 'new' | 'continue' | 'recovered';
type SaveStatus = 'saved' | 'saving' | 'unsaved';

const AUTOSAVE_INTERVAL = 3000;

const MemoizedIframe = memo(function IframeComponent({ src, ...props }: any) {
  const isMusic = src?.includes('music.163.com');
  if (isMusic) {
    return (
      <div className="w-full my-4 p-3 bg-[#f0eeeb] rounded-lg">
        <iframe
          src={src}
          className="w-full h-[110px] rounded"
          {...props}
          loading="lazy"
        />
        <div className="w-full h-px bg-gray-300 mt-3" />
      </div>
    );
  }
  return (
    <div className="relative w-full aspect-video my-4">
      <iframe
        src={src}
        className="absolute inset-0 w-full h-full rounded-lg border border-gray-200"
        allowFullScreen
        {...props}
        loading="lazy"
      />
    </div>
  );
});

export default function MarkdownEditor({ value, onChange, placeholder, storageKey = 'markdown_editor_autosave' }: MarkdownEditorProps) {
  const [showPreview, setShowPreview] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [editorMode, setEditorMode] = useState<EditorMode>('new');
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [lastSaved, setLastSaved] = useState<number | null>(null);
  const [wordCount, setWordCount] = useState(0);
  const [showRecoveryDialog, setShowRecoveryDialog] = useState(false);
  const [recoveryContent, setRecoveryContent] = useState<string>('');
  const [localValue, setLocalValue] = useState(value);
  const [showVideoDialog, setShowVideoDialog] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');
  const [showMusicDialog, setShowMusicDialog] = useState(false);
  const [musicUrl, setMusicUrl] = useState('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  useEffect(() => {
    const count = localValue.trim().split(/\s+/).filter(w => w.length > 0).length;
    setWordCount(count);
  }, [localValue]);

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved && saved !== value) {
      setRecoveryContent(saved);
      setShowRecoveryDialog(true);
    }
  }, [storageKey, value]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (localValue !== value) {
        localStorage.setItem(storageKey, localValue);
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [localValue, value, storageKey]);

  const autoSave = useCallback(() => {
    if (!localValue) return;
    setSaveStatus('saving');
    localStorage.setItem(storageKey, localValue);
    setTimeout(() => {
      setLastSaved(Date.now());
      setSaveStatus('saved');
    }, 500);
  }, [localValue, storageKey]);

  useEffect(() => {
    if (localValue !== value) {
      setSaveStatus('unsaved');
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        autoSave();
      }, AUTOSAVE_INTERVAL);
    }
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [localValue, value, autoSave]);

  const handleChange = useCallback((newValue: string) => {
    setLocalValue(newValue);
    onChange(newValue);
  }, [onChange]);

  const createNewDocument = () => {
    setLocalValue('');
    onChange('');
    setEditorMode('new');
    setSaveStatus('saved');
    setLastSaved(null);
    localStorage.removeItem(storageKey);
    textareaRef.current?.focus();
  };

  const recoverDocument = () => {
    setLocalValue(recoveryContent);
    onChange(recoveryContent);
    setEditorMode('recovered');
    setSaveStatus('saved');
    setLastSaved(Date.now());
    setShowRecoveryDialog(false);
    textareaRef.current?.focus();
  };

  const dismissRecovery = () => {
    setShowRecoveryDialog(false);
    localStorage.removeItem(storageKey);
    setEditorMode('new');
  };

  const manualSave = () => {
    autoSave();
  };

  const downloadMarkdown = () => {
    const blob = new Blob([localValue], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `document_${Date.now()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatLastSaved = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`;
    return new Date(timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  };

  const insertText = useCallback((before: string, after: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = localValue.substring(start, end);
    const newText = localValue.substring(0, start) + before + selectedText + after + localValue.substring(end);
    handleChange(newText);
    setTimeout(() => {
      textarea.focus();
      const newCursor = start + before.length + selectedText.length;
      textarea.setSelectionRange(newCursor, newCursor);
    }, 0);
  }, [localValue]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        insertText(`<audio controls src="${audioUrl}"></audio>`, '\n');
        stream.getTracks().forEach(track => track.stop());
      };
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime(prev => prev + 1), 1000);
    } catch {
      alert('无法访问麦克风');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const parseVideoUrl = (url: string): string | null => {
    const bilibiliMatch = url.match(/(?:bilibili\.com\/video\/)?(BV[\w]+)/i);
    if (bilibiliMatch) {
      return `https://player.bilibili.com/player.html?bvid=${bilibiliMatch[1]}&page=1&high_quality=1&danmaku=0&autoplay=0&hideCoverInfo=1&hideDanmakuButton=1&hideFullscreenButton=0`;
    }
    const bilibiliShortMatch = url.match(/b23\.tv\/(BV[\w]+)/i);
    if (bilibiliShortMatch) {
      return `https://player.bilibili.com/player.html?bvid=${bilibiliShortMatch[1]}&page=1&high_quality=1&danmaku=0&autoplay=0&hideCoverInfo=1&hideDanmakuButton=1&hideFullscreenButton=0`;
    }
    const youtubeMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/i);
    if (youtubeMatch) {
      return `https://www.youtube.com/embed/${youtubeMatch[1]}?rel=0&modestbranding=1`;
    }
    return null;
  };

  const insertVideo = () => {
    const embedUrl = parseVideoUrl(videoUrl);
    if (embedUrl) {
      const iframeCode = `<iframe src="${embedUrl}" width="100%" height="400" frameborder="0" allowfullscreen></iframe>`;
      const textarea = textareaRef.current;
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const newText = localValue.substring(0, start) + '\n' + iframeCode + '\n' + localValue.substring(end);
        handleChange(newText);
        setTimeout(() => {
          textarea.focus();
          const newCursor = start + iframeCode.length + 2;
          textarea.setSelectionRange(newCursor, newCursor);
        }, 0);
      }
      setVideoUrl('');
      setShowVideoDialog(false);
    } else {
      alert('请输入有效的 Bilibili 或 YouTube 视频链接');
    }
  };

  const parseMusicUrl = (url: string): string | null => {
    const songIdMatch = url.match(/music\.163\.com\/song\/(\d+)/i);
    if (songIdMatch) {
      return songIdMatch[1];
    }
    const songIdMatch2 = url.match(/music\.163\.com\/.*?id=(\d+)/i);
    if (songIdMatch2) {
      return songIdMatch2[1];
    }
    const directIdMatch = url.match(/^(\d+)$/);
    if (directIdMatch) {
      return directIdMatch[1];
    }
    return null;
  };

  const insertMusic = () => {
    const songId = parseMusicUrl(musicUrl);
    if (songId) {
      const iframeCode = `<iframe src="https://music.163.com/outchain/player?type=2&id=${songId}&auto=0&height=90" width="100%" height="90" frameborder="0"></iframe>`;
      const textarea = textareaRef.current;
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const newText = localValue.substring(0, start) + '\n' + iframeCode + '\n' + localValue.substring(end);
        handleChange(newText);
        setTimeout(() => {
          textarea.focus();
          const newCursor = start + iframeCode.length + 2;
          textarea.setSelectionRange(newCursor, newCursor);
        }, 0);
      }
      setMusicUrl('');
      setShowMusicDialog(false);
    } else {
      alert('请输入有效的网易云音乐链接或歌曲ID');
    }
  };

  const toolbarItems = [
    { icon: Heading1, action: () => insertText('# ', '\n'), title: '标题1' },
    { icon: Heading2, action: () => insertText('## ', '\n'), title: '标题2' },
    { icon: Bold, action: () => insertText('**', '**'), title: '粗体' },
    { icon: Italic, action: () => insertText('*', '*'), title: '斜体' },
    { icon: List, action: () => insertText('- ', '\n'), title: '无序列表' },
    { icon: ListOrdered, action: () => insertText('1. ', '\n'), title: '有序列表' },
    { icon: Quote, action: () => insertText('> ', '\n'), title: '引用' },
    { icon: Code, action: () => insertText('```\n', '\n```'), title: '代码块' },
    { icon: Link, action: () => insertText('[链接文字](', ')'), title: '链接' },
    { icon: Image, action: () => insertText('![图片描述](', ')'), title: '图片' },
    { icon: Video, action: () => setShowVideoDialog(true), title: '嵌入视频' },
    { icon: Music, action: () => setShowMusicDialog(true), title: '嵌入音乐' },
  ];

  return (
    <div className="bg-[var(--color-bg-primary)] border border-gray-200 rounded-lg overflow-hidden shadow-sm">
      {showRecoveryDialog && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
            <div className="flex items-start gap-4">
              <RotateCcw className="w-6 h-6 text-[var(--secondary)] flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">恢复未保存的内容？</h3>
                <p className="text-sm text-gray-600 mb-4">检测到您有未保存的文档内容。是否恢复继续编辑？</p>
                <div className="bg-[var(--color-bg-primary)] rounded-md p-3 mb-4">
                  <p className="text-xs text-[var(--color-text-secondary)] line-clamp-3">{recoveryContent.slice(0, 150)}...</p>
                </div>
                <div className="flex gap-3">
                  <button onClick={recoverDocument} className="flex-1 bg-[var(--secondary)] text-white text-sm font-medium py-2 px-4 rounded-md hover:bg-[var(--secondary)]">恢复内容</button>
                  <button onClick={dismissRecovery} className="flex-1 bg-transparent text-gray-700 text-sm font-medium py-2 px-4 rounded-md border border-gray-300 hover:bg-[var(--card)]">新建文档</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showVideoDialog && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">嵌入视频</h3>
              <button onClick={() => setShowVideoDialog(false)} className="p-1 hover:bg-[var(--card)] rounded">
                <X className="w-5 h-5 text-[var(--color-text-secondary)]" />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">支持 Bilibili 和 YouTube 视频链接</p>
            <input
              type="text"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="粘贴视频链接，如: https://www.bilibili.com/video/BV..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-[var(--secondary)] mb-4"
            />
            <div className="flex gap-3">
              <button onClick={() => setShowVideoDialog(false)} className="flex-1 py-2 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-[var(--card)]">取消</button>
              <button onClick={insertVideo} className="flex-1 py-2 text-sm text-white bg-[var(--secondary)] rounded-md hover:bg-[var(--secondary)]">插入</button>
            </div>
          </div>
        </div>
      )}

      {showMusicDialog && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">嵌入音乐</h3>
              <button onClick={() => setShowMusicDialog(false)} className="p-1 hover:bg-[var(--card)] rounded">
                <X className="w-5 h-5 text-[var(--color-text-secondary)]" />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">支持网易云音乐链接或歌曲ID</p>
            <input
              type="text"
              value={musicUrl}
              onChange={(e) => setMusicUrl(e.target.value)}
              placeholder="粘贴音乐链接，如: https://music.163.com/song/123456..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-[var(--secondary)] mb-4"
            />
            <div className="flex gap-3">
              <button onClick={() => setShowMusicDialog(false)} className="flex-1 py-2 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-[var(--card)]">取消</button>
              <button onClick={insertMusic} className="flex-1 py-2 text-sm text-white bg-[var(--secondary)] rounded-md hover:bg-[var(--secondary)]">插入</button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {editorMode === 'new' ? <FilePlus className="w-4 h-4 text-gray-400" /> : editorMode === 'recovered' ? <RotateCcw className="w-4 h-4 text-[var(--secondary)]" /> : <Save className="w-4 h-4 text-gray-400" />}
            <span className="text-sm font-medium text-[var(--color-text-primary)]">
              {editorMode === 'new' && '新建文档'}
              {editorMode === 'continue' && '继续编辑'}
              {editorMode === 'recovered' && '已恢复'}
            </span>
          </div>
          <div className="h-4 w-px bg-gray-200" />
          <div className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)]">
            {saveStatus === 'saving' && <><Clock className="w-3 h-3 animate-spin" /><span>保存中...</span></>}
            {saveStatus === 'saved' && lastSaved && <><CheckCircle className="w-3 h-3 text-[var(--color-success)]" /><span>已保存 {formatLastSaved(lastSaved)}</span></>}
            {saveStatus === 'unsaved' && <><AlertCircle className="w-3 h-3 text-[var(--color-warning)]" /><span>未保存</span></>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={createNewDocument} className="flex items-center gap-1.5 text-sm text-gray-700 px-3 py-1.5 rounded-md hover:bg-[var(--card)]"><FilePlus className="w-4 h-4" />新建</button>
          <button onClick={manualSave} disabled={saveStatus === 'saving'} className="flex items-center gap-1.5 text-sm text-gray-700 px-3 py-1.5 rounded-md hover:bg-[var(--card)] disabled:opacity-50"><Save className="w-4 h-4" />保存</button>
          <div className="relative group">
            <button className="p-1.5 rounded-md hover:bg-[var(--card)]"><MoreHorizontal className="w-4 h-4 text-gray-600" /></button>
            <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible z-10">
              <button onClick={downloadMarkdown} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-[var(--color-bg-primary)]"><Download className="w-4 h-4" />下载 Markdown</button>
              <button onClick={createNewDocument} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-[var(--color-bg-primary)]"><Trash2 className="w-4 h-4" />清空文档</button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between p-2 border-b border-gray-200 bg-[#faf9f7]">
        <div className="flex items-center space-x-1">
          {toolbarItems.map((item, index) => (
            <button key={index} onClick={item.action} className="p-2 text-[#7a7062] hover:text-[var(--color-text-primary)] hover:bg-[var(--card)] rounded" title={item.title}>
              <item.icon className="w-4 h-4" />
            </button>
          ))}
          <div className="w-px h-6 bg-gray-300 mx-1" />
          <button onClick={isRecording ? stopRecording : startRecording} className={`p-2 flex items-center gap-1 rounded ${isRecording ? 'text-red-600 bg-red-50 animate-pulse' : 'text-[#7a7062] hover:text-[var(--color-text-primary)] hover:bg-[var(--card)]'}`} title={isRecording ? '停止录音' : '开始录音'}>
            {isRecording ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            {isRecording && <span className="text-xs font-mono">{formatTime(recordingTime)}</span>}
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setIsMobile(!isMobile)} className={`p-2 rounded ${isMobile ? 'text-[var(--color-text-primary)] bg-[var(--card)]' : 'text-[#7a7062] hover:text-[var(--color-text-primary)]'}`} title="切换视图">{isMobile ? <Smartphone className="w-4 h-4" /> : <Monitor className="w-4 h-4" />}</button>
          <button onClick={() => setShowPreview(!showPreview)} className="p-2 text-[#7a7062] hover:text-[var(--color-text-primary)] rounded" title={showPreview ? '隐藏预览' : '显示预览'}>{showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
        </div>
      </div>

      <div className={`flex ${isMobile ? 'flex-col' : 'flex-row'} h-[400px]`}>
        <div className={`${isMobile ? 'h-1/2' : showPreview ? 'w-1/2' : 'w-full'} border-${isMobile ? 'b' : 'r'} border-gray-200`}>
          <textarea ref={textareaRef} value={localValue} onChange={(e) => handleChange(e.target.value)} placeholder={placeholder || '在此输入 Markdown 内容...'} className="w-full h-full p-4 bg-white text-[var(--color-text-primary)] text-sm resize-none focus:outline-none" spellCheck={false} />
        </div>
        {showPreview && (
          <div className={`${isMobile ? 'h-1/2' : 'w-1/2'} bg-white overflow-auto`}>
            <div className="p-4 prose prose-stone prose-sm max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw]}
                components={{
                  code({ node, inline, className, children, ...props }: any) {
                    const match = /language-(\w+)/.exec(className || '');
                    return !inline && match ? (
                      <SyntaxHighlighter style={oneLight} language={match[1]} PreTag="div" {...props}>
                        {String(children).replace(/\n$/, '')}
                      </SyntaxHighlighter>
                    ) : (
                      <code className={className} {...props}>{children}</code>
                    );
                  },
                  iframe: MemoizedIframe,
                }}
              >
                {localValue || '预览区域'}
              </ReactMarkdown>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white border-t border-gray-200 px-4 py-2 flex items-center justify-between text-xs text-[var(--color-text-secondary)]">
        <div className="flex items-center gap-4">
          <span>{wordCount} 字</span>
          <span>{localValue.length} 字符</span>
        </div>
        <div className="flex items-center gap-4">
          {editorMode === 'recovered' && <span className="text-[var(--secondary)]">已从自动保存恢复</span>}
          <span>自动保存已开启</span>
        </div>
      </div>
    </div>
  );
}
