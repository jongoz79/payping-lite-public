import { openDatabaseSync, type SQLiteDatabase } from 'expo-sqlite';
import { Platform } from 'react-native';

let database: SQLiteDatabase | null = null;
let unavailableInTests = false;

/** The directory the native capture module stores payping.db in (an iOS app group if one is configured). */
function nativeDatabaseDirectory(): string | undefined {
  try {
    // Lazy require: the native module is absent under Jest.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const capture = require('../../modules/payping-capture').default;
    return capture?.getDatabaseDirectory?.() ?? undefined;
  } catch {
    return undefined;
  }
}

export function getDatabase(): SQLiteDatabase | null {
  if (Platform.OS === 'web' || unavailableInTests) return null;
  if (database) return database;

  try {
    database = openDatabaseSync('payping.db', {}, nativeDatabaseDirectory());
    return database;
  } catch (error) {
    if (process.env.NODE_ENV === 'test') {
      unavailableInTests = true;
      return null;
    }
    throw error;
  }
}

export function withDatabase<T>(operation: (db: SQLiteDatabase) => T, fallback: T): T {
  const db = getDatabase();
  return db ? operation(db) : fallback;
}
