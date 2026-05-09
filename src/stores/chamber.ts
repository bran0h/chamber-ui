import { defineStore } from "pinia";
import { ref, computed, nextTick } from "vue";
import { invoke } from "@tauri-apps/api/core";

const MOCK = import.meta.env.VITE_MOCK === "true";

const MOCK_SERVICES = [
  "api", "auth-service", "payment-service", "frontend",
  "worker", "database", "notifications", "analytics",
];

const MOCK_SECRETS: Record<string, Secret[]> = {
  "api": [
    { key: "DATABASE_URL", value: "postgres://user:pass@db.internal:5432/api" },
    { key: "REDIS_URL", value: "redis://cache.internal:6379/0" },
    { key: "JWT_SECRET", value: "s3cr3t-jwt-signing-key-do-not-share" },
    { key: "API_KEY", value: "ak_live_4f8b2e1d9c3a7f6e" },
    { key: "LOG_LEVEL", value: "info" },
  ],
  "auth-service": [
    { key: "OAUTH_CLIENT_ID", value: "1234567890-abcdefgh.apps.googleusercontent.com" },
    { key: "OAUTH_CLIENT_SECRET", value: "GOCSPX-abc123def456ghi789" },
    { key: "SESSION_SECRET", value: "ultra-secret-session-key-32bytes!" },
    { key: "TOKEN_EXPIRY", value: "3600" },
    { key: "MFA_ISSUER", value: "MyApp" },
  ],
  "payment-service": [
    { key: "STRIPE_SECRET_KEY", value: "sk_live_51ABCxyz..." },
    { key: "STRIPE_WEBHOOK_SECRET", value: "whsec_abcdef1234567890" },
    { key: "PAYPAL_CLIENT_ID", value: "AaBbCcDdEeFfGgHhIiJj" },
    { key: "PAYPAL_SECRET", value: "EeLlMmNnOoPpQqRrSsTt" },
  ],
  "frontend": [
    { key: "VITE_API_URL", value: "https://api.example.com" },
    { key: "VITE_SENTRY_DSN", value: "https://abc123@sentry.io/456" },
    { key: "VITE_GA_TRACKING_ID", value: "G-XXXXXXXXXX" },
    { key: "VITE_FEATURE_FLAGS", value: "new_dashboard,beta_export" },
  ],
  "worker": [
    { key: "QUEUE_URL", value: "sqs://us-east-1/123456789/worker-queue" },
    { key: "CONCURRENCY", value: "8" },
    { key: "RETRY_LIMIT", value: "3" },
    { key: "DEAD_LETTER_QUEUE", value: "sqs://us-east-1/123456789/dlq" },
  ],
  "database": [
    { key: "MASTER_URL", value: "postgres://admin:secret@master.db:5432/prod" },
    { key: "REPLICA_URL", value: "postgres://reader:secret@replica.db:5432/prod" },
    { key: "POOL_SIZE", value: "20" },
    { key: "MIGRATIONS_TABLE", value: "schema_migrations" },
  ],
  "notifications": [
    { key: "SENDGRID_API_KEY", value: "SG.abc123def456" },
    { key: "FROM_EMAIL", value: "noreply@example.com" },
    { key: "TWILIO_ACCOUNT_SID", value: "ACabcdef1234567890" },
    { key: "TWILIO_AUTH_TOKEN", value: "auth_token_here" },
    { key: "SLACK_WEBHOOK_URL", value: "https://hooks.slack.com/services/T00/B00/xxx" },
  ],
  "analytics": [
    { key: "CLICKHOUSE_URL", value: "clickhouse://analytics.internal:9000/events" },
    { key: "CLICKHOUSE_USER", value: "analytics_writer" },
    { key: "CLICKHOUSE_PASSWORD", value: "ch_pass_xyz789" },
    { key: "RETENTION_DAYS", value: "90" },
  ],
};

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
    if (MOCK) return;
    const r = await invoke<string | null>("get_profile_region", { profile });
    if (r) region.value = r;
  }

  async function loadProfiles() {
    if (MOCK) {
      profiles.value = [{ name: "demo" }, { name: "staging" }, { name: "production" }];
      selectedProfile.value = "demo";
      region.value = "eu-central-1";
      return;
    }
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
    if (MOCK) return "SSO login successful (mock).";
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
    if (MOCK) {
      loading.value = true;
      await new Promise((r) => setTimeout(r, 600));
      authAccount.value = "123456789012";
      isAuthenticated.value = true;
      await loadServices();
      loading.value = false;
      return;
    }
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
    if (MOCK) {
      loading.value = true;
      await new Promise((r) => setTimeout(r, 400));
      services.value = MOCK_SERVICES;
      loading.value = false;
      return;
    }
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
    if (MOCK) {
      await new Promise((r) => setTimeout(r, 500));
      secrets.value = MOCK_SECRETS[selectedService.value] ?? [];
      secretsLoading.value = false;
      return;
    }
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
    if (MOCK) {
      await new Promise((r) => setTimeout(r, 400));
      const svc = selectedService.value;
      const list = MOCK_SECRETS[svc] ?? [];
      const idx = list.findIndex((s) => s.key === key);
      if (idx >= 0) list[idx] = { key, value };
      else list.push({ key, value });
      MOCK_SECRETS[svc] = list;
      secrets.value = [...list];
      return;
    }
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
    if (MOCK) {
      await new Promise((r) => setTimeout(r, 400));
      const svc = selectedService.value;
      MOCK_SECRETS[svc] = (MOCK_SECRETS[svc] ?? []).filter((s) => s.key !== key);
      secrets.value = [...MOCK_SECRETS[svc]];
      return;
    }
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
    if (MOCK) {
      return (MOCK_SECRETS[selectedService.value] ?? [])
        .map((s) => `${s.key}=${s.value}`)
        .join("\n");
    }
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
