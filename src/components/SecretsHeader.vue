<template>
  <div
    class="flex items-center justify-between border-b px-4 py-3 bg-card shrink-0 gap-3 min-w-0"
  >
    <div class="min-w-0 flex-1">
      <h2 class="truncate font-semibold" :title="service">{{ displayName }}</h2>
      <p class="text-xs text-muted-foreground">
        <span
          v-if="loading"
          class="inline-block h-3 w-12 rounded bg-muted animate-pulse align-middle"
        />
        <template v-else>{{ count }} secret{{ count !== 1 ? "s" : "" }}</template>
      </p>
    </div>

    <div class="flex items-center gap-2 shrink-0">
      <Tooltip>
        <TooltipTrigger as-child>
          <Button
            variant="outline"
            size="icon"
            class="h-8 w-8"
            :disabled="loading || count === 0"
            @click="$emit('toggle-reveal-all')"
          >
            <EyeOff v-if="revealAll" class="h-3.5 w-3.5" />
            <Eye v-else class="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{{
          revealAll ? "Hide all values" : "Show all values"
        }}</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger as-child>
          <Button
            variant="outline"
            size="icon"
            class="h-8 w-8"
            :disabled="loading"
            @click="$emit('refresh')"
          >
            <RefreshCw
              class="h-3.5 w-3.5"
              :class="loading ? 'animate-spin' : ''"
            />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Refresh</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger as-child>
          <Button
            variant="outline"
            size="icon"
            class="h-8 w-8"
            :disabled="loading || count === 0"
            @click="$emit('export-env')"
          >
            <Clipboard class="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Export as .env</TooltipContent>
      </Tooltip>

      <Button size="sm" class="h-8" @click="$emit('add')">
        <Plus class="h-3.5 w-3.5" />
        <span class="ml-1.5">Add</span>
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Eye, EyeOff, RefreshCw, Clipboard, Plus } from "lucide-vue-next";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

defineProps<{
  service: string;
  displayName: string;
  count: number;
  loading: boolean;
  revealAll: boolean;
}>();

defineEmits<{
  refresh: [];
  "export-env": [];
  add: [];
  "toggle-reveal-all": [];
}>();
</script>
