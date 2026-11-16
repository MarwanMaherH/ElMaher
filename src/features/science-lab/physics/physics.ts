/** Physics core: projectile motion and Newton's second law with friction. */

export const GRAVITY = { earth: 9.8, moon: 1.62, mars: 3.71 } as const;
export type Planet = keyof typeof GRAVITY;

const rad = (deg: number) => (deg * Math.PI) / 180;

export interface ProjectileInput {
  /** launch speed, m/s */
  v: number;
  /** launch angle, degrees above horizontal */
  angle: number;
  /** launch height, m */
  h: number;
  /** gravity, m/s^2 */
  g: number;
}

export interface ProjectileResult {
  flightTime: number;
  range: number;
  maxHeight: number;
  timeToPeak: number;
  impactSpeed: number;
  at: (t: number) => { x: number; y: number };
}

export function projectile({ v, angle, h, g }: ProjectileInput): ProjectileResult {
  const vx = v * Math.cos(rad(angle));
  const vy = v * Math.sin(rad(angle));
  const flightTime = (vy + Math.sqrt(vy * vy + 2 * g * h)) / g;
  const timeToPeak = vy > 0 ? vy / g : 0;
  const maxHeight = h + (vy > 0 ? (vy * vy) / (2 * g) : 0);
  const vyEnd = vy - g * flightTime;
  return {
    flightTime,
    range: vx * flightTime,
    maxHeight,
    timeToPeak,
    impactSpeed: Math.hypot(vx, vyEnd),
    at: (t) => {
      const tt = Math.min(Math.max(t, 0), flightTime);
      return { x: vx * tt, y: Math.max(0, h + vy * tt - 0.5 * g * tt * tt) };
    },
  };
}

export interface BlockInput {
  /** applied force, N */
  force: number;
  /** mass, kg */
  mass: number;
  /** kinetic friction coefficient */
  mu: number;
  g?: number;
}

export interface BlockResult {
  friction: number;
  net: number;
  acceleration: number;
  moving: boolean;
  velocityAt: (t: number) => number;
  distanceAt: (t: number) => number;
}

/** Block on a horizontal surface; static friction threshold = mu * N. */
export function slideBlock({ force, mass, mu, g = 9.8 }: BlockInput): BlockResult {
  const maxFriction = mu * mass * g;
  const moving = force > maxFriction;
  const friction = moving ? maxFriction : Math.min(force, maxFriction);
  const net = moving ? force - maxFriction : 0;
  const acceleration = net / mass;
  return {
    friction,
    net,
    acceleration,
    moving,
    velocityAt: (t) => acceleration * t,
    distanceAt: (t) => 0.5 * acceleration * t * t,
  };
}
