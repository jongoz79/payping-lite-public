import { requireOptionalNativeModule } from 'expo';

export type InstalledApp = {
  package: string;
  label: string;
  iconUri: string;
};

export type AppSelection = {
  package: string;
  label: string;
};

export type SelectedApp = AppSelection & {
  addedAt: number;
  iconUri: string;
};

export type PermissionStatus = 'granted' | 'denied';
export type CaptureDirection = 'in' | 'out' | 'info';
export type CaptureConfidence = 'high' | 'low' | 'none';

export type CaptureParseResult = {
  ruleId: string | null;
  parserId: string | null;
  direction: CaptureDirection;
  amountMinor: number | null;
  currency: string;
  counterparty: string | null;
  reference: string | null;
  confidence: CaptureConfidence;
};

export type CapturePreviewResult = CaptureParseResult | { error: string };
export type CaptureEvent = { id: string };

type CaptureModule = {
  getInstalledApps: () => Promise<InstalledApp[]>;
  getSelectedApps: () => Omit<SelectedApp, 'iconUri'>[];
  setSelectedApps: (apps: AppSelection[]) => void;
  getPermissionStatus: () => PermissionStatus;
  isListenerConnected: () => boolean;
  openNotificationAccessSettings: () => void;
  isIgnoringBatteryOptimizations?: () => boolean;
  requestIgnoreBatteryOptimizations?: () => void;
  openAppDetails?: () => void;
  getDeviceMaker?: () => string;
  getSetting: (key: string) => string | null;
  setSetting: (key: string, value: string) => void;
  parsePreview: (
    title: string,
    body: string,
    sourceApp: string,
    parserJson?: string,
  ) => CapturePreviewResult;
  reparse: (sourceApp?: string | null) => Promise<number>;
  reloadParsers: () => void;
  resetGenericConfig: () => void;
  speakTest: (text: string) => void;
  addListener: (
    eventName: 'onCapture',
    listener: (event: CaptureEvent) => void,
  ) => { remove: () => void };
};

function nativeModule(): CaptureModule {
  const module = requireOptionalNativeModule<CaptureModule>('PaypingCapture');
  if (!module) throw new Error('PaypingCapture is unavailable in this build.');
  return module;
}

export function getInstalledApps(): Promise<InstalledApp[]> {
  return nativeModule().getInstalledApps();
}

export function getSelectedApps(): SelectedApp[] {
  return nativeModule()
    .getSelectedApps()
    .map((app) => ({ ...app, iconUri: '' }));
}

export function setSelectedApps(apps: AppSelection[]): void {
  nativeModule().setSelectedApps(apps);
}

export function getPermissionStatus(): PermissionStatus {
  return nativeModule().getPermissionStatus();
}

export function isListenerConnected(): boolean {
  return nativeModule().isListenerConnected();
}

export function openNotificationAccessSettings(): void {
  nativeModule().openNotificationAccessSettings();
}

/** Android only: true when PayPing is exempt from battery optimisation (iOS has no equivalent, so true). */
export function isIgnoringBatteryOptimizations(): boolean {
  return nativeModule().isIgnoringBatteryOptimizations?.() ?? true;
}

/** Shows Android's "Allow app to always run in background?" dialog. */
export function requestIgnoreBatteryOptimizations(): void {
  nativeModule().requestIgnoreBatteryOptimizations?.();
}

/** App info page, where OEM battery ("Unrestricted", "No restrictions") and autostart switches live. */
export function openAppDetails(): void {
  nativeModule().openAppDetails?.();
}

export function getDeviceMaker(): string {
  return nativeModule().getDeviceMaker?.() ?? '';
}

export function getSetting(key: string): string | null {
  return nativeModule().getSetting(key);
}

export function setSetting(key: string, value: string): void {
  nativeModule().setSetting(key, value);
}

export function parsePreview(
  title: string,
  body: string,
  sourceApp: string,
  parserJson?: string,
): CaptureParseResult {
  const result = nativeModule().parsePreview(title, body, sourceApp, parserJson);
  if ('error' in result) throw new Error(result.error);
  return result;
}

export function reparse(sourceApp?: string): Promise<number> {
  return nativeModule().reparse(sourceApp ?? null);
}

export function reloadParsers(): void {
  nativeModule().reloadParsers();
}

export function resetGenericConfig(): void {
  nativeModule().resetGenericConfig();
}

export function speakTest(text: string): void {
  nativeModule().speakTest(text);
}

export function addCaptureListener(listener: (event: CaptureEvent) => void): () => void {
  const subscription = nativeModule().addListener('onCapture', listener);
  return () => subscription.remove();
}
