import { useMemo } from "react";

/**
 * Simulated QR code. Deterministic pixel grid derived from the input string.
 * Not a real QR — used for visual "digital verification" per spec.
 */
export function QRCodeSVG({ value, size = 96 }: { value: string; size?: number }) {
  const grid = 21;
  const cells = useMemo(() => hashGrid(value, grid), [value]);
  const cell = size / grid;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="block">
      <rect width={size} height={size} fill="white" />
      {cells.map((row, y) =>
        row.map((on, x) =>
          on ? (
            <rect
              key={`${x}-${y}`}
              x={x * cell}
              y={y * cell}
              width={cell}
              height={cell}
              fill="black"
            />
          ) : null,
        ),
      )}
      {/* Finder patterns */}
      {finder(0, 0, cell)}
      {finder((grid - 7) * cell, 0, cell)}
      {finder(0, (grid - 7) * cell, cell)}
    </svg>
  );
}

function finder(x: number, y: number, cell: number) {
  const s = cell * 7;
  return (
    <g key={`f-${x}-${y}`}>
      <rect x={x} y={y} width={s} height={s} fill="white" />
      <rect x={x} y={y} width={s} height={s} fill="none" stroke="black" strokeWidth={cell} />
      <rect x={x + cell * 2} y={y + cell * 2} width={cell * 3} height={cell * 3} fill="black" />
    </g>
  );
}

function hashGrid(input: string, size: number): boolean[][] {
  // Simple deterministic hash → bit grid
  let seed = 2166136261;
  for (let i = 0; i < input.length; i++) {
    seed ^= input.charCodeAt(i);
    seed = Math.imul(seed, 16777619);
  }
  const rows: boolean[][] = [];
  for (let y = 0; y < size; y++) {
    const row: boolean[] = [];
    for (let x = 0; x < size; x++) {
      seed = Math.imul(seed ^ (x * 73856093) ^ (y * 19349663), 2246822519);
      row.push(((seed >>> 3) & 1) === 1);
    }
    rows.push(row);
  }
  return rows;
}
