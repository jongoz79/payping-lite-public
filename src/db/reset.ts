import defaultGenericJson from '../../parser-library/generic.default.json';

import { withDatabase } from './client';
import { GENERIC_CONFIG_KEY } from './generic';
import { notifyParsersChanged } from './settings';

export function resetData(): void {
  withDatabase((db) => {
    db.withTransactionSync(() => {
      db.runSync('DELETE FROM capture');
      db.runSync('DELETE FROM parser');
      db.runSync('DELETE FROM selected_app');
      db.runSync('DELETE FROM setting');
      db.runSync(
        'INSERT INTO setting (key, value) VALUES (?, ?)',
        GENERIC_CONFIG_KEY,
        JSON.stringify(defaultGenericJson),
      );
      db.runSync("INSERT INTO setting (key, value) VALUES ('parsers_rev', '1')");
    });
    notifyParsersChanged();
  }, undefined);
}
