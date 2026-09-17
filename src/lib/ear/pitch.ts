/* Monophonic pitch detection by normalized autocorrelation. Good enough to
   follow a hummed or sung melody in a quiet room, which is the job. Returns
   a frequency in Hz, or -1 when the frame is silence or noise. */

export function detectPitch(buf: Float32Array, sampleRate: number): number {
  const size = buf.length;
  let rms = 0;
  for (let i = 0; i < size; i++) rms += buf[i] * buf[i];
  rms = Math.sqrt(rms / size);
  if (rms < 0.012) return -1;

  /* Trim leading and trailing quiet so the window sits on the signal. */
  let r1 = 0;
  let r2 = size - 1;
  const thres = 0.2;
  for (let i = 0; i < size / 2; i++) {
    if (Math.abs(buf[i]) < thres) {
      r1 = i;
      break;
    }
  }
  for (let i = 1; i < size / 2; i++) {
    if (Math.abs(buf[size - i]) < thres) {
      r2 = size - i;
      break;
    }
  }
  const b = buf.slice(r1, r2);
  const n = b.length;
  if (n < 256) return -1;

  const c = new Float32Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n - i; j++) c[i] += b[j] * b[j + i];
  }
  let d = 0;
  while (d < n - 1 && c[d] > c[d + 1]) d++;
  let maxval = -1;
  let maxpos = -1;
  for (let i = d; i < n; i++) {
    if (c[i] > maxval) {
      maxval = c[i];
      maxpos = i;
    }
  }
  if (maxpos <= 0) return -1;
  let T0 = maxpos;
  const x1 = c[T0 - 1];
  const x2 = c[T0];
  const x3 = c[T0 + 1];
  const a = (x1 + x3 - 2 * x2) / 2;
  const bb = (x3 - x1) / 2;
  if (a) T0 = T0 - bb / (2 * a);
  const hz = sampleRate / T0;
  if (hz < 60 || hz > 1400) return -1;
  /* Confidence: the peak must be a real fraction of the zero-lag energy. */
  if (maxval / c[0] < 0.5) return -1;
  return hz;
}

export function hzToMidi(hz: number) {
  return 69 + 12 * Math.log2(hz / 440);
}
