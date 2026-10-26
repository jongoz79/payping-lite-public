import { NativeModule, registerWebModule } from 'expo';
import type { CaptureEvents, PreviewResult, InstalledApp, SelectedApp, AppSelection } from './index';
export type { PermissionStatus, InstalledApp, SelectedApp, AppSelection, ParseResult, PreviewResult, CaptureEvents } from './index';
class WebCapture extends NativeModule<CaptureEvents> {
  getDatabaseDirectory(): string | null { return null; }
  getPermissionStatus(): 'denied' { return 'denied'; }
  openNotificationAccessSettings() {}
  isListenerConnected() { return false; }
  async getInstalledApps(): Promise<InstalledApp[]> { return []; }
  setSelectedApps(_apps: AppSelection[]) {}
  getSelectedApps(): SelectedApp[] { return []; }
  setSetting(_key: string, _value: string) {}
  getSetting(_key: string): string | null { return null; }
  reloadParsers() {}
  resetGenericConfig() {}
  async reparse(_sourceApp?: string | null): Promise<number> { return 0; }
  parsePreview(_title: string, _body: string, _sourceApp: string, _parserJson?: string | null): PreviewResult {
    return { ruleId: null, parserId: null, direction: 'info', amountMinor: null, currency: 'MYR', counterparty: null, reference: null, confidence: 'none' };
  }
  speakTest(_text: string) {}
}
const capture = registerWebModule(WebCapture, 'PaypingCapture');
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
