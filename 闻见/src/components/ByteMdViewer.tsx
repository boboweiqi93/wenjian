import React, { memo, useMemo, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight, oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { useTheme } from '../hooks/useTheme';

interface HeadingInfo {
  id: string;
  text: string;
  level: number;
}

interface ByteMdViewerProps {
  content: string;
  headings?: HeadingInfo[];
}

const MemoizedIframe = memo(function IframeComponent({ src, ...props }: any) {
  const isMusic = src?.includes('music.163.com');
  if (isMusic) {
    return (
      <div className="w-full my-4 p-3 bg-[var(--muted)] rounded-lg">
        <iframe
          src={src}
          className="w-full h-[110px] rounded"
          {...props}
          loading="lazy"
        />
        <div className="w-full h-px bg-[var(--color-border)] mt-3" />
      </div>
    );
  }
  return (
    <div className="relative w-full aspect-video my-6">
      <iframe
        src={src}
        className="absolute inset-0 w-full h-full rounded-lg border border-[var(--color-border)]"
        allowFullScreen
        {...props}
        loading="lazy"
      />
    </div>
  );
});

const ByteMdViewer = memo(function ByteMdViewer({ content, headings }: ByteMdViewerProps) {
  const { isDark } = useTheme();

  const memoizedContent = useMemo(() => content, [content]);

  const headingMap = useMemo(() => {
    const map = new Map<string, string>();
    headings?.forEach(h => {
      map.set(h.text, h.id);
    });
    return map;
  }, [headings]);

  const components = useMemo(() => ({
    code({ node, inline, className, children, ...props }: any) {
      const match = /language-(\w+)/.exec(className || '');
      return !inline && match ? (
        <SyntaxHighlighter
          style={isDark ? oneDark : oneLight}
          language={match[1]}
          PreTag="div"
          {...props}
        >
          {String(children).replace(/\n$/, '')}
        </SyntaxHighlighter>
      ) : (
        <code
          className="bg-[var(--muted)] text-[var(--color-text-primary)] px-1.5 py-0.5 rounded text-sm font-mono"
          {...props}
        >
          {children}
        </code>
      );
    },
    blockquote({ children }: { children: React.ReactNode }) {
      return (
        <blockquote className="border-l-2 border-[var(--color-accent-light)] pl-4 my-4 text-[var(--color-text-secondary)] italic text-sm">
          {children}
        </blockquote>
      );
    },
    a({ children, href }: { children: React.ReactNode; href?: string }) {
      return (
        <a
          href={href}
          className="text-[var(--secondary)] hover:underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          {children}
        </a>
      );
    },
    h1({ children }: { children: React.ReactNode }) {
      const text = String(children);
      const id = headingMap.get(text) || `heading-${text.slice(0, 20).replace(/\s+/g, '-').toLowerCase()}`;
      return (
        <h1 id={id} className="text-2xl font-serif font-light text-[var(--color-text-primary)] mt-8 mb-4 pb-2 border-b border-[var(--color-border)]">
          {children}
        </h1>
      );
    },
    h2({ children }: { children: React.ReactNode }) {
      const text = String(children);
      const id = headingMap.get(text) || `heading-${text.slice(0, 20).replace(/\s+/g, '-').toLowerCase()}`;
      return (
        <h2 id={id} className="text-xl font-serif font-medium text-[var(--color-text-primary)] mt-6 mb-3">
          {children}
        </h2>
      );
    },
    h3({ children }: { children: React.ReactNode }) {
      const text = String(children);
      const id = headingMap.get(text) || `heading-${text.slice(0, 20).replace(/\s+/g, '-').toLowerCase()}`;
      return (
        <h3 id={id} className="text-lg font-serif font-medium text-[var(--color-text-primary)] mt-4 mb-2">
          {children}
        </h3>
      );
    },
    p({ children }: { children: React.ReactNode }) {
      return (
        <p className="text-[var(--color-text-primary)] leading-[1.9] mb-5 text-justify tracking-wide" style={{ fontFamily: 'var(--font-serif)' }}>
          {children}
        </p>
      );
    },
    ul({ children }: { children: React.ReactNode }) {
      return (
        <ul className="list-disc pl-6 mb-5 text-[var(--color-text-primary)] space-y-0">
          {children}
        </ul>
      );
    },
    ol({ children }: { children: React.ReactNode }) {
      return (
        <ol className="list-decimal pl-6 mb-5 text-[var(--color-text-primary)] space-y-0">
          {children}
        </ol>
      );
    },
    li({ children }: { children: React.ReactNode }) {
      return (
        <li className="leading-[1.9] mb-0">
          {children}
        </li>
      );
    },
    hr() {
      return (
        <hr className="border-[var(--color-border)] my-6" />
      );
    },
    table({ children }: { children: React.ReactNode }) {
      return (
        <div className="overflow-x-auto mb-4">
          <table className="w-full border-collapse text-sm">
            {children}
          </table>
        </div>
      );
    },
    thead({ children }: { children: React.ReactNode }) {
      return (
        <thead className="bg-[var(--muted)]">
          {children}
        </thead>
      );
    },
    th({ children }: { children: React.ReactNode }) {
      return (
        <th className="border border-[var(--color-border)] px-3 py-2 text-left text-[var(--color-text-primary)] font-medium whitespace-nowrap">
          {children}
        </th>
      );
    },
    td({ children }: { children: React.ReactNode }) {
      return (
        <td className="border border-[var(--color-border)] px-3 py-2 text-[var(--color-text-primary)] whitespace-nowrap">
          {children}
        </td>
      );
    },
    iframe({ src, ...props }: any) {
      return <MemoizedIframe src={src} {...props} />;
    },
  }), [isDark]);

  return (
    <div className="prose prose-stone max-w-none dark:prose-invert">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={components}
      >
        {memoizedContent}
      </ReactMarkdown>
    </div>
  );
});

export default ByteMdViewer;
