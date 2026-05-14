<template>
  <div class="ch-tauri-root flex h-screen min-h-0 flex-col overflow-hidden">
    <div class="flex min-h-0 min-w-0 flex-1 overflow-hidden">
      <AppSidebar :services="store.services" :selected-service="store.selectedService"
        :open-services="store.tabs.map((t) => t.service)" :loading="store.loading" :profile="store.selectedProfile"
        :region="store.region" :account="store.authAccount" @select-service="store.openTab"
        @refresh-services="store.loadServices" @logout="store.logout" @open-settings="$emit('open-settings')" />

      <main class="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background">
        <!-- Tab strip + window drag region + custom window controls (frameless) -->
        <div class="ch-tab-titlebar flex h-[49px] shrink-0 items-center gap-1 border-b bg-card px-2">
          <!-- Tab list -->
          <div class="scrollbar-none flex min-h-0 min-w-0 flex-1 items-center gap-1 overflow-x-auto">
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

        <!-- Content area -->
        <div class="flex min-h-0 flex-1 overflow-hidden">
          <!-- Left panel -->
          <div class="flex flex-1 flex-col overflow-hidden" :class="store.splitView ? 'border-r' : ''"
            @mousedown="store.setFocusedSide('left')">
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
          </div>

          <!-- Right panel -->
          <div v-if="store.splitView" class="flex flex-1 flex-col overflow-hidden"
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
import { ref } from "vue";
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
