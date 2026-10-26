import { NativeModule, requireNativeModule } from 'expo';

export type PermissionStatus = 'granted' | 'denied';
export type InstalledApp = { package: string; label: string; iconUri: string };
export type SelectedApp = { package: string; label: string; addedAt: number };
export type AppSelection = Pick<SelectedApp, 'package' | 'label'>;
export type ParseResult = {
  ruleId: string | null; parserId: string | null; direction: 'in' | 'out' | 'info';
  amountMinor: number | null; currency: string; counterparty: string | null;
  reference: string | null; confidence: 'high' | 'low' | 'none';
};
export type PreviewResult = ParseResult | { error: string };
export type CaptureEvents = { onCapture: (event: { id: string }) => void };
declare class CaptureModule extends NativeModule<CaptureEvents> {
  getDatabaseDirectory(): string;
  getPermissionStatus(): PermissionStatus;
  openNotificationAccessSettings(): void;
  isListenerConnected(): boolean;
  getInstalledApps(): Promise<InstalledApp[]>;
  setSelectedApps(apps: AppSelection[]): void;
  getSelectedApps(): SelectedApp[];
  setSetting(key: string, value: string): void;
  getSetting(key: string): string | null;
  reloadParsers(): void;
  resetGenericConfig(): void;
  parsePreview(title: string, body: string, sourceApp: string, parserJson?: string | null): PreviewResult;
  reparse(sourceApp?: string | null): Promise<number>;
  speakTest(text: string): void;
}
const capture = requireNativeModule<CaptureModule>('PaypingCapture');
export default capture;
export const getDatabaseDirectory = () => capture.getDatabaseDirectory();
export const getPermissionStatus = () => capture.getPermissionStatus();
export const openNotificationAccessSettings = () => capture.openNotificationAccessSettings();
export const isListenerConnected = () => capture.isListenerConnected();
export const getInstalledApps = () => capture.getInstalledApps();
export const setSelectedApps = (apps: AppSelection[]) => capture.setSelectedApps(apps);
export const getSelectedApps = () => capture.getSelectedApps();
export const setSetting = (key: string, value: string) => capture.setSetting(key, value);
export const getSetting = (key: string) => capture.getSetting(key);
export const reloadParsers = () => capture.reloadParsers();
export const resetGenericConfig = () => capture.resetGenericConfig();
export const parsePreview = (title: string, body: string, sourceApp: string, parserJson?: string) => capture.parsePreview(title, body, sourceApp, parserJson ?? null);
export const reparse = (sourceApp?: string) => capture.reparse(sourceApp ?? null);
export const speakTest = (text: string) => capture.speakTest(text);
