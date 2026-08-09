/* Shared locomotion dimensions.
 *
 * `bobPhase` is a complete left-to-left gait cycle, so it contains two
 * footfalls. Step length is therefore the distance travelled between opposite
 * feet, not the distance covered by one whole phase. Keeping this arithmetic
 * in a dependency-free module lets the live controller and offline footstep
 * renderer use the same cadence without importing Three into the audio tools.
 */
export const WALK_SPEED = 1.45;
export const JOG_SPEED = 3.10;
export const WALK_STEP_LENGTH = 0.76;
export const JOG_STEP_LENGTH = 1.02;

/* Takeoff speed, and therefore also the speed a jump lands at on flat ground.
 * It lives here rather than in the controller because the impact sound scales
 * against it: a landing is only "heavy" relative to the ordinary jump, so a
 * private copy of this number in the audio engine would silently mis-scale
 * every landing the moment the jump were retuned. Falling off a bank arrives
 * faster than this and is meant to read as harder. */
export const JUMP_SPEED = 3.75;
export const ANALOG_DEAD_ZONE = 0.12;
export const ANALOG_WALK_EDGE = 0.62;

const clamp01 = v => Math.max(0, Math.min(1, v));
const smooth = v => {
  const t = clamp01(v);
  return t * t * (3 - 2 * t);
};

/**
 * Convert thumb-stick displacement into a continuous travel speed.
 * The inner band gives enough range for careful framing; the outer band adds
 * pace without asking the player to chord a second touch target.
 */
export function analogTravelSpeed(strength) {
  const value = clamp01(Number(strength) || 0);
  if (value <= ANALOG_DEAD_ZONE) return 0;
  if (value <= ANALOG_WALK_EDGE) {
    return WALK_SPEED * smooth(
      (value - ANALOG_DEAD_ZONE) / (ANALOG_WALK_EDGE - ANALOG_DEAD_ZONE),
    );
  }
  return WALK_SPEED + (JOG_SPEED - WALK_SPEED) * smooth(
    (value - ANALOG_WALK_EDGE) / (1 - ANALOG_WALK_EDGE),
  );
}

export function gaitBlend(speed) {
  return smooth((speed - WALK_SPEED) / (JOG_SPEED - WALK_SPEED));
}

export function stepLengthAt(speed) {
  return WALK_STEP_LENGTH
    + (JOG_STEP_LENGTH - WALK_STEP_LENGTH) * gaitBlend(speed);
}

export function gaitCycleRate(speed) {
  return speed / Math.max(0.01, stepLengthAt(speed) * 2);
}

export function stepRate(speed) {
  return speed / Math.max(0.01, stepLengthAt(speed));
}
