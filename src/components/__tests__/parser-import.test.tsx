import { fireEvent, render } from '@testing-library/react-native';

import { ParserAddModal } from '@/components/parser-add-modal';
import { saveParser } from '@/db';
import { I18nProvider } from '@/i18n';

jest.mock('@/db', () => ({ saveParser: jest.fn() }));

jest.mock('expo-document-picker', () => ({ getDocumentAsync: jest.fn() }));

async function renderPanel() {
  const view = await render(
    <I18nProvider initialPreference="en">
      <ParserAddModal
        visible
        captures={[]}
        selectedApps={[]}
        onClose={jest.fn()}
        onImported={jest.fn()}
        onCreate={jest.fn()}
      />
    </I18nProvider>,
  );
  await fireEvent.press(view.getByRole('button', { name: 'Paste Rule Code' }));
  return view;
}

beforeEach(() => {
  jest.clearAllMocks();
});

test('shows a readable error for invalid JSON', async () => {
  const view = await renderPanel();
  await fireEvent.changeText(view.getByLabelText('Paste Rule Code'), '{not json');
  await fireEvent.press(view.getByRole('button', { name: 'Add Bank Rule' }));

  expect(view.getByText('Invalid JSON. Check the text and try again.')).toBeTruthy();
  expect(saveParser).not.toHaveBeenCalled();
});

test('shows schema validation details and does not save an invalid parser', async () => {
  const view = await renderPanel();
  await fireEvent.changeText(
    view.getByLabelText('Paste Rule Code'),
    JSON.stringify({ schemaVersion: 1, id: 'Invalid ID', rules: [] }),
  );
  await fireEvent.press(view.getByRole('button', { name: 'Add Bank Rule' }));

  expect(view.getByText('This file is not a valid PayPing parser.')).toBeTruthy();
  expect(view.getByText('The parser name must be non-empty text (field: name).')).toBeTruthy();
  expect(view.getByText('Add at least one rule in the rules list.')).toBeTruthy();
  expect(saveParser).not.toHaveBeenCalled();
});
