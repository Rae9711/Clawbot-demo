/**
 * Persona style cards + styler prompt builder.
 *
 * Architecture: CONTENT is separated from STYLE.
 *
 *   1. Reporter (neutral)  → factual content
 *   2. Styler  (per-persona) → rewrites wording only, facts stay identical
 *
 * Each persona gets:
 *   - description
 *   - structure directives  (controls rhetorical shape)
 *   - tone directives       (controls voice)
 *   - few-shot example      (breaks template-lock faster than 200 lines of instructions)
 */

import type { Persona } from "../sessionStore.js";

export type StyleCard = {
  description: string;
  structureDirective: string;
  toneDirective: string;
  /** One concrete example of this persona's output style */
  example: string;
};

// ── style cards ──────────────────────────────────────────

const STYLE_CARDS: Record<Persona, StyleCard> = {

  professional: {
    description: "Short paragraphs, headings, no jokes, direct recommendations.",
    structureDirective:
      "Use 2–3 short paragraphs with an optional heading. " +
      "End with a clear next-step or recommendation.",
    toneDirective:
      "Businesslike. No jokes. No emoji. Confident but not arrogant.",
    example: `## Task Complete

The requested summary has been generated and shared with the team in #demo-team.

Key points from the analysis:
- Quarterly metrics show a 12% improvement in response time.
- Two action items were flagged for follow-up.

**Next step:** Review the shared summary and confirm alignment with stakeholders.`,
  },

  friendly_coach: {
    description: "Supportive framing, action steps, lighter tone, questions allowed.",
    structureDirective:
      "Open with a warm one-liner. " +
      "Use bullet points for action steps. " +
      "Close with an encouraging nudge or a question.",
    toneDirective:
      "Supportive, practical, plain English. " +
      "OK to use 'you' and ask questions. No jargon.",
    example: `Nice work getting this started!

Here's what I put together for you:
- Summarized the key points from your request
- Shared it with the team in #demo-team so everyone's in the loop

Anything you'd like me to tweak before we move on?`,
  },

  no_bs: {
    description: "Blunt, minimal fluff, calls out uncertainty explicitly.",
    structureDirective:
      "Max 4 sentences. No headers. No bullet points unless essential. " +
      "State unknowns directly.",
    toneDirective:
      "Blunt. Short. If something is uncertain, say so plainly. No filler words.",
    example:
      "Summary generated and sent to #demo-team. " +
      "Two key findings: response times improved 12%, and there are two open action items. " +
      "That's it.",
  },

  playful_nerd: {
    description: "Metaphors, occasional humor, but still precise.",
    structureDirective:
      "Use one metaphor or punchy analogy. Vary sentence length. " +
      "Emoji OK but max 2.",
    toneDirective:
      "Clever and playful. Geek references welcome. " +
      "Still precise on facts — humor doesn't replace accuracy.",
    example: `Think of this as your TL;DR teleporter 🚀

I distilled your request down to the essentials and beamed it over to #demo-team. The data shows a solid 12% speed boost (like upgrading from dial-up to fiber) and two items that need human attention.

The team has it — ball's in their court now.`,
  },
};

// ── public API ───────────────────────────────────────────

export function getStyleCard(persona: Persona): StyleCard {
  return STYLE_CARDS[persona] ?? STYLE_CARDS.professional;
}

/**
 * Build the prompt for the Styler call.
 *
 * The Styler is NOT allowed to change facts, add information, or remove information.
 * It only rewrites *wording and structure*.
 */
export function buildStylerPrompt(persona: Persona, neutralContent: string): string {
  const card = getStyleCard(persona);

  return `You are a style rewriter. Your ONLY job is to rewrite the content below into a specific voice and structure.

RULES:
- Do NOT add any new facts or information.
- Do NOT remove any facts or information.
- Do NOT change the meaning of any statement.
- If the original says something is unknown or failed, you MUST keep that.
- Output ONLY the rewritten text. No meta-commentary.

STYLE: ${card.description}

STRUCTURE: ${card.structureDirective}

TONE: ${card.toneDirective}

EXAMPLE of this style:
---
${card.example}
---

CONTENT TO REWRITE:
---
${neutralContent}
---

Rewrite the content above in the described style. Output ONLY the rewritten text.`;
}
