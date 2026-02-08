/**
 * Tool registration entry point.
 * Import this file at server startup to register all tools.
 *
 * Each tool file self-registers via registerTool() on import.
 */

import "./text.generate.js";
import "./image.generate.js";
import "./contacts.lookup.js";
import "./contacts.apple.js";
import "./platform.send.js";
import "./sms.send.js";
import "./imessage.send.js";
import "./file.save.js";

import { getAllTools } from "./registry.js";

console.log(
  `[tools] ${getAllTools().length} tools registered:`,
  getAllTools().map((t) => t.id).join(", "),
);
