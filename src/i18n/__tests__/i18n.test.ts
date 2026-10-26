import { en } from '../en';
import { ms } from '../ms';

test('every English translation exists in Bahasa Melayu with no extras', () => {
  expect(Object.keys(ms).sort()).toEqual(Object.keys(en).sort());
});

test('History search and filtered export labels describe their actual scope', () => {
  expect(en['history.searchPlaceholder']).toBe('Search payee, reference, note or raw text');
  expect(ms['history.searchPlaceholder']).toBe('Cari nama penerima, rujukan, nota atau teks asal');
  expect(en['csv.exportFiltered']).toBe('Export Filtered Transactions (CSV)');
  expect(ms['csv.exportFiltered']).toBe('Eksport Transaksi Ditapis (CSV)');
});
