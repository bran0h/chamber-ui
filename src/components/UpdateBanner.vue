<template>
  <Transition name="slide">
    <div
      v-if="state !== 'idle'"
      class="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[420px] max-w-[calc(100vw-2rem)] rounded-lg border bg-card shadow-lg text-sm"
    >
      <!-- Available -->
      <div v-if="state === 'available'" class="flex items-center gap-3 px-4 py-3">
        <Download class="h-4 w-4 shrink-0 text-primary" />
        <div class="flex-1 min-w-0">
          <p class="font-medium">Update available — v{{ updateVersion }}</p>
          <p v-if="updateBody" class="text-xs text-muted-foreground truncate">{{ updateBody }}</p>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <Button size="sm" class="h-7 text-xs" @click="install">Install & Restart</Button>
          <button class="text-muted-foreground hover:text-foreground" @click="state = 'idle'">
            <X class="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <!-- Downloading -->
      <div v-else-if="state === 'downloading'" class="px-4 py-3 space-y-2">
        <div class="flex items-center gap-3">
          <Loader2 class="h-4 w-4 shrink-0 text-primary animate-spin" />
          <span class="font-medium flex-1">Downloading update…</span>
          <span class="text-xs text-muted-foreground tabular-nums">
            {{ progress !== null ? `${progress}%` : '' }}
          </span>
        </div>
        <div class="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            class="h-full bg-primary rounded-full transition-all duration-300"
            :style="{ width: `${progress ?? 0}%` }"
          />
        </div>
      </div>

      <!-- Error -->
      <div v-else-if="state === 'error'" class="flex items-center gap-3 px-4 py-3">
        <AlertCircle class="h-4 w-4 shrink-0 text-destructive" />
        <p class="flex-1 text-destructive">Update failed — please try again later.</p>
        <button class="text-muted-foreground hover:text-foreground" @click="state = 'idle'">
          <X class="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { Download, Loader2, AlertCircle, X } from "lucide-vue-next";
import { Button } from "@/components/ui/button";

type State = "idle" | "available" | "downloading" | "error";

const state = ref<State>("idle");
const updateVersion = ref("");
const updateBody = ref("");
const progress = ref<number | null>(null);
let pendingUpdate: Update | null = null;

onMounted(async () => {
  // Small delay so the app finishes rendering before the network call
  await new Promise((r) => setTimeout(r, 2000));
  try {
    const result = await check();
    if (result) {
      pendingUpdate = result;
      updateVersion.value = result.version;
      updateBody.value = result.body ?? "";
      state.value = "available";
    }
  } catch {
    // Silently ignore — no connection or endpoint not set up yet
  }
});

async function install() {
  if (!pendingUpdate) return;
  state.value = "downloading";
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
  } catch (e) {
    console.error("[updater] install failed:", e);
    state.value = "error";
  }
}
</script>

<style scoped>
.slide-enter-active,
.slide-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}
.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(8px);
}
</style>
