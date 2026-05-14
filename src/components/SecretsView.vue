<template>
  <div class="flex h-screen overflow-hidden bg-background">
    <AppSidebar
      :services="store.services"
      :selected-service="store.selectedService"
      :open-services="store.tabs.map((t) => t.service)"
      :loading="store.loading"
      :profile="store.selectedProfile"
      :region="store.region"
      :account="store.authAccount"
      @select-service="store.openTab"
      @refresh-services="store.loadServices"
      @logout="store.logout"
      @open-settings="$emit('open-settings')"
    />

    <main class="flex flex-1 flex-col overflow-hidden">
      <!-- Tab bar -->
      <div
        class="flex items-center border-b bg-card shrink-0 h-[49px] px-2 gap-1"
      >
        <!-- Tab list -->
        <div class="flex items-center gap-1 flex-1 overflow-x-auto min-w-0">
          <div
            v-for="tab in store.tabs"
            :key="tab.id"
            class="flex items-center gap-1.5 shrink-0 rounded-md px-2.5 py-1 text-sm cursor-pointer transition-colors group select-none"
            :class="
              isTabActive(tab.id)
                ? 'bg-muted text-foreground font-medium'
                : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
            "
            @click="handleTabClick(tab.id)"
          >
            <Database class="h-3.5 w-3.5 shrink-0 opacity-60" />
            <span class="max-w-[160px] truncate">{{ tab.service }}</span>
            <button
              class="rounded p-0.5 opacity-0 group-hover:opacity-100 hover:bg-muted-foreground/20 transition-opacity ml-0.5"
              @click.stop="store.closeTab(tab.id)"
            >
              <X class="h-3 w-3" />
            </button>
          </div>

          <span
            v-if="!store.tabs.length"
            class="text-xs text-muted-foreground px-2 select-none"
          >
            Select a service to open a tab
          </span>
        </div>

        <!-- Split view toggle -->
        <Tooltip>
          <TooltipTrigger as-child>
            <Button
              variant="ghost"
              size="icon"
              class="h-7 w-7 shrink-0"
              :class="store.splitView ? 'text-primary bg-primary/10' : ''"
              @click="store.toggleSplit()"
            >
              <Columns2 class="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {{ store.splitView ? "Disable split view" : "Enable split view" }}
          </TooltipContent>
        </Tooltip>
      </div>

      <!-- Content area -->
      <div class="flex flex-1 overflow-hidden">
        <!-- Left panel -->
        <div
          class="flex flex-col overflow-hidden flex-1"
          :class="store.splitView ? 'border-r' : ''"
          @mousedown="store.setFocusedSide('left')"
        >
          <div
            v-if="store.splitView"
            class="flex items-center gap-1 px-3 h-8 shrink-0 border-b text-xs font-medium transition-colors"
            :class="
              store.focusedSide === 'left'
                ? 'text-primary border-b-primary/30 bg-primary/5'
                : 'text-muted-foreground'
            "
          >
            <PanelLeft class="h-3 w-3" />
            Left
          </div>
          <ServicePanel
            :tab-id="store.activeTabId"
            :focused="store.focusedSide === 'left'"
            @toast="showToast"
            @focus="store.setFocusedSide('left')"
          />
        </div>

        <!-- Right panel -->
        <div
          v-if="store.splitView"
          class="flex flex-col overflow-hidden flex-1"
          @mousedown="store.setFocusedSide('right')"
        >
          <div
            class="flex items-center gap-1 px-3 h-8 shrink-0 border-b text-xs font-medium transition-colors"
            :class="
              store.focusedSide === 'right'
                ? 'text-primary border-b-primary/30 bg-primary/5'
                : 'text-muted-foreground'
            "
          >
            <PanelRight class="h-3 w-3" />
            Right
          </div>
          <ServicePanel
            :tab-id="store.splitTabId"
            :focused="store.focusedSide === 'right'"
            @toast="showToast"
            @focus="store.setFocusedSide('right')"
          />
        </div>
      </div>
    </main>

    <!-- Toast -->
    <Transition name="fade">
      <div
        v-if="toast.message"
        class="fixed bottom-4 right-4 rounded-md px-4 py-2 text-sm shadow-lg z-50 max-w-sm"
        :class="
          toast.type === 'error'
            ? 'bg-destructive text-destructive-foreground'
            : 'bg-foreground text-background'
        "
      >
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
