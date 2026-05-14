<template>
  <TooltipProvider>
    <!-- Single shell: h-dvh avoids broken % height through the tooltip provider (restores rounded frameless chrome). -->
    <div
      class="ch-tauri-root flex h-dvh max-h-dvh min-h-0 flex-col overflow-hidden"
    >
      <AuthView v-if="!store.isAuthenticated" @open-settings="settingsOpen = true" />
      <SecretsView v-else @open-settings="settingsOpen = true" />
      <SettingsDialog :open="settingsOpen" @update:open="settingsOpen = $event" />
      <UpdateBanner />
    </div>
  </TooltipProvider>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useChamberStore } from "@/stores/chamber";
import { useTheme } from "@/composables/useTheme";
import { TooltipProvider } from "@/components/ui/tooltip";
import AuthView from "@/components/AuthView.vue";
import SecretsView from "@/components/SecretsView.vue";
import SettingsDialog from "@/components/SettingsDialog.vue";
import UpdateBanner from "@/components/UpdateBanner.vue";

const store = useChamberStore();
const { init } = useTheme();
const settingsOpen = ref(false);


onMounted(init);
</script>
