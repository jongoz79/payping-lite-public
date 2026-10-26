import * as SQLite from 'expo-sqlite';
import capture from '../../modules/payping-capture';

/** Native initializes/migrates first. Explicit directory also supports an optional iOS app group. */
export function openCaptureDatabase() {
  return SQLite.openDatabaseSync('payping.db', {}, capture.getDatabaseDirectory());
}
