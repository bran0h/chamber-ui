<template>
  <div class="flex flex-col flex-1 overflow-hidden">
    <!-- Search bar -->
    <div class="border-b px-6 py-2 bg-card shrink-0">
      <div class="relative max-w-xs">
        <Search
          class="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          v-model="search"
          placeholder="Filter secrets…"
          class="pl-8 h-8 text-sm"
        />
      </div>
    </div>

    <!-- Table -->
    <div class="flex-1 overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead class="w-[40%]">Key</TableHead>
            <TableHead>Value</TableHead>
            <TableHead class="w-24 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <!-- Skeleton -->
          <template v-if="loading">
            <TableRow v-for="i in 6" :key="i">
              <TableCell
                ><div class="h-4 w-40 rounded bg-muted animate-pulse"
              /></TableCell>
              <TableCell
                ><div class="h-4 w-24 rounded bg-muted animate-pulse"
              /></TableCell>
              <TableCell />
            </TableRow>
          </template>

          <!-- Data -->
          <template v-else-if="filteredSecrets.length">
            <TableRow
              v-for="secret in filteredSecrets"
              :key="secret.key"
              class="group"
            >
              <TableCell class="font-mono text-sm font-medium">{{
                secret.key
              }}</TableCell>
              <TableCell>
                <div class="flex items-center gap-2">
                  <span class="font-mono text-sm truncate max-w-xs">
                    {{ revealed.has(secret.key) ? secret.value : "••••••••" }}
                  </span>
                  <button
                    class="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                    @click="toggleReveal(secret.key)"
                  >
                    <Eye v-if="!revealed.has(secret.key)" class="h-3.5 w-3.5" />
                    <EyeOff v-else class="h-3.5 w-3.5" />
                  </button>
                </div>
              </TableCell>
              <TableCell class="text-right">
                <div
                  class="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Tooltip>
                    <TooltipTrigger as-child>
                      <Button
                        variant="ghost"
                        size="icon"
                        class="h-7 w-7"
                        @click="$emit('copy', secret.value)"
                      >
                        <Copy class="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Copy value</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger as-child>
                      <Button
                        variant="ghost"
                        size="icon"
                        class="h-7 w-7"
                        @click="$emit('edit', secret)"
                      >
                        <Pencil class="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Edit</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger as-child>
                      <Button
                        variant="ghost"
                        size="icon"
                        class="h-7 w-7 text-destructive hover:text-destructive"
                        @click="$emit('delete', secret.key)"
                      >
                        <Trash2 class="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Delete</TooltipContent>
                  </Tooltip>
                </div>
              </TableCell>
            </TableRow>
          </template>

          <!-- Empty -->
          <TableRow v-else>
            <TableCell colspan="3">
              <div
                class="flex flex-col items-center justify-center py-12 text-muted-foreground space-y-2"
              >
                <ShieldOff class="h-8 w-8 opacity-30" />
                <p class="text-sm">
                  {{
                    search
                      ? "No secrets match your filter"
                      : "No secrets in this service"
                  }}
                </p>
              </div>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import {
  Search,
  Eye,
  EyeOff,
  Copy,
  Pencil,
  Trash2,
  ShieldOff,
} from "lucide-vue-next";
import type { Secret } from "@/stores/chamber";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const props = defineProps<{
  secrets: Secret[];
  loading: boolean;
}>();

defineEmits<{
  copy: [value: string];
  edit: [secret: Secret];
  delete: [key: string];
}>();

const search = ref("");
const revealed = ref(new Set<string>());

const filteredSecrets = computed(() =>
  search.value
    ? props.secrets.filter((s) =>
        s.key.toLowerCase().includes(search.value.toLowerCase()),
      )
    : props.secrets,
);

function toggleReveal(key: string) {
  const next = new Set(revealed.value);
  next.has(key) ? next.delete(key) : next.add(key);
  revealed.value = next;
}
</script>
