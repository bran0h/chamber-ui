<template>
  <div class="flex h-screen overflow-hidden bg-background">
    <AppSidebar
      :services="store.services"
      :selected-service="store.selectedService"
      :loading="store.loading"
      :profile="store.selectedProfile"
      :region="store.region"
      :account="store.authAccount"
      @select-service="store.selectService"
      @refresh-services="store.loadServices"
      @logout="store.logout"
    />

    <main class="flex flex-1 flex-col overflow-hidden">
      <!-- Empty state -->
      <div v-if="!store.selectedService" class="flex flex-1 items-center justify-center text-muted-foreground">
        <div class="text-center space-y-2">
          <Database class="mx-auto h-10 w-10 opacity-30" />
          <p class="text-sm">Select a service to view secrets</p>
        </div>
      </div>

      <template v-else>
        <SecretsHeader
          :service="store.selectedService"
          :count="store.secrets.length"
          :loading="store.secretsLoading"
          @refresh="store.loadSecrets"
          @export-env="exportEnv"
          @add="openAdd"
        />
        <SecretsTable
          :secrets="store.secrets"
          :loading="store.secretsLoading"
          @copy="copyValue"
          @edit="openEdit"
          @delete="confirmDelete"
        />
      </template>
    </main>

    <!-- Toast -->
    <Transition name="fade">
      <div
        v-if="toast.message"
        class="fixed bottom-4 right-4 rounded-md px-4 py-2 text-sm shadow-lg z-50 max-w-sm"
        :class="toast.type === 'error'
          ? 'bg-destructive text-destructive-foreground'
          : 'bg-foreground text-background'"
      >
        {{ toast.message }}
      </div>
    </Transition>

    <!-- Add / Edit dialog -->
    <SecretDialog
      v-if="dialogOpen"
      :open="dialogOpen"
      :initial-key="editSecret?.key"
      :initial-value="editSecret?.value"
      @update:open="dialogOpen = $event"
      @saved="showToast('Secret saved')"
      @error="showToast($event, 'error')"
    />

    <!-- Delete confirmation -->
    <AlertDialog :open="!!deleteKey" @update:open="deleteKey = ''">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete secret</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete
            <code class="font-mono font-semibold">{{ deleteKey }}</code>?
            This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel @click="deleteKey = ''">Cancel</AlertDialogCancel>
          <AlertDialogAction
            class="bg-destructive text-destructive-foreground hover:bg-destructive/90 flex items-center gap-2"
            :disabled="deleting"
            @click.prevent="doDelete"
          >
            <Loader2 v-if="deleting" class="h-3.5 w-3.5 animate-spin" />
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import { Database, Loader2 } from "lucide-vue-next";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { useChamberStore, type Secret } from "@/stores/chamber";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import AppSidebar from "./AppSidebar.vue";
import SecretsHeader from "./SecretsHeader.vue";
import SecretsTable from "./SecretsTable.vue";
import SecretDialog from "./SecretDialog.vue";

const store = useChamberStore();

const dialogOpen = ref(false);
const editSecret = ref<Secret | null>(null);
const deleteKey = ref("");
const deleting = ref(false);
const toast = ref({ message: "", type: "success" as "success" | "error" });

let toastTimer: ReturnType<typeof setTimeout> | null = null;

function showToast(message: string, type: "success" | "error" = "success") {
  if (toastTimer) clearTimeout(toastTimer);
  toast.value = { message, type };
  toastTimer = setTimeout(() => (toast.value = { message: "", type: "success" }), 3000);
}

watch(() => store.error, (err) => {
  if (err) showToast(err, "error");
});

function openAdd() {
  editSecret.value = null;
  dialogOpen.value = true;
}

function openEdit(secret: Secret) {
  editSecret.value = secret;
  dialogOpen.value = true;
}

function confirmDelete(key: string) {
  deleteKey.value = key;
}

async function doDelete() {
  deleting.value = true;
  try {
    await store.deleteSecret(deleteKey.value);
    showToast("Secret deleted");
  } catch (e) {
    showToast(String(e), "error");
  } finally {
    deleting.value = false;
    deleteKey.value = "";
  }
}

async function copyValue(value: string) {
  await writeText(value);
  showToast("Value copied");
}

async function exportEnv() {
  try {
    const env = await store.exportEnv();
    await writeText(env);
    showToast("Env copied to clipboard");
  } catch (e) {
    showToast(String(e), "error");
  }
}
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(4px);
}
</style>
