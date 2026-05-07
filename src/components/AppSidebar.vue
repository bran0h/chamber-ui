<template>
  <aside
    class="flex flex-col border-r bg-card transition-all duration-200 ease-in-out overflow-hidden shrink-0"
    :class="collapsed ? 'w-12' : 'w-64'"
  >
    <!-- Header -->
    <div class="flex items-center border-b h-[49px]" :class="collapsed ? 'justify-center' : 'px-3 gap-2'">
      <template v-if="!collapsed">
        <KeyRound class="h-5 w-5 text-primary shrink-0" />
        <span class="font-semibold text-sm truncate flex-1">Chamber UI</span>
      </template>
      <button
        class="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        :class="collapsed ? '' : 'ml-auto'"
        @click="collapsed = !collapsed"
      >
        <ChevronLeft v-if="!collapsed" class="h-4 w-4" />
        <ChevronRight v-else class="h-4 w-4" />
      </button>
    </div>

    <!-- Search + refresh (expanded only) -->
    <div v-if="!collapsed" class="px-3 pt-3 pb-2 flex items-center gap-1.5">
      <div class="relative flex-1">
        <Search class="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input v-model="serviceSearch" placeholder="Filter services…" class="pl-8 h-8 text-sm" />
      </div>
      <Tooltip>
        <TooltipTrigger as-child>
          <Button variant="outline" size="icon" class="h-8 w-8 shrink-0" :disabled="loading" @click="$emit('refresh-services')">
            <RefreshCw class="h-3.5 w-3.5" :class="loading ? 'animate-spin' : ''" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Refresh services</TooltipContent>
      </Tooltip>
    </div>

    <!-- Service list (hidden when collapsed) -->
    <div v-if="!collapsed" class="flex-1 overflow-y-auto px-3 pb-3">
      <div v-if="loading && !services.length" class="flex justify-center py-4">
        <Loader2 class="h-5 w-5 animate-spin text-muted-foreground" />
      </div>

      <button
        v-for="svc in filteredServices"
        :key="svc"
        class="w-full rounded-md text-sm text-left transition-colors flex items-center gap-2 px-3 py-2"
        :class="selectedService === svc
          ? 'bg-primary text-primary-foreground font-medium'
          : 'hover:bg-muted text-foreground'"
        @click="$emit('select-service', svc)"
      >
        <Database class="h-3.5 w-3.5 shrink-0" />
        <span class="truncate">{{ svc }}</span>
      </button>

      <div v-if="!loading && !filteredServices.length" class="px-2 py-2 text-xs text-muted-foreground">
        {{ serviceSearch ? "No matches" : "No services found" }}
      </div>
    </div>
    <!-- Spacer when collapsed so footer stays at bottom -->
    <div v-else class="flex-1" />

    <!-- Footer -->
    <div class="border-t p-2 space-y-1">
      <template v-if="!collapsed">
        <div class="rounded-md bg-muted/50 px-3 py-2 text-xs">
          <div class="font-medium text-foreground truncate">{{ profile }}</div>
          <div class="text-muted-foreground truncate">{{ region }} · {{ account }}</div>
        </div>
      </template>

      <Tooltip>
        <TooltipTrigger as-child>
          <Button
            variant="outline"
            size="sm"
            class="w-full"
            :class="collapsed ? 'px-0 justify-center' : ''"
            @click="$emit('logout')"
          >
            <LogOut class="h-3.5 w-3.5 shrink-0" />
            <span v-if="!collapsed" class="ml-2">Sign out</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent v-if="collapsed" side="right">Sign out</TooltipContent>
      </Tooltip>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { KeyRound, ChevronLeft, ChevronRight, Search, Database, Loader2, LogOut, RefreshCw } from "lucide-vue-next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const props = defineProps<{
  services: string[];
  selectedService: string;
  loading: boolean;
  profile: string;
  region: string;
  account: string;
}>();

defineEmits<{
  "select-service": [service: string];
  "refresh-services": [];
  logout: [];
}>();

const collapsed = ref(false);
const serviceSearch = ref("");

const filteredServices = computed(() =>
  serviceSearch.value
    ? props.services.filter((s) => s.toLowerCase().includes(serviceSearch.value.toLowerCase()))
    : props.services
);
</script>
