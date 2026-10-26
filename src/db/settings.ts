import type { SQLiteDatabase } from 'expo-sqlite';

import { reloadParsers } from '@/native/capture';
import type { TtsTemplates } from '@/parser/tts';

import { withDatabase } from './client';
import type { SettingRow } from './types';

export function getSettings(): SettingRow[] {
  return withDatabase((db) => db.getAllSync<SettingRow>('SELECT * FROM setting ORDER BY key'), []);
}

export function getSetting(key: string): string | null {
  return withDatabase(
    (db) => db.getFirstSync<SettingRow>('SELECT * FROM setting WHERE key = ?', key)?.value ?? null,
    null,
  );
}

export const TTS_TEMPLATE_IN_KEY = 'tts_template_in';
export const TTS_TEMPLATE_OUT_KEY = 'tts_template_out';

/** User wording for announcements; empty means the built-in short form. */
export function getTtsTemplates(): TtsTemplates {
  return { in: getSetting(TTS_TEMPLATE_IN_KEY), out: getSetting(TTS_TEMPLATE_OUT_KEY) };
}

export function setSetting(key: string, value: string): void {
  withDatabase((db) => {
    db.runSync(
      `INSERT INTO setting (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      key,
      value,
    );
  }, undefined);
}

export function setSettings(settings: Record<string, string>): void {
  withDatabase((db) => {
    db.withTransactionSync(() => {
      for (const [key, value] of Object.entries(settings)) {
        db.runSync(
          `INSERT INTO setting (key, value) VALUES (?, ?)
           ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
          key,
          value,
        );
      }
    });
  }, undefined);
}

export function bumpParsersRevision(db: SQLiteDatabase): void {
  db.runSync(
    `INSERT INTO setting (key, value) VALUES ('parsers_rev', '1')
     ON CONFLICT(key) DO UPDATE
     SET value = CAST(COALESCE(CAST(setting.value AS INTEGER), 0) + 1 AS TEXT)`,
  );
}

export function notifyParsersChanged(): void {
  reloadParsers();
}
