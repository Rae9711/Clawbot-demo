import { getEvolutionForm } from "./avatarEvolution";

export type AgentEventType =
  | "agent_message_sent"
  | "task_completed"
  | "tool_used"
  | "streak_day"
  | "user_feedback_positive"
  | "shared_result";

export type AvatarState = "idle" | "thinking" | "focused" | "success" | "error" | "sleep";

export type CosmeticSlot = "head" | "face" | "back" | "aura" | "badge";

export type Cosmetic = {
  id: string;
  slot: CosmeticSlot;
  name: string;
  unlockLevel: number;
  icon: string;
  asset: string;
};

export type AgentMeta = {
  xp: number;
  level: number;
  streakDays: number;
  lastActiveDate: string | null;
  todayCounters: Record<AgentEventType, number>;
  equipped: Partial<Record<CosmeticSlot, string>>;
  customAssets: Partial<Record<CosmeticSlot, string>>;
  inventory: string[];
  color: string;
};

export type EventApplyResult = {
  next: AgentMeta;
  gainedXp: number;
  leveledUp: boolean;
};

export const COSMETICS: Cosmetic[] = [
  { id: "head-crown", slot: "head", name: "云核冠冕", unlockLevel: 7, icon: "👑", asset: "/cosmetics/hat-crown.svg" },
  { id: "face-visor", slot: "face", name: "智能面罩", unlockLevel: 5, icon: "🕶️", asset: "/cosmetics/face-visor.svg" },
  { id: "back-pack", slot: "back", name: "任务背舱", unlockLevel: 5, icon: "🎒", asset: "/cosmetics/back-pack.svg" },
  { id: "back-wing", slot: "back", name: "数据翼", unlockLevel: 10, icon: "🪽", asset: "/cosmetics/back-wing.svg" },
  { id: "aura-glow", slot: "aura", name: "数据光环", unlockLevel: 2, icon: "✨", asset: "/cosmetics/aura-glow.svg" },
  { id: "aura-sun", slot: "aura", name: "轨道环", unlockLevel: 9, icon: "☀️", asset: "/cosmetics/aura-sun.svg" },
  { id: "back-particles", slot: "back", name: "数据粒子", unlockLevel: 4, icon: "💠", asset: "/cosmetics/effect-particles.svg" },
  { id: "back-ribbon", slot: "back", name: "庆祝彩带", unlockLevel: 8, icon: "🎊", asset: "/cosmetics/effect-ribbon.svg" },
  { id: "badge-streak", slot: "badge", name: "连击徽章", unlockLevel: 5, icon: "🏅", asset: "/cosmetics/badge-streak.svg" },
  { id: "badge-pro", slot: "badge", name: "协作专家", unlockLevel: 10, icon: "🛡️", asset: "/cosmetics/badge-pro.svg" },
];

const DAILY_CAPS: Record<AgentEventType, number> = {
  agent_message_sent: 20,
  task_completed: 10,
  tool_used: 40,
  streak_day: 1,
  user_feedback_positive: 8,
  shared_result: 5,
};

const BASE_XP: Record<AgentEventType, number> = {
  agent_message_sent: 5,
  task_completed: 40,
  tool_used: 6,
  streak_day: 20,
  user_feedback_positive: 20,
  shared_result: 35,
};

const LEVEL_THRESHOLDS = [0, 80, 180, 320, 520, 780, 1120, 1560, 2120, 2820, 3680, 4720];

function isoDay(ts: number): string {
  return new Date(ts).toISOString().slice(0, 10);
}

export function levelFromXp(xp: number): number {
  let level = 1;
  for (let i = 1; i < LEVEL_THRESHOLDS.length; i += 1) {
    if (xp >= LEVEL_THRESHOLDS[i]) level = i + 1;
  }
  return level;
}

export function nextLevelXp(level: number): number {
  const idx = Math.max(1, level);
  return LEVEL_THRESHOLDS[idx] ?? LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
}

export function currentLevelXp(level: number): number {
  const idx = Math.max(0, level - 1);
  return LEVEL_THRESHOLDS[idx] ?? 0;
}

export function getFormByLevel(level: number): { name: string; lottieSkin: string; shellAsset: string } {
  const form = getEvolutionForm(level);
  return {
    name: form.name,
    lottieSkin: form.lottieSkin,
    shellAsset: form.shellAsset,
  };
}

export function getLevelFx(level: number): {
  scale: number;
  glowBlur: number;
  glowAlpha: number;
  filter: string;
} {
  if (level >= 10) {
    return {
      scale: 1.08,
      glowBlur: 32,
      glowAlpha: 0.4,
      filter: "hue-rotate(-12deg) saturate(1.25)",
    };
  }
  if (level >= 5) {
    return {
      scale: 1.02,
      glowBlur: 24,
      glowAlpha: 0.3,
      filter: "hue-rotate(8deg) saturate(1.12)",
    };
  }
  return {
    scale: 1,
    glowBlur: 18,
    glowAlpha: 0.2,
    filter: "none",
  };
}

export function getDefaultMeta(): AgentMeta {
  return {
    xp: 0,
    level: 1,
    streakDays: 0,
    lastActiveDate: null,
    todayCounters: {
      agent_message_sent: 0,
      task_completed: 0,
      tool_used: 0,
      streak_day: 0,
      user_feedback_positive: 0,
      shared_result: 0,
    },
    equipped: {},
    customAssets: {},
    inventory: [],
    color: "#3b82f6",
  };
}

export function loadMeta(key: string): AgentMeta {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return getDefaultMeta();
    const merged = { ...getDefaultMeta(), ...JSON.parse(raw) } as AgentMeta;
    const validIds = new Set(COSMETICS.map((item) => item.id));
    const nextEquipped: Partial<Record<CosmeticSlot, string>> = {};
    (Object.entries(merged.equipped) as [CosmeticSlot, string][]).forEach(([slot, cosmeticId]) => {
      if (validIds.has(cosmeticId)) nextEquipped[slot] = cosmeticId;
    });
    return {
      ...merged,
      inventory: merged.inventory.filter((id) => validIds.has(id)),
      equipped: nextEquipped,
    };
  } catch {
    return getDefaultMeta();
  }
}

export function saveMeta(key: string, meta: AgentMeta) {
  localStorage.setItem(key, JSON.stringify(meta));
}

function withTodayCounters(meta: AgentMeta, nowTs: number): AgentMeta {
  const today = isoDay(nowTs);
  if (meta.lastActiveDate === today) return meta;
  return {
    ...meta,
    todayCounters: {
      agent_message_sent: 0,
      task_completed: 0,
      tool_used: 0,
      streak_day: 0,
      user_feedback_positive: 0,
      shared_result: 0,
    },
  };
}

function applyUnlocks(meta: AgentMeta): AgentMeta {
  const unlocked = COSMETICS.filter((item) => item.unlockLevel <= meta.level).map((item) => item.id);
  const mergedInventory = Array.from(new Set([...meta.inventory, ...unlocked]));
  const next = { ...meta, inventory: mergedInventory };

  const bySlot: Record<CosmeticSlot, Cosmetic[]> = {
    head: [],
    face: [],
    back: [],
    aura: [],
    badge: [],
  };
  for (const c of COSMETICS) bySlot[c.slot].push(c);

  const equipped = { ...next.equipped };
  (Object.keys(bySlot) as CosmeticSlot[]).forEach((slot) => {
    if (equipped[slot]) return;
    const best = bySlot[slot]
      .filter((item) => mergedInventory.includes(item.id))
      .sort((a, b) => b.unlockLevel - a.unlockLevel)[0];
    if (best) equipped[slot] = best.id;
  });

  return { ...next, equipped };
}

export function equipCosmetic(meta: AgentMeta, slot: CosmeticSlot, cosmeticId: string): AgentMeta {
  if (!meta.inventory.includes(cosmeticId)) return meta;
  return { ...meta, equipped: { ...meta.equipped, [slot]: cosmeticId } };
}

export function setCustomCosmeticAsset(meta: AgentMeta, slot: CosmeticSlot, asset: string): AgentMeta {
  const value = asset.trim();
  if (!value) {
    const nextCustom = { ...meta.customAssets };
    delete nextCustom[slot];
    return { ...meta, customAssets: nextCustom };
  }
  return {
    ...meta,
    customAssets: {
      ...meta.customAssets,
      [slot]: value,
    },
  };
}

export function applyEvent(meta: AgentMeta, eventType: AgentEventType, nowTs = Date.now()): EventApplyResult {
  const updated = withTodayCounters(meta, nowTs);
  const count = updated.todayCounters[eventType] ?? 0;
  const cap = DAILY_CAPS[eventType] ?? 0;

  let gainedXp = 0;
  if (count < cap) {
    const streakMultiplier = 1 + Math.min(updated.streakDays, 20) * 0.05;
    const value = BASE_XP[eventType] ?? 0;
    gainedXp = Math.round(value * streakMultiplier);
  }

  const today = isoDay(nowTs);
  let streakDays = updated.streakDays;

  if (eventType === "streak_day" && count < cap) {
    if (!updated.lastActiveDate) {
      streakDays = 1;
    } else {
      const prev = new Date(updated.lastActiveDate + "T00:00:00.000Z").getTime();
      const nowDay = new Date(today + "T00:00:00.000Z").getTime();
      const diff = Math.round((nowDay - prev) / 86_400_000);
      if (diff === 1) streakDays += 1;
      else if (diff > 1) streakDays = 1;
    }
  }

  const nextXp = updated.xp + gainedXp;
  const nextLevel = levelFromXp(nextXp);
  const leveledUp = nextLevel > updated.level;

  const next: AgentMeta = applyUnlocks({
    ...updated,
    xp: nextXp,
    level: nextLevel,
    streakDays,
    lastActiveDate: today,
    todayCounters: {
      ...updated.todayCounters,
      [eventType]: Math.min(cap, count + 1),
    },
  });

  return { next, gainedXp, leveledUp };
}

export function getCosmeticById(id?: string): Cosmetic | undefined {
  if (!id) return undefined;
  return COSMETICS.find((item) => item.id === id);
}
