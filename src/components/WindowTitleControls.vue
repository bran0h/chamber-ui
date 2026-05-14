<template>
  <div
    v-if="isTauri"
    class="flex shrink-0 items-center gap-0.5"
    data-tauri-drag-region="false"
  >
    <Tooltip>
      <TooltipTrigger as-child>
        <button
          type="button"
          class="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Minimize"
          @click="minimize"
        >
          <Minus class="h-3.5 w-3.5" stroke-width="2" />
        </button>
      </TooltipTrigger>
      <TooltipContent>Minimize</TooltipContent>
    </Tooltip>
    <Tooltip>
      <TooltipTrigger as-child>
        <button
          type="button"
          class="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          :aria-label="zoomAriaLabel"
          @click="toggleZoom"
        >
          <Minimize2 v-if="zoomed" class="h-3.5 w-3.5" stroke-width="2" />
          <Square v-else class="h-3 w-3" stroke-width="2" />
        </button>
      </TooltipTrigger>
      <TooltipContent>{{ zoomTooltip }}</TooltipContent>
    </Tooltip>
    <Tooltip>
      <TooltipTrigger as-child>
        <button
          type="button"
          class="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/15 hover:text-destructive"
          aria-label="Close"
          @click="closeWindow"
        >
          <X class="h-3.5 w-3.5" stroke-width="2" />
        </button>
      </TooltipTrigger>
      <TooltipContent>Close</TooltipContent>
    </Tooltip>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Minus, Square, X, Minimize2 } from "lucide-vue-next";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { syncTauriFullscreenChromeClass } from "@/tauri-window-chrome";

const isTauri =
  typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

function isMacOsClient(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const p = navigator.platform || "";
  return /Mac OS X|Macintosh/i.test(ua) || p.toLowerCase().startsWith("mac");
}

/** macOS: native fullscreen (separate Space). Other OS: maximized window. */
const useNativeFullscreen = isTauri && isMacOsClient();

const zoomed = ref(false);

const zoomTooltip = computed(() => {
  if (!zoomed.value) return useNativeFullscreen ? "Enter full screen" : "Maximize";
  return useNativeFullscreen ? "Exit full screen" : "Restore";
});

const zoomAriaLabel = computed(() => zoomTooltip.value);

async function syncZoomState() {
  if (!isTauri) return;
  try {
    const w = getCurrentWindow();
    zoomed.value = useNativeFullscreen ? await w.isFullscreen() : await w.isMaximized();
  } catch {
    zoomed.value = false;
  }
}

let resizeSyncTimer: ReturnType<typeof setTimeout> | null = null;
function onWindowResize() {
  if (!useNativeFullscreen) return;
  if (resizeSyncTimer) clearTimeout(resizeSyncTimer);
  resizeSyncTimer = setTimeout(() => void syncZoomState(), 200);
}

onMounted(async () => {
  await syncZoomState();
  await syncTauriFullscreenChromeClass();
  if (useNativeFullscreen) window.addEventListener("resize", onWindowResize);
});

onUnmounted(() => {
  if (useNativeFullscreen) window.removeEventListener("resize", onWindowResize);
  if (resizeSyncTimer) clearTimeout(resizeSyncTimer);
});

async function minimize() {
  try {
    await getCurrentWindow().minimize();
  } catch {
    /* ignore */
  }
}

async function toggleZoom() {
  try {
    const w = getCurrentWindow();
    if (useNativeFullscreen) {
      const next = !(await w.isFullscreen());
      await w.setFullscreen(next);
      zoomed.value = await w.isFullscreen();
    } else {
      await w.toggleMaximize();
      zoomed.value = await w.isMaximized();
    }
    await syncTauriFullscreenChromeClass();
  } catch {
    /* ignore */
  }
}

async function closeWindow() {
  try {
    await getCurrentWindow().close();
  } catch {
    /* ignore */
  }
}
</script>
