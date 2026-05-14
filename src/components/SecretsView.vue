<template>
  <div class="flex min-h-0 flex-1 flex-col overflow-hidden">
    <div class="flex min-h-0 min-w-0 flex-1 overflow-hidden">
      <AppSidebar :services="store.services" :selected-service="store.selectedService"
        :open-services="store.tabs.map((t) => t.service)" :loading="store.loading" :profile="store.selectedProfile"
        :region="store.region" :account="store.authAccount" @select-service="store.openTab"
        @refresh-services="store.loadServices" @logout="store.logout" @open-settings="$emit('open-settings')" />

      <main class="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background">
        <!-- Tab strip: drag empty chrome; tab strip & buttons opt out (frameless) -->
        <div
          class="ch-tab-titlebar flex h-[49px] shrink-0 select-none items-center gap-1 border-b bg-card px-2"
          data-tauri-drag-region
        >
          <!-- Tab list -->
          <div
            class="scrollbar-none flex min-h-0 min-w-0 flex-1 items-center gap-1 overflow-x-auto"
            data-tauri-drag-region="false"
          >
            <div v-for="tab in store.tabs" :key="tab.id"
              class="group flex shrink-0 cursor-pointer select-none items-center gap-1.5 rounded-md px-2.5 py-1 text-sm transition-colors"
              :class="isTabActive(tab.id)
                ? 'bg-muted font-medium text-foreground'
                : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                " @click="handleTabClick(tab.id)">
              <Database class="h-3.5 w-3.5 shrink-0 opacity-60" />
              <span class="max-w-[160px] truncate" :title="tab.service">{{
                store.serviceLabel(tab.service)
                }}</span>
              <button
                class="ml-0.5 rounded p-0.5 opacity-0 transition-opacity hover:bg-muted-foreground/20 group-hover:opacity-100"
                @click.stop="store.closeTab(tab.id)">
                <X class="h-3 w-3" />
              </button>
            </div>

            <span v-if="!store.tabs.length" class="select-none px-2 text-xs text-muted-foreground">
              Select a service to open a tab
            </span>
          </div>

          <div data-tauri-drag-region="false" class="flex shrink-0 items-center gap-1">
            <Tooltip>
              <TooltipTrigger as-child>
                <Button variant="ghost" size="icon" class="h-7 w-7 shrink-0"
                  :class="store.splitView ? 'bg-primary/10 text-primary' : ''" @click="store.toggleSplit()">
                  <Columns2 class="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {{ store.splitView ? "Disable split view" : "Enable split view" }}
              </TooltipContent>
            </Tooltip>

            <WindowTitleControls />
          </div>
        </div>

        <!-- Content area (split: left width persisted; drag handle keeps min width on both sides) -->
        <div ref="splitContentRef" class="flex min-h-0 flex-1 overflow-hidden">
          <!-- Left panel -->
          <div
            class="flex flex-col overflow-hidden"
            :class="[
              store.splitView ? 'relative shrink-0 border-r' : 'min-w-0 flex-1',
              !isSplitResizing && store.splitView ? 'transition-[width] duration-200 ease-in-out' : '',
            ]"
            :style="store.splitView ? { width: `${splitLeftPx}px` } : undefined"
            @mousedown="store.setFocusedSide('left')"
          >
            <div v-if="store.splitView"
              class="flex h-8 shrink-0 items-center gap-1 border-b px-3 text-xs font-medium transition-colors" :class="store.focusedSide === 'left'
                ? 'border-b-primary/30 bg-primary/5 text-primary'
                : 'text-muted-foreground'
                ">
              <PanelLeft class="h-3 w-3" />
              Left
            </div>
            <ServicePanel :tab-id="store.activeTabId" :focused="store.focusedSide === 'left'" @toast="showToast"
              @focus="store.setFocusedSide('left')" />

            <div
              v-if="store.splitView"
              role="separator"
              aria-orientation="vertical"
              aria-label="Resize split panels"
              tabindex="-1"
              class="absolute right-0 top-0 z-20 h-full w-3 max-w-[12px] translate-x-1/2 cursor-col-resize touch-none hover:bg-primary/25"
              data-tauri-drag-region="false"
              @mousedown.prevent="startSplitResize"
            />
          </div>

          <!-- Right panel -->
          <div v-if="store.splitView" class="flex min-w-0 flex-1 flex-col overflow-hidden"
            @mousedown="store.setFocusedSide('right')">
            <div class="flex h-8 shrink-0 items-center gap-1 border-b px-3 text-xs font-medium transition-colors"
              :class="store.focusedSide === 'right'
                ? 'border-b-primary/30 bg-primary/5 text-primary'
                : 'text-muted-foreground'
                ">
              <PanelRight class="h-3 w-3" />
              Right
            </div>
            <ServicePanel :tab-id="store.splitTabId" :focused="store.focusedSide === 'right'" @toast="showToast"
              @focus="store.setFocusedSide('right')" />
          </div>
        </div>
      </main>
    </div>

    <!-- Toast -->
    <Transition name="fade">
      <div v-if="toast.message" class="fixed bottom-4 right-4 z-50 max-w-sm rounded-md px-4 py-2 text-sm shadow-lg"
        :class="toast.type === 'error'
          ? 'bg-destructive text-destructive-foreground'
          : 'bg-foreground text-background'
          ">
        {{ toast.message }}
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, onMounted, onUnmounted } from "vue";
import { Database, X, Columns2, PanelLeft, PanelRight } from "lucide-vue-next";
import { useChamberStore } from "@/stores/chamber";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import AppSidebar from "./AppSidebar.vue";
import ServicePanel from "./ServicePanel.vue";
import WindowTitleControls from "./WindowTitleControls.vue";

defineEmits<{ "open-settings": [] }>();

const store = useChamberStore();

const SPLIT_PANE_PREFS_KEY = "chamber-ui.splitPane";
/** Each panel keeps at least this width while resizing (split never fully hides a side). */
const MIN_SPLIT_PANEL_PX = 200;

function readSplitLeftFromStorage(): number {
  try {
    const raw = localStorage.getItem(SPLIT_PANE_PREFS_KEY);
    if (!raw) return 0;
    const o = JSON.parse(raw) as { leftPx?: number };
    if (typeof o.leftPx === "number" && Number.isFinite(o.leftPx) && o.leftPx > 0) {
      return Math.round(o.leftPx);
    }
  } catch {
    /* ignore */
  }
  return 0;
}

const splitContentRef = ref<HTMLElement | null>(null);
/** 0 = derive from layout on first open (no prefs). */
const splitLeftPx = ref(readSplitLeftFromStorage());
const isSplitResizing = ref(false);

const toast = ref({ message: "", type: "success" as "success" | "error" });
let toastTimer: ReturnType<typeof setTimeout> | null = null;

function showToast(message: string, type: "success" | "error" = "success") {
  if (toastTimer) clearTimeout(toastTimer);
  toast.value = { message, type };
  toastTimer = setTimeout(
    () => (toast.value = { message: "", type: "success" }),
    3000,
  );
}

function isTabActive(tabId: string): boolean {
  return store.activeTabId === tabId || store.splitTabId === tabId;
}

function handleTabClick(tabId: string) {
  store.setActiveTab(tabId, store.splitView ? store.focusedSide : "left");
}

function persistSplitPanePrefs(): void {
  if (splitLeftPx.value <= 0) return;
  try {
    localStorage.setItem(
      SPLIT_PANE_PREFS_KEY,
      JSON.stringify({ leftPx: splitLeftPx.value }),
    );
  } catch {
    /* ignore */
  }
}

function clampSplitLeft(w: number): number {
  const el = splitContentRef.value;
  if (!el) return Math.max(MIN_SPLIT_PANEL_PX, w);
  const total = el.clientWidth;
  if (total <= MIN_SPLIT_PANEL_PX * 2) {
    return Math.max(MIN_SPLIT_PANEL_PX, Math.min(total - MIN_SPLIT_PANEL_PX, w));
  }
  const max = total - MIN_SPLIT_PANEL_PX;
  return Math.round(Math.max(MIN_SPLIT_PANEL_PX, Math.min(max, w)));
}

function applySplitWidthClamp(): void {
  if (!store.splitView) return;
  const el = splitContentRef.value;
  if (!el || el.clientWidth <= 0) return;
  if (splitLeftPx.value <= 0) {
    splitLeftPx.value = Math.floor(el.clientWidth / 2);
  }
  splitLeftPx.value = clampSplitLeft(splitLeftPx.value);
}

function startSplitResize(downEvent: MouseEvent): void {
  if (!store.splitView || !splitContentRef.value) return;
  isSplitResizing.value = true;
  applySplitWidthClamp();
  const startX = downEvent.clientX;
  const startW = splitLeftPx.value;

  const onMove = (e: MouseEvent) => {
    const w = startW + (e.clientX - startX);
    splitLeftPx.value = clampSplitLeft(w);
  };

  const onUp = () => {
    isSplitResizing.value = false;
    persistSplitPanePrefs();
    document.body.style.removeProperty("cursor");
    document.body.style.removeProperty("user-select");
    window.removeEventListener("mousemove", onMove);
    window.removeEventListener("mouseup", onUp);
  };

  document.body.style.cursor = "col-resize";
  document.body.style.userSelect = "none";
  window.addEventListener("mousemove", onMove);
  window.addEventListener("mouseup", onUp);
}

watch(
  () => store.splitView,
  (on) => {
    if (!on) return;
    if (splitLeftPx.value <= 0) {
      splitLeftPx.value = Math.max(
        MIN_SPLIT_PANEL_PX,
        Math.floor(window.innerWidth * 0.35),
      );
    }
    nextTick(() => applySplitWidthClamp());
  },
);

onMounted(() => {
  window.addEventListener("resize", applySplitWidthClamp);
});

onUnmounted(() => {
  window.removeEventListener("resize", applySplitWidthClamp);
});
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition:
    opacity 0.2s,
    transform 0.2s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(4px);
}
</style>
