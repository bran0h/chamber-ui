<template>
<aside
    class="ch-sidebar relative flex shrink-0 flex-col overflow-hidden border-r border-border bg-transparent"
    :class="[
      collapsed ? 'sidebar-narrow' : '',
      isResizing ? '' : 'transition-[width] duration-200 ease-in-out',
    ]"
    :style="{ width: (collapsed ? COLLAPSED_PX : expandedWidthPx) + 'px' }"
  >
    <!-- Header: drag on elements that receive the pointer (Tauri hit-tests target node) -->
    <div
      class="ch-sidebar-titlebar flex h-[49px] shrink-0 select-none items-center border-b border-border px-3"
      :class="collapsed ? '' : 'gap-2'"
    >
      <template v-if="!collapsed">
        <div
          class="flex min-w-0 flex-1 items-center gap-2 overflow-hidden self-stretch"
          data-tauri-drag-region
        >
          <img src="/logo.svg" class="h-5 w-5 shrink-0 dark:invert pointer-events-none" alt="" />
          <span class="min-w-0 truncate text-sm font-semibold pointer-events-none">
            Chamber UI
          </span>
        </div>
        <button
          type="button"
          class="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          data-tauri-drag-region="false"
          @click="toggleSidebarCollapsed"
        >
          <ChevronLeft class="h-4 w-4" />
        </button>
      </template>
      <template v-else>
        <div class="min-h-9 min-w-0 flex-1 self-stretch" data-tauri-drag-region />
        <button
          type="button"
          class="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          data-tauri-drag-region="false"
          @click="toggleSidebarCollapsed"
        >
          <ChevronRight class="h-4 w-4" />
        </button>
        <div class="min-h-9 min-w-0 flex-1 self-stretch" data-tauri-drag-region />
      </template>
    </div>

    <!-- Search + refresh (expanded only) -->
    <div v-if="!collapsed" class="flex items-center gap-1.5 bg-card px-3 pb-2 pt-3">
      <div class="relative flex-1">
        <Search class="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input v-model="serviceSearch" placeholder="Filter services…" class="pl-8 h-8 text-sm" />
      </div>
      <Tooltip>
        <TooltipTrigger as-child>
          <Button variant="outline" size="icon" class="h-8 w-8 shrink-0" :disabled="loading"
            @click="$emit('refresh-services')">
            <RefreshCw class="h-3.5 w-3.5" :class="loading ? 'animate-spin' : ''" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Refresh services</TooltipContent>
      </Tooltip>
    </div>

    <!-- Service list (hidden when collapsed) -->
    <div v-if="!collapsed" class="flex flex-1 flex-col overflow-y-auto bg-card px-3 pb-3">
      <div v-if="loading && !services.length" class="flex justify-center py-4">
        <Loader2 class="h-5 w-5 animate-spin text-muted-foreground" />
      </div>

      <div
        v-for="svc in filteredServices"
        :key="svc"
        class="flex w-full items-center gap-1 rounded-md text-sm transition-colors"
        :class="
          selectedService === svc
            ? 'bg-primary font-medium text-primary-foreground'
            : 'text-foreground hover:bg-muted'
        "
        @contextmenu.prevent="onServiceRowContextMenu(svc)"
      >
        <button
          type="button"
          class="flex min-w-0 flex-1 items-center gap-2 px-3 py-2 text-left"
          @click="$emit('select-service', svc)"
        >
          <Database class="h-3.5 w-3.5 shrink-0" />
          <span class="truncate" :title="svc">{{ store.serviceLabel(svc) }}</span>
          <span
            v-if="openServices.includes(svc) && selectedService !== svc"
            class="h-1.5 w-1.5 shrink-0 rounded-full bg-primary/50"
          />
        </button>
        <DropdownMenu
          :open="serviceActionsMenuFor === svc"
          @update:open="(v) => setServiceActionsMenuOpen(svc, v)"
        >
          <DropdownMenuTrigger as-child>
            <Button
              variant="ghost"
              size="icon"
              class="h-8 w-8 shrink-0 text-inherit opacity-80 hover:opacity-100"
              :class="
                selectedService === svc
                  ? 'hover:bg-primary-foreground/15'
                  : 'hover:bg-muted-foreground/15'
              "
              @click.stop
            >
              <MoreHorizontal class="h-4 w-4" />
              <span class="sr-only">Actions for {{ store.serviceLabel(svc) }}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" class="w-56">
            <DropdownMenuItem @click="openAliasDialog(svc)">
              <Pencil class="h-4 w-4" />
              Rename…
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem @click="store.openServiceInFirstPanel(svc)">
              <PanelLeft class="h-4 w-4" />
              Open in first tab
            </DropdownMenuItem>
            <DropdownMenuItem @click="store.openServiceInSecondPanel(svc)">
              <PanelRight class="h-4 w-4" />
              Open in second tab
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div v-if="!loading && !filteredServices.length" class="px-2 py-2 text-xs text-muted-foreground">
        {{ serviceSearch ? "No matches" : "No services found" }}
      </div>
    </div>
    <!-- Spacer when collapsed so footer stays at bottom -->
    <div v-else class="flex-1 bg-card" />

    <!-- Footer -->
    <div class="space-y-1 border-t border-border bg-card p-2">
      <template v-if="!collapsed">
        <div class="rounded-md bg-muted/50 px-3 py-2 text-xs">
          <div class="font-medium text-foreground truncate">{{ profile }}</div>
          <div class="text-muted-foreground truncate">
            {{ region }} · {{ account }}
          </div>
        </div>
      </template>

      <div :class="collapsed ? '' : 'flex gap-1.5'">
        <Tooltip>
          <TooltipTrigger as-child>
            <Button variant="outline" size="sm" :class="collapsed ? 'w-full px-0 justify-center' : 'flex-1'"
              @click="$emit('logout')">
              <LogOut class="h-3.5 w-3.5 shrink-0" />
              <span v-if="!collapsed" class="ml-2">Sign out</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent v-if="collapsed" side="right">Sign out</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger as-child>
            <Button variant="outline" size="sm" :class="collapsed ? 'mt-1 w-full px-0 justify-center' : 'px-2.5'"
              @click="$emit('open-settings')">
              <Settings class="h-3.5 w-3.5 shrink-0" />
            </Button>
          </TooltipTrigger>
          <TooltipContent :side="collapsed ? 'right' : 'top'">Settings</TooltipContent>
        </Tooltip>
      </div>
    </div>

    <Dialog v-model:open="aliasOpen">
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rename service</DialogTitle>
          <DialogDescription>
            Optional display name. The chamber path does not change.
          </DialogDescription>
        </DialogHeader>
        <div class="space-y-2 py-2">
          <p class="font-mono text-xs break-all text-muted-foreground">{{ aliasTargetService }}</p>
          <Label for="alias-input">Alias</Label>
          <Input id="alias-input" v-model="aliasDraft" placeholder="e.g. prod-api" @keydown.enter.prevent="saveAlias" />
        </div>
        <DialogFooter class="gap-2 sm:gap-0">
          <Button type="button" variant="outline" @click="clearAlias">Clear</Button>
          <Button type="button" @click="saveAlias">Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Resize handle (max width = 50% window; drag past threshold collapses to rail) -->
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize sidebar"
      tabindex="-1"
      class="absolute right-0 top-0 z-20 h-full w-3 max-w-[12px] translate-x-1/2 cursor-col-resize touch-none hover:bg-primary/25"
      data-tauri-drag-region="false"
      @mousedown.prevent="startSidebarResize"
    />
  </aside>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Database,
  Loader2,
  LogOut,
  RefreshCw,
  Settings,
  MoreHorizontal,
  Pencil,
  PanelLeft,
  PanelRight,
} from "lucide-vue-next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useChamberStore } from "@/stores/chamber";

const props = defineProps<{
  services: string[];
  selectedService: string;
  openServices: string[];
  loading: boolean;
  profile: string;
  region: string;
  account: string;
}>();

defineEmits<{
  "select-service": [service: string];
  "refresh-services": [];
  logout: [];
  "open-settings": [];
}>();

const store = useChamberStore();

/** px */
const COLLAPSED_PX = 48;
const MIN_EXPANDED_PX = 200;
/** Below this width while dragging → collapse to rail */
const SNAP_COLLAPSE_BELOW = 168;
const DEFAULT_EXPANDED_PX = 256;
const SIDEBAR_PREFS_KEY = "chamber-ui.sidebar";

const collapsed = ref(false);
const expandedWidthPx = ref(DEFAULT_EXPANDED_PX);
const isResizing = ref(false);
const serviceSearch = ref("");

const aliasOpen = ref(false);
const aliasTargetService = ref("");
const aliasDraft = ref("");
/** Which service row has the ⋯ / actions menu open (also opened via right-click). */
const serviceActionsMenuFor = ref<string | null>(null);

function setServiceActionsMenuOpen(service: string, open: boolean) {
  if (open) serviceActionsMenuFor.value = service;
  else if (serviceActionsMenuFor.value === service) serviceActionsMenuFor.value = null;
}

function onServiceRowContextMenu(service: string) {
  serviceActionsMenuFor.value = service;
}

const filteredServices = computed(() => {
  const q = serviceSearch.value.trim().toLowerCase();
  if (!q) return props.services;
  return props.services.filter((s) => {
    const label = store.serviceLabel(s).toLowerCase();
    return s.toLowerCase().includes(q) || label.includes(q);
  });
});

function openAliasDialog(service: string) {
  aliasTargetService.value = service;
  aliasDraft.value = store.customAliasFor(service);
  aliasOpen.value = true;
}

function saveAlias() {
  if (!aliasTargetService.value) return;
  store.setServiceAlias(aliasTargetService.value, aliasDraft.value);
  aliasOpen.value = false;
}

function clearAlias() {
  if (!aliasTargetService.value) return;
  store.setServiceAlias(aliasTargetService.value, "");
  aliasOpen.value = false;
}

function maxSidebarPx(): number {
  return Math.max(MIN_EXPANDED_PX, Math.floor(window.innerWidth * 0.5));
}

function clampExpanded(w: number): number {
  return Math.round(Math.max(MIN_EXPANDED_PX, Math.min(maxSidebarPx(), w)));
}

function clampStoredWidthToWindow(): void {
  expandedWidthPx.value = clampExpanded(expandedWidthPx.value);
}

function persistSidebarPrefs(): void {
  try {
    localStorage.setItem(
      SIDEBAR_PREFS_KEY,
      JSON.stringify({
        collapsed: collapsed.value,
        expandedWidthPx: expandedWidthPx.value,
      }),
    );
  } catch {
    /* ignore */
  }
}

function toggleSidebarCollapsed(): void {
  collapsed.value = !collapsed.value;
  persistSidebarPrefs();
}

function loadSidebarPrefs(): void {
  try {
    const raw = localStorage.getItem(SIDEBAR_PREFS_KEY);
    if (!raw) return;
    const o = JSON.parse(raw) as { collapsed?: boolean; expandedWidthPx?: number };
    if (typeof o.expandedWidthPx === "number" && Number.isFinite(o.expandedWidthPx)) {
      expandedWidthPx.value = clampExpanded(o.expandedWidthPx);
    }
    if (typeof o.collapsed === "boolean") collapsed.value = o.collapsed;
  } catch {
    /* ignore */
  }
}

function startSidebarResize(downEvent: MouseEvent) {
  isResizing.value = true;
  const startX = downEvent.clientX;
  const startW = collapsed.value ? COLLAPSED_PX : expandedWidthPx.value;

  const onMove = (e: MouseEvent) => {
    const w = startW + (e.clientX - startX);
    if (w < SNAP_COLLAPSE_BELOW) {
      collapsed.value = true;
    } else {
      collapsed.value = false;
      expandedWidthPx.value = clampExpanded(Math.min(w, maxSidebarPx()));
    }
  };

  const onUp = () => {
    isResizing.value = false;
    persistSidebarPrefs();
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

onMounted(() => {
  loadSidebarPrefs();
  window.addEventListener("resize", clampStoredWidthToWindow);
});

onUnmounted(() => {
  window.removeEventListener("resize", clampStoredWidthToWindow);
});
</script>
