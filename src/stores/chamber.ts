import { defineStore } from "pinia";
import { ref, computed, nextTick } from "vue";
import { invoke } from "@tauri-apps/api/core";

export interface Secret {
  key: string;
  value: string;
}

export interface AwsProfile {
  name: string;
}

export const useChamberStore = defineStore("chamber", () => {
  const profiles = ref<AwsProfile[]>([]);
  const selectedProfile = ref("");
  const region = ref("us-east-1");
  const isAuthenticated = ref(false);
  const authAccount = ref("");
  const services = ref<string[]>([]);
  const selectedService = ref("");
  const secrets = ref<Secret[]>([]);
  const loading = ref(false);
  const secretsLoading = ref(false);
  const error = ref("");

  const filteredSecrets = computed(() => secrets.value);

  async function loadProfileRegion(profile: string) {
    const r = await invoke<string | null>("get_profile_region", { profile });
    if (r) region.value = r;
  }

  async function loadProfiles() {
    try {
      profiles.value = await invoke<AwsProfile[]>("list_aws_profiles");
      if (profiles.value.length > 0 && !selectedProfile.value) {
        const def = profiles.value.find((p) => p.name === "default");
        selectedProfile.value = def ? def.name : profiles.value[0].name;
      }
      if (selectedProfile.value) {
        await loadProfileRegion(selectedProfile.value);
      }
    } catch (e) {
      error.value = String(e);
    }
  }

  async function ssoLogin(): Promise<string> {
    loading.value = true;
    error.value = "";
    try {
      return await invoke<string>("aws_sso_login", {
        profile: selectedProfile.value,
        region: region.value,
      });
    } catch (e) {
      error.value = String(e);
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function authenticate() {
    loading.value = true;
    error.value = "";
    try {
      const account = await invoke<string>("check_aws_auth", {
        profile: selectedProfile.value,
        region: region.value,
      });
      authAccount.value = account;
      isAuthenticated.value = true;
      await loadServices();
    } catch (e) {
      error.value = String(e);
      isAuthenticated.value = false;
    } finally {
      loading.value = false;
    }
  }

  async function loadServices() {
    loading.value = true;
    error.value = "";
    try {
      services.value = await invoke<string[]>("list_services", {
        profile: selectedProfile.value,
        region: region.value,
      });
    } catch (e) {
      error.value = String(e);
    } finally {
      loading.value = false;
    }
  }

  function selectService(service: string) {
    selectedService.value = service;
    secrets.value = [];
    error.value = "";
    secretsLoading.value = true;
    // nextTick ensures Vue flushes the skeleton to the DOM before invoke fires
    nextTick(loadSecrets);
  }

  async function loadSecrets() {
    if (!selectedService.value) return;
    secretsLoading.value = true;
    error.value = "";
    try {
      secrets.value = await invoke<Secret[]>("read_secrets", {
        service: selectedService.value,
        profile: selectedProfile.value,
        region: region.value,
      });
    } catch (e) {
      error.value = String(e);
      secrets.value = [];
    } finally {
      secretsLoading.value = false;
    }
  }

  async function writeSecret(key: string, value: string) {
    error.value = "";
    await invoke("write_secret", {
      service: selectedService.value,
      key,
      value,
      profile: selectedProfile.value,
      region: region.value,
    });
    await pollUntilCondition((fresh) => fresh.find((s) => s.key === key)?.value === value);
  }

  async function deleteSecret(key: string) {
    error.value = "";
    await invoke("delete_secret", {
      service: selectedService.value,
      key,
      profile: selectedProfile.value,
      region: region.value,
    });
    await pollUntilCondition((fresh) => !fresh.some((s) => s.key === key));
  }

  async function pollUntilCondition(
    check: (secrets: Secret[]) => boolean,
    maxRetries = 5,
    intervalMs = 3000
  ) {
    const service = selectedService.value;
    secretsLoading.value = true;
    try {
      for (let i = 0; i < maxRetries; i++) {
        await new Promise((r) => setTimeout(r, intervalMs));
        if (selectedService.value !== service) return;
        const fresh = await invoke<Secret[]>("read_secrets", {
          service,
          profile: selectedProfile.value,
          region: region.value,
        });
        if (check(fresh)) {
          secrets.value = fresh;
          return;
        }
        if (i === maxRetries - 1) {
          secrets.value = fresh;
          throw new Error("Secret did not update after multiple retries — please refresh manually.");
        }
      }
    } finally {
      secretsLoading.value = false;
    }
  }

  async function exportEnv(): Promise<string> {
    return invoke<string>("export_env", {
      service: selectedService.value,
      profile: selectedProfile.value,
      region: region.value,
    });
  }

  function logout() {
    isAuthenticated.value = false;
    authAccount.value = "";
    services.value = [];
    selectedService.value = "";
    secrets.value = [];
    error.value = "";
  }

  return {
    profiles,
    selectedProfile,
    region,
    isAuthenticated,
    authAccount,
    services,
    selectedService,
    secrets,
    filteredSecrets,
    loading,
    secretsLoading,
    error,
    loadProfiles,
    loadProfileRegion,
    ssoLogin,
    authenticate,
    loadServices,
    selectService,
    loadSecrets,
    writeSecret,
    deleteSecret,
    exportEnv,
    logout,
  };
});
