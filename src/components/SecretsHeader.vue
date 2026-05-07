<template>
  <div class="flex items-center justify-between border-b px-6 py-3 bg-card shrink-0">
    <div>
      <h2 class="font-semibold">{{ service }}</h2>
      <p class="text-xs text-muted-foreground">
        <span v-if="loading" class="inline-block h-3 w-12 rounded bg-muted animate-pulse align-middle" />
        <template v-else>{{ count }} secret{{ count !== 1 ? "s" : "" }}</template>
      </p>
    </div>

    <div class="flex items-center gap-2">
      <Tooltip>
        <TooltipTrigger as-child>
          <Button variant="outline" size="sm" :disabled="loading" @click="$emit('refresh')">
            <RefreshCw class="h-3.5 w-3.5" :class="loading ? 'animate-spin' : ''" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Refresh</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger as-child>
          <Button variant="outline" size="sm" :disabled="loading || count === 0" @click="$emit('export-env')">
            <Clipboard class="h-3.5 w-3.5" />
            <span class="ml-1.5 hidden sm:inline">Export .env</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>Copy all as .env to clipboard</TooltipContent>
      </Tooltip>

      <Button size="sm" @click="$emit('add')">
        <Plus class="mr-1.5 h-3.5 w-3.5" />
        Add Secret
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { RefreshCw, Clipboard, Plus } from "lucide-vue-next";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

defineProps<{
  service: string;
  count: number;
  loading: boolean;
}>();

defineEmits<{
  refresh: [];
  "export-env": [];
  add: [];
}>();
</script>
