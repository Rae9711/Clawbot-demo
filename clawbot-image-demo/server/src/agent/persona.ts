import type { Persona } from "../sessionStore.js";

export function applyPersona(persona: Persona, content: string) {
  switch (persona) {
    case "professional":
      return `Summary:\n${content}\n\nNext steps:\n- Posted to team channel.\n`;
    case "friendly_coach":
      return `Alright — here’s the key takeaway in plain English:\n\n${content}\n\nI’ve shared it with the team so everyone’s aligned.`;
    case "no_bs":
      return `Here’s what matters:\n${content}\n\nSent to the team. Done.`;
    case "playful_nerd":
      return `🧠 Behold, the distilled essence:\n\n${content}\n\nI yeeted it to the team channel (with consent, like a civilized robot).`;
  }
}
