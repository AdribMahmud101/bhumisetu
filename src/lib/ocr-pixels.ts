export function luminance(r: number, g: number, b: number) {
  return Math.round(r * 0.2126 + g * 0.7152 + b * 0.0722);
}
export function contrastRange(gray: Uint8Array) {
  const histogram = new Uint32Array(256);
  for (const value of gray) histogram[value]++;
  const percentile = (p: number) => {
    let count = 0;
    for (let value = 0; value < 256; value++) {
      count += histogram[value];
      if (count >= gray.length * p) return value;
    }
    return 255;
  };
  return { black: percentile(0.015), white: percentile(0.98) };
}
// Horizontal projection is only accepted when it clearly improves line alignment.
export function estimateSkew(gray: Uint8Array, width: number, height: number) {
  const { black, white } = contrastRange(gray);
  if (white - black < 20) return 0;
  const threshold = Math.min(180, black + (white - black) * 0.45);
  const points: number[] = [];
  for (let y = Math.floor(height * 0.05); y < height * 0.95; y += 2)
    for (let x = Math.floor(width * 0.05); x < width * 0.95; x += 2)
      if (gray[y * width + x] < threshold) points.push(x, y);
  if (points.length < 200 || points.length / (width * height) > 0.3) return 0;
  const score = (angle: number) => {
    const rows = new Uint32Array(height + 100);
    const slope = Math.tan((angle * Math.PI) / 180);
    for (let i = 0; i < points.length; i += 2) {
      const row =
        Math.round(points[i + 1] + (points[i] - width / 2) * slope) + 50;
      if (row >= 0 && row < rows.length) rows[row]++;
    }
    let total = 0;
    for (const count of rows) total += count * count;
    return total;
  };
  const initial = score(0);
  let best = initial,
    rotation = 0;
  for (let angle = -4; angle <= 4; angle += 0.25) {
    const value = score(angle);
    if (value > best) {
      best = value;
      rotation = angle;
    }
  }
  return best > initial * 1.15 && Math.abs(rotation) >= 0.5 ? rotation : 0;
}
// A bounded tonal adjustment and mild luminance sharpening preserve color and fine marks.
export function enhancePixels(
  data: Uint8ClampedArray,
  width: number,
  height: number,
) {
  const gray = new Uint8Array(width * height);
  for (let i = 0; i < gray.length; i++)
    gray[i] = luminance(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]);
  const { black, white } = contrastRange(gray);
  const span = white - black;
  const gain = span >= 20 && span < 200 ? Math.min(1.65, 220 / span) : 1;
  const lift = white >= 150 && white < 245 ? Math.min(25, 248 - white) : 0;
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const i = y * width + x,
        offset = i * 4;
      let sharp = 0;
      if (x > 0 && y > 0 && x < width - 1 && y < height - 1)
        sharp = Math.max(
          -10,
          Math.min(
            10,
            0.18 *
              (4 * gray[i] -
                gray[i - 1] -
                gray[i + 1] -
                gray[i - width] -
                gray[i + width]),
          ),
        );
      const target = gain > 1 ? (gray[i] - black) * gain + 20 : gray[i] + lift;
      const delta = target - gray[i] + sharp;
      for (let c = 0; c < 3; c++)
        data[offset + c] = Math.max(0, Math.min(255, data[offset + c] + delta));
      data[offset + 3] = 255;
    }
  return { contrast: gain > 1, brightened: lift > 0 && gain === 1 };
}
