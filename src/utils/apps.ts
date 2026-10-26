import type { InstalledApp } from '@/native/capture';

export function fallbackAppLabel(packageName: string): string {
  const segment = packageName.split('.').filter(Boolean).at(-1) || packageName;
  return segment
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function appLabel(apps: InstalledApp[], packageName: string): string {
  const label = apps.find((app) => app.package === packageName)?.label.trim();
  return label && label !== packageName ? label : fallbackAppLabel(packageName);
}
