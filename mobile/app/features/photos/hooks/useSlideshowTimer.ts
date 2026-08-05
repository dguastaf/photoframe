import { DEFAULT_DISPLAY_MS } from "@/constants";
import { useEffect } from "react";

type UseSlideshowTimerOptions = {
  onTick: () => void;
  paused: boolean;
  enabled?: boolean;
  resetKey?: string;
  intervalMs?: number;
};

export function useSlideshowTimer({
  onTick,
  paused,
  enabled = true,
  resetKey,
  intervalMs = DEFAULT_DISPLAY_MS,
}: UseSlideshowTimerOptions) {
  useEffect(() => {
    if (!enabled || paused) {
      return;
    }

    const interval = setInterval(onTick, intervalMs);
    return () => clearInterval(interval);

  },[enabled, paused, resetKey, intervalMs])
}
