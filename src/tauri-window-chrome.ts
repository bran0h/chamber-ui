/**
 * Frameless window: transparent outer shell + rounded `.ch-tauri-root` (see index.css).
 * Drops rounding in fullscreen so Mission Control / fullscreen Space look correct.
 */

function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

async function syncFullscreenClass(): Promise<void> {
  if (!isTauri()) return;
  try {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    const fs = await getCurrentWindow().isFullscreen();
    document.documentElement.classList.toggle("ch-tauri-fullscreen", fs);
  } catch {
    document.documentElement.classList.remove("ch-tauri-fullscreen");
  }
}

let resizeTimer: ReturnType<typeof setTimeout> | null = null;
function onResizeDebounced() {
  if (resizeTimer) clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => void syncFullscreenClass(), 120);
}

export function initTauriWindowChrome(): void {
  if (!isTauri()) return;
  document.documentElement.classList.add("ch-tauri-chrome");
  void syncFullscreenClass();
  window.addEventListener("resize", onResizeDebounced);
}
