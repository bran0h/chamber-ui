<template>
  <aside
    class="ch-sidebar flex shrink-0 flex-col overflow-hidden border-r border-border bg-transparent transition-all duration-200 ease-in-out"
    :class="collapsed ? 'sidebar-narrow w-12' : 'w-64'">
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
          @click="collapsed = !collapsed"
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
          @click="collapsed = !collapsed"
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

      <button v-for="svc in filteredServices" :key="svc"
        class="w-full rounded-md text-sm text-left transition-colors flex items-center gap-2 px-3 py-2" :class="selectedService === svc
          ? 'bg-primary text-primary-foreground font-medium'
          : 'hover:bg-muted text-foreground'
          " @click="$emit('select-service', svc)" @contextmenu.prevent="openAliasDialog(svc)">
        <Database class="h-3.5 w-3.5 shrink-0" />
        <span class="truncate flex-1" :title="svc">{{ store.serviceLabel(svc) }}</span>
        <!-- Dot indicator: service is open as a tab but not currently selected -->
        <span v-if="openServices.includes(svc) && selectedService !== svc"
          class="h-1.5 w-1.5 rounded-full bg-primary/50 shrink-0" />
      </button>

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
          <DialogTitle>Service alias</DialogTitle>
          <DialogDescription>
            Optional short name for this service. The real chamber path stays the same.
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
  </aside>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Database,
  Loader2,
  LogOut,
  RefreshCw,
  Settings,
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

const collapsed = ref(false);
const serviceSearch = ref("");

const aliasOpen = ref(false);
const aliasTargetService = ref("");
const aliasDraft = ref("");

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
  aliasDraft.value = "";
  aliasOpen.value = false;
}
</script>
