<template>
  <div class="flex flex-col flex-1 overflow-hidden min-w-0">
    <!-- Search bar -->
    <div class="border-b px-4 py-2 bg-card shrink-0">
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
    <div ref="tableWrapRef" class="flex-1 overflow-auto">
      <Table class="min-w-[480px] table-fixed">
        <colgroup>
          <col :style="{ width: keyColPercent + '%' }" />
          <col />
          <col style="width: 88px" />
        </colgroup>
        <TableHeader>
          <TableRow>
            <TableHead class="relative">
              <span class="pr-3">Key</span>
              <div
                role="separator"
                aria-orientation="vertical"
                aria-label="Resize columns"
                tabindex="-1"
                class="absolute right-0 top-0 z-10 h-full w-3 max-w-[12px] -translate-x-1/2 cursor-col-resize touch-none hover:bg-primary/15"
                @mousedown.prevent="startKeyColResize"
              />
            </TableHead>
            <TableHead>Value</TableHead>
            <TableHead class="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <!-- Skeleton -->
          <template v-if="loading">
            <TableRow v-for="i in 6" :key="i">
              <TableCell class="max-w-0 overflow-hidden">
                <div class="h-4 max-w-full rounded bg-muted animate-pulse" />
              </TableCell>
              <TableCell class="max-w-0 overflow-hidden">
                <div class="h-4 max-w-full rounded bg-muted animate-pulse" />
              </TableCell>
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
              <TableCell class="max-w-0 overflow-hidden font-mono text-sm font-medium">
                <div class="truncate" :title="secret.key">{{ secret.key }}</div>
              </TableCell>
              <TableCell class="max-w-0 overflow-hidden">
                <div class="flex min-w-0 items-center gap-2">
                  <span
                    class="min-w-0 flex-1 truncate font-mono text-sm"
                    :title="revealed.has(secret.key) ? secret.value : ''"
                  >
                    {{ revealed.has(secret.key) ? secret.value : "••••••••" }}
                  </span>
                  <button
                    class="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                    @click="toggleReveal(secret.key)"
                  >
                    <Eye v-if="!revealed.has(secret.key)" class="h-3.5 w-3.5" />
                    <EyeOff v-else class="h-3.5 w-3.5" />
                  </button>
                </div>
              </TableCell>
              <TableCell class="text-right">
                <div class="flex items-center justify-end gap-1">
                  <Tooltip>
                    <TooltipTrigger as-child>
                      <Button
                        variant="ghost"
                        size="icon"
                        class="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
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
                        class="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
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
                        class="h-7 w-7 text-destructive hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
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
import { ref, computed, watch, onMounted, nextTick } from "vue";
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
  revealAll: boolean;
}>();

defineEmits<{
  copy: [value: string];
  edit: [secret: Secret];
  delete: [key: string];
}>();

const KEY_COL_STORAGE = "chamber-ui.secretsTable.keyColPct";
const ACTIONS_COL_PX = 88;

const search = ref("");
const revealed = ref(new Set<string>());
const tableWrapRef = ref<HTMLElement | null>(null);
/** Width share for the Key column; Value fills the rest (Actions stays 88px). */
const keyColPercent = ref(40);

function clampKeyColPercent(pct: number, tableWidthPx: number): number {
  if (tableWidthPx <= 0) return pct;
  const actionsPct = (ACTIONS_COL_PX / tableWidthPx) * 100;
  const minKey = 14;
  const maxKey = Math.max(minKey + 1, 100 - actionsPct - 18);
  return Math.round(Math.min(maxKey, Math.max(minKey, pct)));
}

onMounted(async () => {
  await nextTick();
  try {
    const raw = localStorage.getItem(KEY_COL_STORAGE);
    if (raw == null) return;
    const n = Number(raw);
    if (!Number.isFinite(n)) return;
    const w =
      tableWrapRef.value?.querySelector("table")?.getBoundingClientRect().width ?? 640;
    keyColPercent.value = clampKeyColPercent(n, w);
  } catch {
    /* ignore */
  }
});

watch(keyColPercent, (v) => {
  try {
    localStorage.setItem(KEY_COL_STORAGE, String(v));
  } catch {
    /* ignore */
  }
});

function startKeyColResize(downEvent: MouseEvent) {
  const table = tableWrapRef.value?.querySelector("table");
  if (!table) return;
  const startX = downEvent.clientX;
  const startPct = keyColPercent.value;
  const tableW = table.getBoundingClientRect().width;
  if (tableW <= 0) return;

  const onMove = (e: MouseEvent) => {
    const dx = e.clientX - startX;
    const deltaPct = (dx / tableW) * 100;
    keyColPercent.value = clampKeyColPercent(startPct + deltaPct, tableW);
  };
  const onUp = () => {
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

const filteredSecrets = computed(() =>
  search.value
    ? props.secrets.filter((s) =>
        s.key.toLowerCase().includes(search.value.toLowerCase()),
      )
    : props.secrets,
);

watch(
  () => props.revealAll,
  (val) => {
    revealed.value = val
      ? new Set(props.secrets.map((s) => s.key))
      : new Set();
  },
);

function toggleReveal(key: string) {
  const next = new Set(revealed.value);
  next.has(key) ? next.delete(key) : next.add(key);
  revealed.value = next;
}
</script>
