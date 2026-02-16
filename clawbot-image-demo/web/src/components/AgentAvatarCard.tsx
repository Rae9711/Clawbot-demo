import React, { useEffect, useMemo, useState } from "react";
import Lottie from "lottie-react";
import type { LottieRefCurrentProps } from "lottie-react";
import {
  COSMETICS,
  type AgentMeta,
  type AvatarState,
  type CosmeticSlot,
  currentLevelXp,
  getCosmeticById,
  getFormByLevel,
  getLevelFx,
  nextLevelXp,
} from "../agentMeta";
import { EVOLUTION_STATES } from "../avatarEvolution";

type Props = {
  agentName: string;
  meta: AgentMeta;
  state: AvatarState;
  lastGainXp: number;
  onSetColor: (color: string) => void;
  onEquip: (slot: CosmeticSlot, cosmeticId: string) => void;
  onSetCustomAsset: (slot: CosmeticSlot, asset: string) => void;
  onPositiveFeedback: () => void;
  onShareResult: () => void;
};

const SLOT_LABELS: Record<CosmeticSlot, string> = {
  head: "Head",
  face: "Face",
  back: "Back",
  aura: "光环",
  badge: "徽章",
};

const DEMO_STATES: AvatarState[] = ["idle", "thinking", "focused", "success", "error", "sleep"];

function stateLabel(state: AvatarState) {
  if (state === "focused") return "focused";
  if (state === "success") return "success";
  if (state === "error") return "error";
  if (state === "sleep") return "sleep";
  if (state === "thinking") return "thinking";
  return "idle";
}

export default function AgentAvatarCard({
  agentName,
  meta,
  state,
  lastGainXp,
  onSetColor,
  onEquip,
  onSetCustomAsset,
  onPositiveFeedback,
  onShareResult,
}: Props) {
  const [previewLevel, setPreviewLevel] = useState<number | null>(null);
  const displayLevel = previewLevel ?? meta.level;
  const form = getFormByLevel(displayLevel);
  const levelFx = getLevelFx(displayLevel);
  const [animationData, setAnimationData] = useState<any | null>(null);
  const [showDemo, setShowDemo] = useState(false);
  const [previewState, setPreviewState] = useState<AvatarState | null>(null);
  const lottieRef = React.useRef<LottieRefCurrentProps | null>(null);

  const displayState = previewState ?? state;

  useEffect(() => {
    let mounted = true;
    fetch(`/lottie/${form.lottieSkin}`)
      .then((res) => res.json())
      .then((json) => {
        if (mounted) setAnimationData(json);
      })
      .catch(() => {
        if (mounted) setAnimationData(null);
      });

    return () => {
      mounted = false;
    };
  }, [form.lottieSkin]);

  const nextXp = nextLevelXp(meta.level);
  const currentXpFloor = currentLevelXp(meta.level);
  const levelSpan = Math.max(1, nextXp - currentXpFloor);
  const progress = Math.min(100, Math.round(((meta.xp - currentXpFloor) / levelSpan) * 100));
  const stateConfig = useMemo(() => EVOLUTION_STATES[displayState], [displayState]);
  const stateSegment = stateConfig.segment;
  const stateLoop = stateConfig.loop ?? true;

  const stateFace: Record<AvatarState, string> = {
    idle: "(｡•̀ᴗ-)✧",
    thinking: "( •̀ .̫ •́ )✧",
    focused: "(ง •̀_•́)ง",
    success: "٩(ˊᗜˋ*)و",
    error: "(；′⌒`)",
    sleep: "(－_－) zzZ",
  };

  const stateText: Record<AvatarState, string> = {
    idle: "待机中，随时听你指令",
    thinking: "正在思考方案…",
    focused: "已进入执行专注状态",
    success: "完成啦，结果已准备好",
    error: "这一步失败了，我在重试",
    sleep: "离线休眠中",
  };

  const equippedHead = getCosmeticById(meta.equipped.head);
  const equippedBack = getCosmeticById(meta.equipped.back);
  const equippedAura = getCosmeticById(meta.equipped.aura);
  const equippedBadge = getCosmeticById(meta.equipped.badge);

  useEffect(() => {
    if (!lottieRef.current || !animationData) return;
    lottieRef.current.setSpeed(stateConfig.speed ?? 0.9);
    lottieRef.current.playSegments(stateSegment, true);
  }, [animationData, stateConfig.speed, stateSegment]);

  return (
    <div
      style={{
        background: "white",
        borderRadius: 12,
        border: "1px solid #E5E7EB",
        padding: 16,
        marginBottom: 16,
      }}
    >
      <style>
        {`@keyframes avatarBreath {
            0% { transform: translateY(0px) scale(1); }
            50% { transform: translateY(-2px) scale(1.018); }
            100% { transform: translateY(0px) scale(1); }
          }
          @keyframes thinkingPulse {
            0% { opacity: .35; transform: scale(.96); }
            50% { opacity: .8; transform: scale(1.04); }
            100% { opacity: .35; transform: scale(.96); }
          }
          @keyframes successBurst {
            0% { opacity: 0; transform: scale(.72); }
            20% { opacity: 1; transform: scale(1); }
            100% { opacity: 0; transform: scale(1.2); }
          }`}
      </style>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{agentName} 养成中心</div>
          <div style={{ fontSize: 12, color: "#6B7280" }}>
            Lv {displayLevel}{previewLevel !== null ? "（演示）" : ""} · {form.name} · Lottie: {form.lottieSkin}
          </div>
        </div>
        {lastGainXp > 0 && (
          <div
            style={{
              fontSize: 12,
              color: "#059669",
              fontWeight: 700,
              background: "#ECFDF5",
              borderRadius: 20,
              padding: "4px 8px",
              height: "fit-content",
            }}
          >
            +{lastGainXp} XP
          </div>
        )}
      </div>

      <div
        style={{
          borderRadius: 12,
          background: `radial-gradient(circle at 50% 40%, ${meta.color}22, #ffffff)`,
          border: "1px solid #F3F4F6",
          padding: 14,
          marginBottom: 10,
          position: "relative",
          minHeight: 220,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 12,
            top: 12,
            zIndex: 6,
            background: "rgba(255,255,255,0.92)",
            border: "1px solid #E5E7EB",
            borderRadius: 12,
            padding: "8px 10px",
            maxWidth: 210,
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 700, color: "#374151" }}>
            {stateFace[displayState]}
          </div>
          <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>
            {stateText[displayState]}
          </div>
        </div>

        <img
          src={form.shellAsset}
          alt="evolution-shell"
          style={{
            position: "absolute",
            width: 202,
            height: 202,
            opacity: 0.45,
            filter: `drop-shadow(0 0 ${Math.round(levelFx.glowBlur * 0.75)}px ${meta.color})`,
          }}
        />

        {(equippedAura || meta.level >= 2) && (
          <img
            src={(equippedAura?.asset ?? "/cosmetics/aura-glow.svg")}
            alt="aura"
            style={{
              position: "absolute",
              width: 172,
              height: 172,
              opacity: 0.7,
              filter: `drop-shadow(0 0 ${levelFx.glowBlur}px ${meta.color})`,
            }}
          />
        )}

        {(equippedBack || meta.level >= 4) && (
          <img
            src={(meta.customAssets.back || equippedBack?.asset) ?? "/cosmetics/effect-particles.svg"}
            alt="back"
            style={{
              position: "absolute",
              width: 196,
              height: 118,
              bottom: 18,
              opacity: displayState === "thinking" ? 0.75 : 0.95,
            }}
          />
        )}

        {meta.level >= 10 && (
          <img
            src="/cosmetics/hat-crown.svg"
            alt="crown"
            style={{
              position: "absolute",
              width: 86,
              top: 12,
              zIndex: 4,
            }}
          />
        )}

        {(equippedHead || meta.customAssets.head) && (
          <img
            src={(meta.customAssets.head || equippedHead?.asset)!}
            alt="head"
            style={{
              position: "absolute",
              width: 72,
              top: 22,
              zIndex: 3,
            }}
          />
        )}

        <div
          style={{
            width: 180,
            height: 180,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transform: `scale(${displayState === "success" ? levelFx.scale + 0.04 : levelFx.scale})`,
            transition: "all 0.2s",
            filter: `${levelFx.filter} drop-shadow(0 0 ${levelFx.glowBlur}px ${meta.color}${Math.round(levelFx.glowAlpha * 255)
              .toString(16)
              .padStart(2, "0")})`,
            animation:
              displayState === "thinking"
                ? "avatarBreath 2.2s ease-in-out infinite"
                : "avatarBreath 2.8s ease-in-out infinite",
            zIndex: 2,
          }}
        >
          {animationData ? (
            <Lottie
              lottieRef={lottieRef}
              animationData={animationData}
              loop={stateLoop}
              autoplay
              style={{ width: 180, height: 180 }}
            />
          ) : (
            <div style={{ fontSize: 14, color: "#6B7280" }}>Lottie 加载中…</div>
          )}
        </div>

        {meta.level >= 8 && (
          <img
            src="/cosmetics/effect-ribbon.svg"
            alt="ribbon"
            style={{ position: "absolute", width: 188, bottom: 2, opacity: displayState === "success" ? 1 : 0.6 }}
          />
        )}

        {equippedBadge && (
          <img
            src={equippedBadge.asset}
            alt="badge"
            style={{ position: "absolute", right: 6, bottom: 6, width: 34, height: 34 }}
          />
        )}
      </div>

      <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 8 }}>
        状态动画：{stateLabel(displayState)}（idle / thinking / focused / success / error / sleep）
      </div>

      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 6 }}>
          形态演示（点击切 Lv）
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
          <button
            onClick={() => setPreviewLevel(null)}
            style={{
              border: "1px solid #D1D5DB",
              borderRadius: 20,
              background: previewLevel === null ? "#EEF2FF" : "white",
              padding: "4px 10px",
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            跟随等级
          </button>
          {[1, 5, 10].map((lv) => (
            <button
              key={lv}
              onClick={() => setPreviewLevel(lv)}
              style={{
                border: "1px solid #D1D5DB",
                borderRadius: 20,
                background: previewLevel === lv ? "#EEF2FF" : "white",
                padding: "4px 10px",
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              Lv{lv}
            </button>
          ))}
        </div>

        <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 6 }}>
          演示模式（点击开/关）
          {showDemo ? (previewState ? `：${previewState}` : "：手动中") : "：已关闭"}
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button
            onClick={() => {
              setShowDemo((prev) => {
                const next = !prev;
                if (!next) setPreviewState(null);
                return next;
              });
            }}
            style={{
              border: "1px solid #D1D5DB",
              borderRadius: 20,
              background: showDemo ? "#EEF2FF" : "white",
              padding: "4px 10px",
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            {showDemo ? "关闭展示模式" : "开启展示模式"}
          </button>
          {showDemo && DEMO_STATES.map((demo) => (
            <button
              key={demo}
              onClick={() => setPreviewState(demo)}
              style={{
                border: "1px solid #D1D5DB",
                borderRadius: 20,
                background: previewState === demo ? "#EEF2FF" : "white",
                padding: "4px 10px",
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              {demo}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
          <span>XP {meta.xp}</span>
          <span>下一级 {Math.max(0, nextXp - meta.xp)}</span>
        </div>
        <div style={{ height: 8, borderRadius: 999, background: "#F3F4F6", overflow: "hidden" }}>
          <div style={{ width: `${progress}%`, height: "100%", background: "#4F46E5" }} />
        </div>
        <div style={{ marginTop: 6, fontSize: 12, color: "#6B7280" }}>连续互动 {meta.streakDays} 天</div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button
          onClick={onPositiveFeedback}
          style={{
            flex: 1,
            border: "1px solid #E5E7EB",
            borderRadius: 8,
            background: "white",
            padding: "6px 10px",
            cursor: "pointer",
            fontSize: 12,
          }}
        >
          有帮助 +XP
        </button>
        <button
          onClick={onShareResult}
          style={{
            flex: 1,
            border: "1px solid #E5E7EB",
            borderRadius: 8,
            background: "white",
            padding: "6px 10px",
            cursor: "pointer",
            fontSize: 12,
          }}
        >
          分享结果 +XP
        </button>
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={{ display: "block", fontSize: 12, color: "#6B7280", marginBottom: 4 }}>
          自定义主题色
        </label>
        <input
          type="color"
          value={meta.color}
          onChange={(e) => onSetColor(e.target.value)}
          style={{ width: "100%", height: 34, borderRadius: 6, border: "1px solid #E5E7EB" }}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {(Object.keys(SLOT_LABELS) as CosmeticSlot[]).map((slot) => {
          const options = COSMETICS.filter((item) => item.slot === slot && meta.inventory.includes(item.id));
          return (
            <div key={slot}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>{SLOT_LABELS[slot]}</div>
              <select
                value={meta.equipped[slot] ?? ""}
                onChange={(e) => onEquip(slot, e.target.value)}
                style={{ width: "100%", padding: 6, borderRadius: 8, border: "1px solid #E5E7EB", fontSize: 12 }}
              >
                <option value="">未装备</option>
                {options.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.icon} {opt.name}
                  </option>
                ))}
              </select>
              <input
                value={meta.customAssets[slot] ?? ""}
                onChange={(e) => onSetCustomAsset(slot, e.target.value)}
                placeholder="自定义素材URL或/public路径"
                style={{
                  width: "100%",
                  marginTop: 6,
                  padding: 6,
                  borderRadius: 8,
                  border: "1px solid #E5E7EB",
                  fontSize: 12,
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
