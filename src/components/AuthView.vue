<template>
  <div class="flex min-h-0 flex-1 flex-col overflow-hidden">
    <div
      class="flex h-9 shrink-0 select-none items-center gap-1 border-b bg-card px-1 pr-2"
    >
      <div class="min-h-9 min-w-0 flex-1 self-stretch" data-tauri-drag-region />
      <div data-tauri-drag-region="false" class="flex shrink-0 items-center gap-1">
        <WindowTitleControls />
        <button
          type="button"
          class="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          @click="$emit('open-settings')"
        >
          <Settings class="h-4 w-4" />
        </button>
      </div>
    </div>
    <div class="relative flex min-h-0 flex-1 items-center justify-center bg-background p-6">
      <div class="w-full max-w-md space-y-6">
      <div class="space-y-2 text-center select-none pointer-events-none">
        <div class="flex justify-center">
          <img src="/logo.svg" class="h-16 w-16 dark:invert" alt="Chamber UI" />
        </div>
        <h1 class="text-2xl font-bold tracking-tight">Chamber UI</h1>
        <p class="text-sm text-muted-foreground">Connect to AWS to manage your secrets</p>
      </div>

      <Card>
        <CardContent class="pt-6 space-y-4">
          <div class="space-y-2">
            <Label for="profile">AWS Profile</Label>
            <Select v-model="store.selectedProfile" @update:model-value="store.loadProfileRegion($event as string)">
              <SelectTrigger id="profile">
                <SelectValue placeholder="Select profile" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="p in store.profiles" :key="p.name" :value="p.name">
                  {{ p.name }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div class="space-y-2">
            <Label for="region">AWS Region</Label>
            <Select id="region" v-model="store.region">
              <SelectTrigger>
                <SelectValue placeholder="Select region" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="r in regions" :key="r.value" :value="r.value">
                  {{ r.label }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <!-- SSO output box -->
          <div v-if="ssoOutput" class="rounded-md border bg-muted/50 px-3 py-2 text-xs font-mono whitespace-pre-wrap text-muted-foreground leading-relaxed">{{ ssoOutput }}</div>

          <!-- Error -->
          <div v-if="store.error" class="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {{ store.error }}
          </div>

          <!-- Actions -->
          <div class="space-y-2">
            <Button
              class="w-full"
              :disabled="store.loading || !store.selectedProfile"
              @click="connectDirect"
            >
              <Loader2 v-if="store.loading && !ssoRunning" class="mr-2 h-4 w-4 animate-spin" />
              <LogIn v-else class="mr-2 h-4 w-4" />
              Connect
            </Button>

            <Button
              variant="outline"
              class="w-full"
              :disabled="store.loading || !store.selectedProfile"
              @click="loginSSO"
            >
              <Loader2 v-if="ssoRunning" class="mr-2 h-4 w-4 animate-spin" />
              <Globe v-else class="mr-2 h-4 w-4" />
              {{ ssoRunning ? "Waiting for browser login…" : "Login with AWS SSO" }}
            </Button>
          </div>

          <p class="text-center text-xs text-muted-foreground">
            SSO opens your browser for authentication, then connects automatically.
          </p>
        </CardContent>
      </Card>
    </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { LogIn, Loader2, Globe, Settings } from "lucide-vue-next";
import { useChamberStore } from "@/stores/chamber";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import WindowTitleControls from "@/components/WindowTitleControls.vue";

const regions = [
  { value: "us-east-1",      label: "us-east-1 — US East (N. Virginia)" },
  { value: "us-east-2",      label: "us-east-2 — US East (Ohio)" },
  { value: "us-west-1",      label: "us-west-1 — US West (N. California)" },
  { value: "us-west-2",      label: "us-west-2 — US West (Oregon)" },
  { value: "ca-central-1",   label: "ca-central-1 — Canada (Central)" },
  { value: "eu-central-1",   label: "eu-central-1 — Europe (Frankfurt)" },
  { value: "eu-west-1",      label: "eu-west-1 — Europe (Ireland)" },
  { value: "eu-west-2",      label: "eu-west-2 — Europe (London)" },
  { value: "eu-west-3",      label: "eu-west-3 — Europe (Paris)" },
  { value: "eu-north-1",     label: "eu-north-1 — Europe (Stockholm)" },
  { value: "eu-south-1",     label: "eu-south-1 — Europe (Milan)" },
  { value: "ap-northeast-1", label: "ap-northeast-1 — Asia Pacific (Tokyo)" },
  { value: "ap-northeast-2", label: "ap-northeast-2 — Asia Pacific (Seoul)" },
  { value: "ap-northeast-3", label: "ap-northeast-3 — Asia Pacific (Osaka)" },
  { value: "ap-southeast-1", label: "ap-southeast-1 — Asia Pacific (Singapore)" },
  { value: "ap-southeast-2", label: "ap-southeast-2 — Asia Pacific (Sydney)" },
  { value: "ap-south-1",     label: "ap-south-1 — Asia Pacific (Mumbai)" },
  { value: "sa-east-1",      label: "sa-east-1 — South America (São Paulo)" },
  { value: "me-south-1",     label: "me-south-1 — Middle East (Bahrain)" },
  { value: "af-south-1",     label: "af-south-1 — Africa (Cape Town)" },
];

defineEmits<{ "open-settings": [] }>();

const store = useChamberStore();
const ssoRunning = ref(false);
const ssoOutput = ref("");

onMounted(() => {
  store.loadProfiles();
});

async function connectDirect() {
  ssoOutput.value = "";
  await store.authenticate();
}

async function loginSSO() {
  ssoOutput.value = "";
  ssoRunning.value = true;
  store.error = "";
  try {
    const output = await store.ssoLogin();
    ssoOutput.value = output || "SSO login successful.";
    // After SSO succeeds, try to connect
    await store.authenticate();
  } catch {
    // error already set by store
  } finally {
    ssoRunning.value = false;
  }
}
</script>
