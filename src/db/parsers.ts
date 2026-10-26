import { withDatabase } from './client';
import { bumpParsersRevision, notifyParsersChanged } from './settings';
import type { ParserRow, ParserWrite } from './types';

export function getParsers(enabledOnly = false): ParserRow[] {
  return withDatabase(
    (db) =>
      db.getAllSync<ParserRow>(
        `SELECT * FROM parser${enabledOnly ? ' WHERE enabled = 1' : ''} ORDER BY id`,
      ),
    [],
  );
}

export function getParserById(id: string): ParserRow | null {
  return withDatabase(
    (db) => db.getFirstSync<ParserRow>('SELECT * FROM parser WHERE id = ?', id),
    null,
  );
}

export function saveParser(parser: ParserWrite): void {
  withDatabase((db) => {
    db.withTransactionSync(() => {
      const current = db.getFirstSync<Pick<ParserRow, 'enabled'>>(
        'SELECT enabled FROM parser WHERE id = ?',
        parser.id,
      );
      const enabled = parser.enabled ?? current?.enabled !== 0;
      db.runSync(
        `INSERT INTO parser (id, json, enabled, source, updated_at) VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           json = excluded.json,
           enabled = excluded.enabled,
           source = excluded.source,
           updated_at = excluded.updated_at`,
        parser.id,
        parser.json,
        enabled ? 1 : 0,
        parser.source,
        parser.updatedAt ?? Date.now(),
      );
      bumpParsersRevision(db);
    });
    notifyParsersChanged();
  }, undefined);
}

export function setParserEnabled(id: string, enabled: boolean): void {
  withDatabase((db) => {
    db.withTransactionSync(() => {
      db.runSync(
        'UPDATE parser SET enabled = ?, updated_at = ? WHERE id = ?',
        enabled ? 1 : 0,
        Date.now(),
        id,
      );
      bumpParsersRevision(db);
    });
    notifyParsersChanged();
  }, undefined);
}

export function deleteParser(id: string): void {
  withDatabase((db) => {
    db.withTransactionSync(() => {
      db.runSync('DELETE FROM parser WHERE id = ?', id);
      bumpParsersRevision(db);
    });
    notifyParsersChanged();
  }, undefined);
}
