export type PointerForces = Readonly<{ active: boolean; x: number; y: number; radius: number; repelRadius: number; repelForce: number; attractForce: number; returnSpeed: number; damping: number }>;
export type MovingCell = { x: number; y: number; vx: number; vy: number };
const clamp = (x: number, min: number, max: number) => Math.max(min, Math.min(max, x));
/** Reference force law, expressed as one fixed 1/60-second integration step. */
export function stepCell(p: MovingCell, homeX: number, homeY: number, mouse: PointerForces) {
  const dx = homeX + p.x - mouse.x, dy = homeY + p.y - mouse.y;
  const distance = Math.hypot(dx, dy);
  if (mouse.active && distance > 0 && distance < mouse.radius) {
    if (distance < mouse.repelRadius) {
      const force = (1 - distance / mouse.repelRadius) * mouse.repelForce * mouse.repelRadius * 0.15 / distance;
      p.vx += dx * force; p.vy += dy * force;
    } else if (mouse.radius > mouse.repelRadius) {
      const force = (1 - (distance - mouse.repelRadius) / (mouse.radius - mouse.repelRadius)) * mouse.attractForce * (mouse.radius - mouse.repelRadius) * 0.08 / distance;
      p.vx -= dx * force; p.vy -= dy * force;
    }
  }
  const ease = Math.pow(Math.min(1, Math.hypot(p.x, p.y) / 300), 3);
  const homeForce = mouse.returnSpeed + ease * 0.12;
  const damping = clamp(mouse.damping - ease * 0.08, 0.7, 0.98);
  p.vx = (p.vx - p.x * homeForce) * damping;
  p.vy = (p.vy - p.y * homeForce) * damping;
  p.x += p.vx; p.y += p.vy;
}
/** Sparse state contains only displaced lit cells; rest is the unchanged dither mask. */
export class PointerSimulation {
  readonly cells = new Map<number, MovingCell>();
  private remainder = 0;
  constructor(readonly mask: Uint8Array, readonly columns: number, readonly rows: number, readonly width: number, readonly height: number) {}
  clear() { this.cells.clear(); this.remainder = 0; }
  advance(seconds: number, pointer: PointerForces) {
    this.remainder += clamp(seconds, 0, 0.1);
    const cw = this.width / this.columns, ch = this.height / this.rows;
    while (this.remainder + 1e-9 >= 1 / 60) {
      this.remainder -= 1 / 60;
      if (pointer.active && (pointer.repelForce > 0 || pointer.attractForce > 0)) {
        const left = Math.max(0, Math.floor((pointer.x - pointer.radius) / cw)), right = Math.min(this.columns - 1, Math.ceil((pointer.x + pointer.radius) / cw));
        const top = Math.max(0, Math.floor((pointer.y - pointer.radius) / ch)), bottom = Math.min(this.rows - 1, Math.ceil((pointer.y + pointer.radius) / ch));
        for (let y = top; y <= bottom; y++) for (let x = left; x <= right; x++) {
          const index = y * this.columns + x;
          if (this.mask[index] && !this.cells.has(index) && Math.hypot((x + 0.5) * cw - pointer.x, (y + 0.5) * ch - pointer.y) < pointer.radius)
            this.cells.set(index, { x: 0, y: 0, vx: 0, vy: 0 });
        }
      }
      for (const [index, cell] of this.cells) {
        stepCell(cell, (index % this.columns + 0.5) * cw, (Math.floor(index / this.columns) + 0.5) * ch, pointer);
        if (Math.abs(cell.x) + Math.abs(cell.y) + Math.abs(cell.vx) + Math.abs(cell.vy) < 0.002) this.cells.delete(index);
      }
    }
  }
}
