/**
 * Dev-only mock AWS + chamber backend driven by design/mock-app-state.json.
 * Enable with VITE_CHAMBER_MOCK=true (e.g. in .env.local).
 */
import mockJson from "../../design/mock-app-state.json";
import type { AwsProfile, Secret, Tab } from "@/stores/chamber";

export function isChamberMock(): boolean {
  return import.meta.env.VITE_CHAMBER_MOCK === "true";
}

let secretsByService: Record<string, Secret[]> = {};
let cacheReady = false;

function cloneSecrets(list: { key: string; value: string }[]): Secret[] {
  return list.map((s) => ({ key: s.key, value: s.value }));
}

export function initMockSecretsCache(): void {
  if (cacheReady) return;
  const main = mockJson.mainScreen.secretsTable;
  const right = mockJson.mainScreen.rightPanelSecretsTable;
  secretsByService = {};
  secretsByService[main.servicePath] = cloneSecrets(main.secrets);
  secretsByService[right.servicePath] = cloneSecrets(right.secrets);
  for (const svc of mockJson.mainScreen.sidebar.services) {
    if (!secretsByService[svc]) {
      secretsByService[svc] = [
        { key: "MOCK_SECRET", value: "edit-in-design/mock-app-state.json" },
      ];
    }
  }
  cacheReady = true;
}

export function resetMockSecretsCache(): void {
  cacheReady = false;
  secretsByService = {};
  initMockSecretsCache();
}

export function mockLoadProfilesPayload(): {
  profiles: AwsProfile[];
  selectedProfile: string;
  region: string;
} {
  initMockSecretsCache();
  const a = mockJson.authScreen;
  return {
    profiles: a.profiles as AwsProfile[],
    selectedProfile: a.selectedProfile,
    region: a.selectedRegion,
  };
}

export function mockListServicesPayload(): string[] {
  return [...mockJson.mainScreen.sidebar.services];
}

export function mockAuthenticatePayload(): {
  authAccount: string;
  services: string[];
  serviceAliases: Record<string, string>;
  tabs: Tab[];
  activeTabId: string | null;
  splitTabId: string | null;
  splitView: boolean;
  focusedSide: "left" | "right";
} {
  initMockSecretsCache();
  const side = mockJson.mainScreen.sidebar;
  const bar = mockJson.mainScreen.titlebar;
  const tabs: Tab[] = bar.tabs.map((row) => ({
    id: row.id,
    service: row.servicePath,
    secrets: mockReadSecrets(row.servicePath),
    loading: false,
  }));
  const focused =
    bar.focusedPanel === "left" || bar.focusedPanel === "right"
      ? bar.focusedPanel
      : "left";
  return {
    authAccount: side.profilesFooter.account,
    services: mockListServicesPayload(),
    serviceAliases: { ...side.serviceAliases },
    tabs,
    activeTabId: bar.activeTabId,
    splitTabId: bar.splitView ? bar.splitLayout.rightTabId : null,
    splitView: bar.splitView,
    focusedSide: focused,
  };
}

export function mockReadSecrets(service: string): Secret[] {
  initMockSecretsCache();
  const list = secretsByService[service];
  return list ? list.map((s) => ({ ...s })) : [];
}

export function mockWriteSecret(service: string, key: string, value: string): void {
  initMockSecretsCache();
  const list = secretsByService[service] ?? (secretsByService[service] = []);
  const i = list.findIndex((s) => s.key === key);
  if (i >= 0) list[i] = { key, value };
  else list.push({ key, value });
}

export function mockDeleteSecret(service: string, key: string): void {
  initMockSecretsCache();
  const list = secretsByService[service];
  if (!list) return;
  secretsByService[service] = list.filter((s) => s.key !== key);
}

export function mockExportEnv(service: string): string {
  const mainPath = mockJson.mainScreen.secretsTable.servicePath;
  if (service === mainPath) {
    const block = mockJson.mainScreen.exportClipboardExample.trimEnd();
    return block.endsWith("\n") ? block : `${block}\n`;
  }
  return mockReadSecrets(service)
    .map((s) => `${s.key}=${s.value}`)
    .join("\n");
}

export function mockSsoLoginMessage(): string {
  return (
    mockJson.authScreen.scenarios.ssoCliOutput.ssoOutput ??
    mockJson.authScreen.ssoOutputCompactExample
  );
}

export function logMockBanner(): void {
  if (import.meta.env.DEV && isChamberMock()) {
    console.info(
      "%c[chamber-ui]%c VITE_CHAMBER_MOCK enabled — AWS/chamber invokes are stubbed (see design/mock-app-state.json).",
      "font-weight:bold",
      "",
    );
  }
}
