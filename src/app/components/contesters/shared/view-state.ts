/**
 * State of a write, shown on the control that started it (spec §2.2).
 * A section's status is not here: the page wraps a section in a block
 * (spec §2.2).
 */
export type ActionState = {
  pending: boolean;
  error?: unknown; // @s2-line
};

export const ACTION_IDLE: ActionState = { pending: false };
