import defaultGenericJson from '../../parser-library/generic.default.json';
import type { GenericConfig } from '../parser/engine';

import { withDatabase } from './client';
import { bumpParsersRevision, getSetting, notifyParsersChanged } from './settings';

export const GENERIC_CONFIG_KEY = 'generic_config';
const DEFAULT_GENERIC_CONFIG = defaultGenericJson as GenericConfig;

export function getDefaultGenericConfig(): GenericConfig {
  return JSON.parse(JSON.stringify(DEFAULT_GENERIC_CONFIG)) as GenericConfig;
}

export function getGenericConfig(): GenericConfig {
  const stored = getSetting(GENERIC_CONFIG_KEY);
  return stored === null ? getDefaultGenericConfig() : (JSON.parse(stored) as GenericConfig);
}

/** Native capture keeps an unedited generic rule in sync with the bundled default; this flag marks user edits. */
export const GENERIC_EDITED_KEY = 'generic_edited';

export function saveGenericConfig(config: GenericConfig): void {
  writeGenericConfig(JSON.stringify(config), true);
}

export function resetGenericConfig(): void {
  writeGenericConfig(JSON.stringify(DEFAULT_GENERIC_CONFIG), false);
}

function writeGenericConfig(json: string, edited: boolean): void {
  withDatabase((db) => {
    db.withTransactionSync(() => {
      db.runSync(
        `INSERT INTO setting (key, value) VALUES (?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
        GENERIC_CONFIG_KEY,
        json,
      );
      db.runSync(
        `INSERT INTO setting (key, value) VALUES (?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
        GENERIC_EDITED_KEY,
        edited ? '1' : '0',
      );
      bumpParsersRevision(db);
    });
    notifyParsersChanged();
  }, undefined);
}
