import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/index.css';
import { AudioProvider } from './contexts/AudioContext';
import { ToastProvider } from './components/Toast';
import { initFontLoading } from './utils/fontLoader';

// 抑制 ResizeObserver 循环警告（浏览器行为，不影响功能）
// 方法1: 拦截 console.error
const originalConsoleError = window.console.error;
window.console.error = (...args: any[]) => {
  const msg = args[0]?.message || args[0];
  if (typeof msg === 'string' && msg.includes('ResizeObserver')) {
    return;
  }
  originalConsoleError.apply(window.console, args);
};

// 方法2: 拦截 unhandledrejection
window.addEventListener('unhandledrejection', (e) => {
  if (e.reason?.message?.includes('ResizeObserver') ||
      (typeof e.reason === 'string' && e.reason.includes('ResizeObserver'))) {
    e.preventDefault();
  }
});

// 方法3: 使用 requestAnimationFrame 包装 ResizeObserver 原型（如果存在）
const originalResizeObserver = (window as any).ResizeObserver;
if (originalResizeObserver) {
  (window as any).ResizeObserver = class extends originalResizeObserver {
    constructor(callback: ResizeObserverCallback) {
      const wrappedCallback: ResizeObserverCallback = (entries, observer) => {
        try {
          callback(entries, observer);
        } catch (err: any) {
          if (err.message?.includes('ResizeObserver loop')) {
            // 静默忽略
            return;
          }
          throw err;
        }
      };
      super(wrappedCallback);
    }
  };
}

const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
const initialTheme = savedTheme || 'light';
document.documentElement.classList.add(initialTheme);
document.documentElement.setAttribute('data-theme', initialTheme);

// 初始化字体加载（异步，不阻塞渲染）
initFontLoading();

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <ToastProvider>
      <AudioProvider>
        <App />
      </AudioProvider>
    </ToastProvider>
  );
}
