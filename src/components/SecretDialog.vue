<template>
  <Dialog :open="open" @update:open="$emit('update:open', $event)">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{{ isEdit ? "Edit Secret" : "New Secret" }}</DialogTitle>
        <DialogDescription>
          {{
            isEdit
              ? `Updating value for "${initialKey}"`
              : `Add a new secret to service "${serviceName}"`
          }}
        </DialogDescription>
      </DialogHeader>

      <div class="space-y-4 py-2">
        <div class="space-y-2">
          <Label for="key">Key</Label>
          <Input
            id="key"
            v-model="form.key"
            placeholder="MY_SECRET_KEY"
            :disabled="isEdit"
            class="font-mono"
            @keydown.enter="submit"
          />
        </div>

        <div class="space-y-2">
          <Label for="value">Value</Label>
          <div class="relative">
            <Input
              id="value"
              v-model="form.value"
              :type="showValue ? 'text' : 'password'"
              placeholder="secret value"
              class="font-mono pr-10"
              @keydown.enter="submit"
            />
            <button
              type="button"
              class="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              @click="showValue = !showValue"
            >
              <Eye v-if="!showValue" class="h-4 w-4" />
              <EyeOff v-else class="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" @click="$emit('update:open', false)"
          >Cancel</Button
        >
        <Button :disabled="!form.key || !form.value || saving" @click="submit">
          <Loader2 v-if="saving" class="mr-2 h-4 w-4 animate-spin" />
          {{ isEdit ? "Save" : "Add" }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import { Eye, EyeOff, Loader2 } from "lucide-vue-next";
import { useChamberStore } from "@/stores/chamber";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const props = defineProps<{
  open: boolean;
  tabId: string;
  serviceName: string;
  initialKey?: string;
  initialValue?: string;
}>();

const emit = defineEmits<{
  "update:open": [value: boolean];
  saved: [];
  error: [message: string];
}>();

const store = useChamberStore();
const isEdit = !!props.initialKey;
const showValue = ref(false);
const saving = ref(false);

const form = ref({
  key: props.initialKey ?? "",
  value: props.initialValue ?? "",
});

watch(
  () => props.open,
  (val) => {
    if (val) {
      form.value = {
        key: props.initialKey ?? "",
        value: props.initialValue ?? "",
      };
      showValue.value = false;
    }
  },
);

async function submit() {
  if (!form.value.key || !form.value.value) return;
  saving.value = true;
  try {
    await store.writeSecret(props.tabId, form.value.key, form.value.value);
    emit("saved");
    emit("update:open", false);
  } catch (e) {
    emit("error", String(e));
    emit("update:open", false);
  } finally {
    saving.value = false;
  }
}
</script>
