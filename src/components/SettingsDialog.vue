<template>
  <Dialog :open="open" @update:open="$emit('update:open', $event)">
    <DialogContent class="sm:max-w-sm">
      <DialogHeader>
        <DialogTitle>Settings</DialogTitle>
      </DialogHeader>

      <div class="space-y-6 py-1">
        <!-- Appearance -->
        <section class="space-y-2">
          <p class="text-sm font-medium">Appearance</p>
          <div class="grid grid-cols-3 gap-2">
            <button
              v-for="opt in themeOptions"
              :key="opt.value"
              class="flex flex-col items-center gap-2 rounded-md border py-3 text-xs transition-colors"
              :class="
                theme === opt.value
                  ? 'border-primary bg-primary/5 text-foreground font-medium'
                  : 'border-border text-muted-foreground hover:bg-muted'
              "
              @click="setTheme(opt.value)"
            >
              <component :is="opt.icon" class="h-4 w-4" />
              {{ opt.label }}
            </button>
          </div>
        </section>

        <!-- Updates -->
        <section class="space-y-2">
          <p class="text-sm font-medium">Updates</p>
          <div class="rounded-md border divide-y text-sm">
            <div class="flex items-center justify-between px-3 py-2.5">
              <span class="text-muted-foreground">Current version</span>
              <span class="font-mono text-xs">v{{ appVersion }}</span>
            </div>

            <div class="px-3 py-2.5 space-y-2.5">
              <!-- Status line -->
              <div class="flex items-center gap-2 text-muted-foreground min-h-[1.25rem]">
                <Loader2 v-if="updateState === 'checking'" class="h-3.5 w-3.5 animate-spin shrink-0" />
                <CheckCircle2 v-else-if="updateState === 'latest'" class="h-3.5 w-3.5 text-green-500 shrink-0" />
                <Download v-else-if="updateState === 'available'" class="h-3.5 w-3.5 text-primary shrink-0" />
                <AlertCircle v-else-if="updateState === 'error'" class="h-3.5 w-3.5 text-destructive shrink-0" />

                <span
                  :class="{
                    'text-foreground font-medium': updateState === 'available',
                    'text-destructive': updateState === 'error',
                  }"
                >
                  <template v-if="updateState === 'idle'">—</template>
                  <template v-else-if="updateState === 'checking'">Checking…</template>
                  <template v-else-if="updateState === 'latest'">You're on the latest version</template>
                  <template v-else-if="updateState === 'available'">v{{ availableVersion }} available</template>
                  <template v-else-if="updateState === 'downloading'">
                    Downloading… {{ progress !== null ? `${progress}%` : '' }}
                  </template>
                  <template v-else-if="updateState === 'error'">Failed to check for updates</template>
                </span>
              </div>

              <!-- Progress bar -->
              <div v-if="updateState === 'downloading'" class="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  class="h-full bg-primary rounded-full transition-all duration-300"
                  :style="{ width: `${progress ?? 0}%` }"
                />
              </div>

              <!-- Action buttons -->
              <div class="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  class="flex-1 h-8"
                  :disabled="updateState === 'checking' || updateState === 'downloading'"
                  @click="checkForUpdates"
                >
                  Check for updates
                </Button>
                <Button
                  v-if="updateState === 'available'"
                  size="sm"
                  class="h-8"
                  @click="installUpdate"
                >
                  Install & Restart
                </Button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { getVersion } from "@tauri-apps/api/app";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { Sun, Moon, Monitor, Loader2, CheckCircle2, Download, AlertCircle } from "lucide-vue-next";
import { useTheme, type Theme } from "@/composables/useTheme";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

defineProps<{ open: boolean }>();
defineEmits<{ "update:open": [value: boolean] }>();

const { theme, setTheme } = useTheme();

const themeOptions: { value: Theme; label: string; icon: unknown }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

const appVersion = ref("…");
const updateState = ref<"idle" | "checking" | "latest" | "available" | "downloading" | "error">("idle");
const availableVersion = ref("");
const progress = ref<number | null>(null);
let pendingUpdate: Update | null = null;

onMounted(async () => {
  appVersion.value = await getVersion();
});

async function checkForUpdates() {
  updateState.value = "checking";
  try {
    const result = await check();
    if (result) {
      pendingUpdate = result;
      availableVersion.value = result.version;
      updateState.value = "available";
    } else {
      updateState.value = "latest";
    }
  } catch {
    updateState.value = "error";
  }
}

async function installUpdate() {
  if (!pendingUpdate) return;
  updateState.value = "downloading";
  progress.value = 0;
  let downloaded = 0;
  let total = 0;
  try {
    await pendingUpdate.downloadAndInstall((event) => {
      if (event.event === "Started") {
        total = event.data.contentLength ?? 0;
      } else if (event.event === "Progress") {
        downloaded += event.data.chunkLength;
        progress.value = total > 0 ? Math.round((downloaded / total) * 100) : null;
      }
    });
    await relaunch();
  } catch {
    updateState.value = "error";
  }
}
</script>
