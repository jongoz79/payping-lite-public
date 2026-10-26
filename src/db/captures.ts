import { withDatabase } from './client';
import type {
  CaptureCorrections,
  CaptureEdits,
  CaptureFilters,
  CaptureRow,
  CaptureStatus,
} from './types';

function buildFilters(filters: CaptureFilters): { where: string[]; params: (string | number)[] } {
  const where: string[] = [];
  const params: (string | number)[] = [];
  if (filters.sourceApp) {
    where.push('source_app = ?');
    params.push(filters.sourceApp);
  }
  if (filters.direction) {
    where.push('direction = ?');
    params.push(filters.direction);
  }
  if (filters.status) {
    where.push('status = ?');
    params.push(filters.status);
  }
  if (filters.parserId !== undefined) {
    where.push(filters.parserId === null ? 'parser_id IS NULL' : 'parser_id = ?');
    if (filters.parserId !== null) params.push(filters.parserId);
  }
  if (filters.from !== undefined) {
    where.push('posted_at >= ?');
    params.push(filters.from);
  }
  if (filters.to !== undefined) {
    where.push('posted_at <= ?');
    params.push(filters.to);
  }
  if (filters.beforePostedAt !== undefined && filters.beforeId) {
    where.push('(posted_at < ? OR (posted_at = ? AND id < ?))');
    params.push(filters.beforePostedAt, filters.beforePostedAt, filters.beforeId);
  }
  if (filters.search?.trim()) {
    where.push(`(instr(lower(title), lower(?)) > 0 OR instr(lower(body), lower(?)) > 0
      OR instr(lower(COALESCE(counterparty, '')), lower(?)) > 0
      OR instr(lower(COALESCE(reference, '')), lower(?)) > 0
      OR instr(lower(COALESCE(user_note, '')), lower(?)) > 0)`);
    const search = filters.search.trim();
    params.push(search, search, search, search, search);
  }
  return { where, params };
}

function whereSql(filters: CaptureFilters): { sql: string; params: (string | number)[] } {
  const { where, params } = buildFilters(filters);
  return { sql: where.length ? ` WHERE ${where.join(' AND ')}` : '', params };
}

export function getCaptures(filters: CaptureFilters = {}): CaptureRow[] {
  return withDatabase((db) => {
    const filtered = whereSql(filters);
    const params = [...filtered.params];
    let sql = `SELECT * FROM capture${filtered.sql} ORDER BY posted_at DESC, id DESC`;
    if (filters.limit !== undefined || filters.offset !== undefined) {
      sql += ' LIMIT ?';
      params.push(filters.limit ?? -1);
    }
    if (filters.offset !== undefined) {
      sql += ' OFFSET ?';
      params.push(filters.offset);
    }
    return db.getAllSync<CaptureRow>(sql, params);
  }, []);
}

export function getCaptureCount(filters: CaptureFilters = {}): number {
  return withDatabase((db) => {
    const filtered = whereSql(filters);
    return db.getFirstSync<{ count: number }>(`SELECT COUNT(*) AS count FROM capture${filtered.sql}`, ...filtered.params)?.count ?? 0;
  }, 0);
}

export type CaptureTotals = { paymentCount: number; inMinor: number; outMinor: number };

export function getCaptureTotals(filters: CaptureFilters = {}): CaptureTotals {
  return withDatabase((db) => {
    const filtered = whereSql({ ...filters, status: 'logged' });
    return db.getFirstSync<CaptureTotals>(
      `SELECT
        COALESCE(SUM(CASE WHEN direction IN ('in', 'out') THEN 1 ELSE 0 END), 0) AS paymentCount,
        COALESCE(SUM(CASE WHEN direction = 'in' AND currency = 'MYR' THEN COALESCE(amount_minor, 0) ELSE 0 END), 0) AS inMinor,
        COALESCE(SUM(CASE WHEN direction = 'out' AND currency = 'MYR' THEN COALESCE(amount_minor, 0) ELSE 0 END), 0) AS outMinor
       FROM capture${filtered.sql}`,
      ...filtered.params,
    ) ?? { paymentCount: 0, inMinor: 0, outMinor: 0 };
  }, { paymentCount: 0, inMinor: 0, outMinor: 0 });
}

export function getCaptureById(id: string): CaptureRow | null {
  return withDatabase(
    (db) => db.getFirstSync<CaptureRow>('SELECT * FROM capture WHERE id = ?', id),
    null,
  );
}

export function updateCapture(id: string, edits: CaptureEdits): boolean {
  const assignments: string[] = [];
  const params: (string | number | null)[] = [];

  if (edits.status !== undefined) {
    assignments.push('status = ?');
    params.push(edits.status);
  }
  if (edits.user_note !== undefined) {
    assignments.push('user_note = ?');
    params.push(edits.user_note);
  }
  if (edits.direction !== undefined) {
    assignments.push('direction = ?');
    params.push(edits.direction);
  }
  if (edits.amount_minor !== undefined) {
    assignments.push('amount_minor = ?');
    params.push(edits.amount_minor);
  }
  if (edits.counterparty !== undefined) {
    assignments.push('counterparty = ?');
    params.push(edits.counterparty);
  }
  if (
    edits.direction !== undefined ||
    edits.amount_minor !== undefined ||
    edits.counterparty !== undefined
  ) {
    assignments.push('user_edited = 1');
  }
  if (assignments.length === 0) return false;

  return withDatabase((db) => {
    const result = db.runSync(
      `UPDATE capture SET ${assignments.join(', ')} WHERE id = ?`,
      ...params,
      id,
    );
    return result.changes > 0;
  }, false);
}

export function updateCaptureStatus(id: string, status: CaptureStatus): boolean {
  return updateCapture(id, { status });
}

export function updateCaptureNote(id: string, note: string | null): boolean {
  return updateCapture(id, { user_note: note });
}

export function correctCapture(id: string, corrections: CaptureCorrections): boolean {
  return updateCapture(id, corrections);
}

export function deleteCapture(id: string): boolean {
  return withDatabase(
    (db) => db.runSync('DELETE FROM capture WHERE id = ?', id).changes > 0,
    false,
  );
}

export function clearCaptureHistory(): number {
  return withDatabase((db) => db.runSync('DELETE FROM capture').changes, 0);
}
