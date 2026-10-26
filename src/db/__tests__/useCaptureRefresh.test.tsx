import { act, renderHook } from '@testing-library/react-native';

import { addCaptureListener } from '@/native/capture';
import { notifyCapturesChanged, useCaptureRefresh } from '../useCaptureRefresh';

jest.mock('@/native/capture', () => ({ addCaptureListener: jest.fn() }));

test('reparse notifications refresh mounted capture views and stop after unmount', async () => {
  jest.mocked(addCaptureListener).mockReturnValue(jest.fn());
  const refresh = jest.fn();
  const view = await renderHook(() => useCaptureRefresh(refresh));
  expect(refresh).toHaveBeenCalledTimes(1);

  await act(async () => notifyCapturesChanged());
  expect(refresh).toHaveBeenCalledTimes(2);

  await act(async () => {
    await view.unmount();
  });
  await act(async () => notifyCapturesChanged());
  expect(refresh).toHaveBeenCalledTimes(2);
});
