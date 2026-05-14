<template>
  <div class="flex flex-col flex-1 overflow-hidden" @mousedown="$emit('focus')">
    <!-- Empty state -->
    <div
      v-if="!tab"
      class="flex flex-1 items-center justify-center text-muted-foreground"
    >
      <div class="text-center space-y-2">
        <Database class="mx-auto h-10 w-10 opacity-30" />
        <p class="text-sm">Select a service to view secrets</p>
      </div>
    </div>

    <template v-else>
      <SecretsHeader
        :service="tab.service"
        :display-name="store.serviceLabel(tab.service)"
        :count="tab.secrets.length"
        :loading="tab.loading"
        :reveal-all="revealAll"
        @refresh="store.loadSecretsForTab(tabId!)"
        @export-env="exportEnv"
        @add="openAdd"
        @toggle-reveal-all="revealAll = !revealAll"
      />
      <SecretsTable
        :secrets="tab.secrets"
        :loading="tab.loading"
        :reveal-all="revealAll"
        @copy="copyValue"
        @edit="openEdit"
        @delete="confirmDelete"
      />
    </template>

    <!-- Add / Edit dialog -->
    <SecretDialog
      v-if="dialogOpen && tab"
      :open="dialogOpen"
      :tab-id="tabId!"
      :service-name="tab.service"
      :initial-key="editSecret?.key"
      :initial-value="editSecret?.value"
      @update:open="dialogOpen = $event"
      @saved="$emit('toast', 'Secret saved')"
      @error="$emit('toast', $event, 'error')"
    />

    <!-- Delete confirmation -->
    <AlertDialog :open="!!deleteKey" @update:open="onDeleteDialogOpenChange">
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
            @click="onConfirmDelete"
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
import { ref, computed } from "vue";
import { Database, Loader2 } from "lucide-vue-next";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { useChamberStore, type Secret } from "@/stores/chamber";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import SecretsHeader from "./SecretsHeader.vue";
import SecretsTable from "./SecretsTable.vue";
import SecretDialog from "./SecretDialog.vue";

const props = defineProps<{
  tabId: string | null;
  focused: boolean;
}>();

const emit = defineEmits<{
  toast: [message: string, type?: "success" | "error"];
  focus: [];
}>();

const store = useChamberStore();

const tab = computed(() =>
  props.tabId ? (store.tabs.find((t) => t.id === props.tabId) ?? null) : null,
);

const dialogOpen = ref(false);
const editSecret = ref<Secret | null>(null);
const deleteKey = ref("");
const deleting = ref(false);
const revealAll = ref(false);

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

/** AlertDialog closes first and was clearing deleteKey via @update:open before doDelete ran → empty key to Rust. */
function onDeleteDialogOpenChange(open: boolean) {
  if (!open) {
    queueMicrotask(() => {
      if (!deleting.value) {
        deleteKey.value = "";
      }
    });
  }
}

function onConfirmDelete(ev: MouseEvent) {
  ev.preventDefault();
  const key = deleteKey.value;
  const tabId = props.tabId;
  if (!tabId || !key) return;
  void doDelete(tabId, key);
}

async function doDelete(tabId: string, key: string) {
  deleting.value = true;
  try {
    await store.deleteSecret(tabId, key);
    emit("toast", "Secret deleted");
  } catch (e) {
    emit("toast", String(e), "error");
  } finally {
    deleting.value = false;
    deleteKey.value = "";
  }
}

async function copyValue(value: string) {
  await writeText(value);
  emit("toast", "Value copied");
}

async function exportEnv() {
  if (!props.tabId) return;
  try {
    const env = await store.exportEnv(props.tabId);
    await writeText(env);
    emit("toast", "Env copied to clipboard");
  } catch (e) {
    emit("toast", String(e), "error");
  }
}
</script>
