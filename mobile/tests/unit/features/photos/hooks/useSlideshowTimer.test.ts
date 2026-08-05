// mobile/tests/unit/features/photos/hooks/useSlideshowTimer.test.ts
import { renderHook } from '@testing-library/react-native';

import { useSlideshowTimer } from '@/features/photos/hooks/useSlideshowTimer';

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('useSlideshowTimer', () => {
  it('calls onTick after interval when enabled and not paused', async () => {
    const onTick = jest.fn();
    await renderHook(() =>
      useSlideshowTimer({
        onTick,
        paused: false,
        enabled: true,
        intervalMs: 100,
        resetKey: 'photo-1',
      }),
    );

    jest.advanceTimersByTime(99);
    expect(onTick).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    expect(onTick).toHaveBeenCalledTimes(1);
  });

  it('does not tick when paused', async () => {
    const onTick = jest.fn();
    await renderHook(() =>
      useSlideshowTimer({
        onTick,
        paused: true,
        enabled: true,
        intervalMs: 100,
        resetKey: 'photo-1',
      }),
    );

    jest.advanceTimersByTime(500);
    expect(onTick).not.toHaveBeenCalled();
  });

  it('does not tick when disabled', async () => {
    const onTick = jest.fn();
    await renderHook(() =>
      useSlideshowTimer({
        onTick,
        paused: false,
        enabled: false,
        intervalMs: 100,
        resetKey: 'photo-1',
      }),
    );

    jest.advanceTimersByTime(500);
    expect(onTick).not.toHaveBeenCalled();
  });

  it('restarts interval when resetKey changes', async () => {
    const onTick = jest.fn();
    const { rerender } = await renderHook(
      (props: { resetKey: string }) =>
        useSlideshowTimer({
          onTick,
          paused: false,
          enabled: true,
          intervalMs: 100,
          resetKey: props.resetKey,
        }),
      { initialProps: { resetKey: 'photo-1' } },
    );

    jest.advanceTimersByTime(50);
    await rerender({ resetKey: 'photo-2' });
    jest.advanceTimersByTime(50);
    expect(onTick).not.toHaveBeenCalled();
    jest.advanceTimersByTime(50);
    expect(onTick).toHaveBeenCalledTimes(1);
  });

  it('clears interval on unmount', async () => {
    const onTick = jest.fn();
    const { unmount } = await renderHook(() =>
      useSlideshowTimer({
        onTick,
        paused: false,
        enabled: true,
        intervalMs: 100,
        resetKey: 'photo-1',
      }),
    );

    await unmount();
    jest.advanceTimersByTime(200);
    expect(onTick).not.toHaveBeenCalled();
  });
});
