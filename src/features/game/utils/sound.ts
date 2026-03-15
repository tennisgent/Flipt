type SoundName = "flip" | "buzz" | "correct" | "solve" | "tick";

const audioContext = (): AudioContext | null => {
  if (typeof window === "undefined") return null;
  const ctx = new (window.AudioContext ||
    (window as unknown as Record<string, typeof AudioContext>)
      .webkitAudioContext)();
  return ctx;
};

const playTone = (
  frequency: number,
  duration: number,
  type: OscillatorType = "sine",
  volume = 0.3,
) => {
  const ctx = audioContext();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(frequency, ctx.currentTime);
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration);
};

const sounds: Record<SoundName, () => void> = {
  flip: () => playTone(800, 0.1, "sine", 0.2),
  buzz: () => playTone(150, 0.3, "sawtooth", 0.2),
  correct: () => {
    playTone(523, 0.15, "sine", 0.2);
    setTimeout(() => playTone(659, 0.15, "sine", 0.2), 100);
    setTimeout(() => playTone(784, 0.2, "sine", 0.2), 200);
  },
  solve: () => {
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      setTimeout(() => playTone(freq, 0.2, "sine", 0.25), i * 120);
    });
  },
  tick: () => playTone(1000, 0.05, "sine", 0.1),
};

export const playSound = (name: SoundName): void => {
  try {
    sounds[name]();
  } catch {
    // Audio not available — fail silently
  }
};
