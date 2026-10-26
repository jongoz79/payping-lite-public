import { withDatabase } from './client';
import type { SelectedAppRow, SelectedAppWrite } from './types';

export function getSelectedApps(): SelectedAppRow[] {
  return withDatabase(
    (db) => db.getAllSync<SelectedAppRow>('SELECT * FROM selected_app ORDER BY label COLLATE NOCASE'),
    [],
  );
}

export function setSelectedApps(apps: SelectedAppWrite[]): void {
  withDatabase((db) => {
    db.withTransactionSync(() => {
      db.runSync('DELETE FROM selected_app');
      const addedAt = Date.now();
      for (const app of apps) {
        db.runSync(
          `INSERT INTO selected_app (package, label, added_at) VALUES (?, ?, ?)
           ON CONFLICT(package) DO UPDATE SET label = excluded.label`,
          app.package,
          app.label,
          app.addedAt ?? addedAt,
        );
      }
    });
  }, undefined);
}

export function addSelectedApp(app: SelectedAppWrite): void {
  withDatabase((db) => {
    db.runSync(
      `INSERT INTO selected_app (package, label, added_at) VALUES (?, ?, ?)
       ON CONFLICT(package) DO UPDATE SET label = excluded.label`,
      app.package,
      app.label,
      app.addedAt ?? Date.now(),
    );
  }, undefined);
}

export function removeSelectedApp(packageName: string): void {
  withDatabase((db) => {
    db.runSync('DELETE FROM selected_app WHERE package = ?', packageName);
  }, undefined);
}
