/**
 * Frameless window: transparent outer shell + rounded `.ch-tauri-root` (see index.css).
 * Drops rounding in fullscreen so Mission Control / fullscreen Space look correct.
 */

function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

/** Keep in sync with native fullscreen / zoom so corner radius CSS is not stuck off after exiting fullscreen. */
export async function syncTauriFullscreenChromeClass(): Promise<void> {
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
  resizeTimer = setTimeout(() => void syncTauriFullscreenChromeClass(), 120);
}

export function initTauriWindowChrome(): void {
  if (!isTauri()) return;
  document.documentElement.classList.add("ch-tauri-chrome");
  void syncTauriFullscreenChromeClass();
  window.addEventListener("resize", onResizeDebounced);
  void (async () => {
    try {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      await getCurrentWindow().listen("tauri://resize", () =>
        void syncTauriFullscreenChromeClass(),
      );
    } catch {
      /* ignore */
    }
  })();
}
