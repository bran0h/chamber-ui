import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { invoke } from "@tauri-apps/api/core";

const SERVICE_ALIASES_KEY = "chamber-ui.serviceAliases";

export interface Secret {
  key: string;
  value: string;
}

export interface AwsProfile {
  name: string;
}

export interface Tab {
  id: string;
  service: string;
  secrets: Secret[];
  loading: boolean;
}

export const useChamberStore = defineStore("chamber", () => {
  const profiles = ref<AwsProfile[]>([]);
  const selectedProfile = ref("");
  const region = ref("us-east-1");
  const isAuthenticated = ref(false);
  const authAccount = ref("");
  const services = ref<string[]>([]);
  const loading = ref(false);
  const error = ref("");
  const serviceAliases = ref<Record<string, string>>({});

  function loadServiceAliases() {
    try {
      const raw = localStorage.getItem(SERVICE_ALIASES_KEY);
      serviceAliases.value = raw ? (JSON.parse(raw) as Record<string, string>) : {};
    } catch {
      serviceAliases.value = {};
    }
  }

  function persistServiceAliases() {
    localStorage.setItem(SERVICE_ALIASES_KEY, JSON.stringify(serviceAliases.value));
  }

  /** Shown name in UI (sidebar, tabs); chamber service path stays the real id. */
  function serviceLabel(service: string): string {
    const a = serviceAliases.value[service];
    return a?.trim() ? a : service;
  }

  function customAliasFor(service: string): string {
    return serviceAliases.value[service] ?? "";
  }

  function setServiceAlias(service: string, alias: string) {
    const t = alias.trim();
    const next = { ...serviceAliases.value };
    if (!t) delete next[service];
    else next[service] = t;
    serviceAliases.value = next;
    persistServiceAliases();
  }

  loadServiceAliases();

  // Tab state
  const tabs = ref<Tab[]>([]);
  const activeTabId = ref<string | null>(null);
  const splitTabId = ref<string | null>(null);
  const splitView = ref(false);
  const focusedSide = ref<"left" | "right">("left");

  const activeTab = computed(() =>
    tabs.value.find((t) => t.id === activeTabId.value) ?? null,
  );

  const splitTab = computed(() =>
    tabs.value.find((t) => t.id === splitTabId.value) ?? null,
  );

  // Reflects the active service in the currently focused panel (used by sidebar highlight)
  const selectedService = computed(() => {
    if (focusedSide.value === "right" && splitView.value) {
      return splitTab.value?.service ?? activeTab.value?.service ?? "";
    }
    return activeTab.value?.service ?? "";
  });

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

  function openTab(service: string) {
    let tab = tabs.value.find((t) => t.service === service);
    if (!tab) {
      tab = { id: crypto.randomUUID(), service, secrets: [], loading: false };
      tabs.value.push(tab);
      loadSecretsForTab(tab.id);
    }
    if (!splitView.value || focusedSide.value === "left") {
      activeTabId.value = tab.id;
      focusedSide.value = "left";
    } else {
      splitTabId.value = tab.id;
    }
  }

  function ensureTabForService(service: string): Tab {
    let tab = tabs.value.find((t) => t.service === service);
    if (!tab) {
      tab = { id: crypto.randomUUID(), service, secrets: [], loading: false };
      tabs.value.push(tab);
      void loadSecretsForTab(tab.id);
    }
    return tab;
  }

  /** Open or focus this service in the left (primary) tab strip panel. */
  function openServiceInFirstPanel(service: string) {
    const tab = ensureTabForService(service);
    activeTabId.value = tab.id;
    focusedSide.value = "left";
  }

  /** Open or focus this service in the right (split) panel; enables split view if needed. */
  function openServiceInSecondPanel(service: string) {
    const tab = ensureTabForService(service);
    if (!activeTabId.value) {
      activeTabId.value = tab.id;
    }
    if (!splitView.value) {
      splitView.value = true;
      splitTabId.value =
        tabs.value.find((t) => t.id !== activeTabId.value)?.id ?? tab.id;
    }
    splitTabId.value = tab.id;
    focusedSide.value = "right";
  }

  function closeTab(tabId: string) {
    const idx = tabs.value.findIndex((t) => t.id === tabId);
    if (idx === -1) return;
    tabs.value.splice(idx, 1);

    if (activeTabId.value === tabId) {
      activeTabId.value =
        tabs.value.find((t) => t.id !== splitTabId.value)?.id ??
        tabs.value[0]?.id ??
        null;
    }
    if (splitTabId.value === tabId) {
      splitTabId.value =
        tabs.value.find((t) => t.id !== activeTabId.value)?.id ?? null;
      if (!splitTabId.value) splitView.value = false;
    }
    if (tabs.value.length === 0) {
      splitView.value = false;
      focusedSide.value = "left";
    }
  }

  function setActiveTab(tabId: string, side: "left" | "right") {
    if (side === "left") {
      activeTabId.value = tabId;
    } else {
      splitTabId.value = tabId;
    }
    focusedSide.value = side;
  }

  function toggleSplit() {
    if (!splitView.value) {
      splitTabId.value =
        tabs.value.find((t) => t.id !== activeTabId.value)?.id ??
        activeTabId.value ??
        null;
      splitView.value = true;
      focusedSide.value = "right";
    } else {
      splitView.value = false;
      splitTabId.value = null;
      focusedSide.value = "left";
    }
  }

  function setFocusedSide(side: "left" | "right") {
    focusedSide.value = side;
  }

  async function loadSecretsForTab(tabId: string) {
    const tab = tabs.value.find((t) => t.id === tabId);
    if (!tab) return;
    tab.loading = true;
    error.value = "";
    try {
      tab.secrets = await invoke<Secret[]>("read_secrets", {
        service: tab.service,
        profile: selectedProfile.value,
        region: region.value,
      });
    } catch (e) {
      error.value = String(e);
      tab.secrets = [];
    } finally {
      tab.loading = false;
    }
  }

  async function writeSecret(tabId: string, key: string, value: string) {
    const tab = tabs.value.find((t) => t.id === tabId);
    if (!tab) return;
    error.value = "";
    await invoke("write_secret", {
      service: tab.service,
      key,
      value,
      profile: selectedProfile.value,
      region: region.value,
    });
    await pollUntilCondition(
      tabId,
      (fresh) => fresh.find((s) => s.key === key)?.value === value,
    );
  }

  async function deleteSecret(tabId: string, key: string) {
    const tab = tabs.value.find((t) => t.id === tabId);
    if (!tab) return;
    error.value = "";
    await invoke("delete_secret", {
      service: tab.service,
      key,
      profile: selectedProfile.value,
      region: region.value,
    });
    await pollUntilCondition(tabId, (fresh) => !fresh.some((s) => s.key === key));
  }

  async function pollUntilCondition(
    tabId: string,
    check: (secrets: Secret[]) => boolean,
    maxRetries = 5,
    intervalMs = 3000,
  ) {
    const tab = tabs.value.find((t) => t.id === tabId);
    if (!tab) return;
    const service = tab.service;
    tab.loading = true;
    try {
      for (let i = 0; i < maxRetries; i++) {
        await new Promise((r) => setTimeout(r, intervalMs));
        const current = tabs.value.find((t) => t.id === tabId);
        if (!current || current.service !== service) return;
        const fresh = await invoke<Secret[]>("read_secrets", {
          service,
          profile: selectedProfile.value,
          region: region.value,
        });
        if (check(fresh)) {
          current.secrets = fresh;
          return;
        }
        if (i === maxRetries - 1) {
          current.secrets = fresh;
          throw new Error(
            "Secret did not update after multiple retries — please refresh manually.",
          );
        }
      }
    } finally {
      const current = tabs.value.find((t) => t.id === tabId);
      if (current) current.loading = false;
    }
  }

  async function exportEnv(tabId: string): Promise<string> {
    const tab = tabs.value.find((t) => t.id === tabId);
    if (!tab) throw new Error("Tab not found");
    return invoke<string>("export_env", {
      service: tab.service,
      profile: selectedProfile.value,
      region: region.value,
    });
  }

  function logout() {
    isAuthenticated.value = false;
    authAccount.value = "";
    services.value = [];
    error.value = "";
    tabs.value = [];
    activeTabId.value = null;
    splitTabId.value = null;
    splitView.value = false;
    focusedSide.value = "left";
  }

  return {
    profiles,
    selectedProfile,
    region,
    isAuthenticated,
    authAccount,
    services,
    loading,
    error,
    tabs,
    activeTabId,
    splitTabId,
    splitView,
    focusedSide,
    activeTab,
    splitTab,
    selectedService,
    loadProfiles,
    loadProfileRegion,
    ssoLogin,
    authenticate,
    loadServices,
    openTab,
    openServiceInFirstPanel,
    openServiceInSecondPanel,
    closeTab,
    setActiveTab,
    toggleSplit,
    setFocusedSide,
    loadSecretsForTab,
    writeSecret,
    deleteSecret,
    exportEnv,
    logout,
    serviceLabel,
    customAliasFor,
    setServiceAlias,
  };
});
