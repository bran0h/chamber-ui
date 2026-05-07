<template>
  <TooltipProvider>
    <AuthView v-if="!store.isAuthenticated" />
    <SecretsView v-else />
  </TooltipProvider>
</template>

<script setup lang="ts">
import { useChamberStore } from "@/stores/chamber";
import { TooltipProvider } from "@/components/ui/tooltip";
import AuthView from "@/components/AuthView.vue";
import SecretsView from "@/components/SecretsView.vue";

const store = useChamberStore();
</script>
