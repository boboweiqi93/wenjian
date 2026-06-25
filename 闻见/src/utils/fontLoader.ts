export function initFontLoading(): void {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applySystemFont);
  } else {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => applySystemFont(), { timeout: 2000 });
    } else {
      setTimeout(applySystemFont, 100);
    }
  }
}

function applySystemFont(): void {
  document.documentElement.classList.add('font-loaded');
}

export default { initFontLoading };
