// Lays parts out for one file (pure): left to right in rows no wider than
// `width`, rows front to back, `gap` between parts. A part wider than a row gets
// a row of its own. Sizes and positions are the parts' footprints on the plate
// (X, Y); a position is a footprint's front left corner.
export function shelfLayout(sizes: [number, number][], width: number, gap: number): [number, number][] {
  return sizes.map(shelf(width, gap));
}

// The same, one part at a time: each call places the next part and returns its position.
export function shelf(width: number, gap: number): (size: [number, number]) => [number, number] {
  let x = 0;
  let y = 0;
  let rowDepth = 0;
  return ([dx, dy]) => {
    if (x > 0 && x + dx > width) {
      x = 0;
      y += rowDepth + gap;
      rowDepth = 0;
    }
    const position: [number, number] = [x, y];
    x += dx + gap;
    rowDepth = Math.max(rowDepth, dy);
    return position;
  };
}
