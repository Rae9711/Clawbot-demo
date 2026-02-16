import type { AvatarState } from "./agentMeta";

export type EvolutionForm = {
  minLevel: number;
  name: string;
  shellAsset: string;
  lottieSkin: string;
};

export type EvolutionState = {
  segment: [number, number];
  overlayAsset?: string;
  loop?: boolean;
  speed?: number;
};

export const EVOLUTION_FORMS: EvolutionForm[] = [
  {
    minLevel: 1,
    name: "云核体",
    shellAsset: "/avatar-pack/evo-core-lv1.svg",
    lottieSkin: "cloud-core-base.json",
  },
  {
    minLevel: 5,
    name: "云核体·进阶",
    shellAsset: "/avatar-pack/evo-core-lv5.svg",
    lottieSkin: "cloud-core-base.json",
  },
  {
    minLevel: 10,
    name: "云核体·觉醒",
    shellAsset: "/avatar-pack/evo-core-lv10.svg",
    lottieSkin: "cloud-core-base.json",
  },
];

export const EVOLUTION_STATES: Record<AvatarState, EvolutionState> = {
  idle: { segment: [0, 44], loop: true, speed: 0.86 },
  focused: { segment: [45, 89], loop: true, speed: 0.92 },
  thinking: { segment: [90, 134], overlayAsset: "/avatar-pack/state-thinking.svg", loop: true, speed: 0.82 },
  success: { segment: [135, 179], overlayAsset: "/avatar-pack/state-success.svg", loop: false, speed: 1.02 },
  error: { segment: [45, 89], overlayAsset: "/avatar-pack/state-error.svg", loop: true, speed: 0.78 },
  sleep: { segment: [0, 24], overlayAsset: "/avatar-pack/state-sleep.svg", loop: true, speed: 0.68 },
};

export function getEvolutionForm(level: number): EvolutionForm {
  let form = EVOLUTION_FORMS[0];
  for (const item of EVOLUTION_FORMS) {
    if (level >= item.minLevel) form = item;
  }
  return form;
}
