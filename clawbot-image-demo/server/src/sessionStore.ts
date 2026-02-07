import { nanoid } from "nanoid";

export type Persona =
  | "professional"
  | "friendly_coach"
  | "no_bs"
  | "playful_nerd";

type Session = {
  sessionId: string;
  persona: Persona;
  prompt?: string; // NEW: primary user input
};

const sessions = new Map<string, Session>();

export function getSession(sessionId: string): Session {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, {
      sessionId,
      persona: "professional",
    });
  }
  return sessions.get(sessionId)!;
}

export function setPersona(sessionId: string, persona: string) {
  const s = getSession(sessionId);
  const p = (persona || "professional") as Persona;
  s.persona = p;
}

export function setPrompt(sessionId: string, prompt: string) {
  const s = getSession(sessionId);
  s.prompt = prompt;
}

export function getPrompt(sessionId: string): string | undefined {
  return getSession(sessionId).prompt;
}

export function newSessionId() {
  return nanoid();
}
