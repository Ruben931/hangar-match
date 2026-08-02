/**
 * Connexion légitime au jeu :
 * - détecte si StarCitizen.exe / RSI Launcher tourne
 * - lit Game.log en local (pas de mémoire / injection)
 */
import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const PROCESS_NAMES = [
  "starcitizen.exe",
  "starcitizen",
  "rsi launcher.exe",
  "rsilauncher.exe",
];

function candidateLogPaths() {
  const home = os.homedir();
  const drives = ["C:", "D:", "E:", "F:"];
  const builds = ["LIVE", "PTU", "EPTU", "TECH-PREVIEW", "HOTFIX"];
  const paths = [];

  for (const drive of drives) {
    for (const build of builds) {
      paths.push(
        path.join(
          drive,
          "Program Files",
          "Roberts Space Industries",
          "StarCitizen",
          build,
          "Game.log"
        )
      );
      paths.push(
        path.join(
          drive,
          "Program Files",
          "Roberts Space Industries",
          "Star Citizen",
          build,
          "Game.log"
        )
      );
    }
  }

  paths.push(path.join(home, "AppData", "Local", "Star Citizen", "Game.log"));
  return paths;
}

export async function findGameLog() {
  for (const p of candidateLogPaths()) {
    try {
      const st = await fsp.stat(p);
      if (st.isFile()) return { path: p, mtime: st.mtimeMs, size: st.size };
    } catch {
      /* skip */
    }
  }
  return null;
}

export async function isStarCitizenRunning() {
  if (process.platform !== "win32") {
    return { running: false, processes: [] };
  }
  try {
    const { stdout } = await execFileAsync(
      "tasklist",
      ["/FO", "CSV", "/NH"],
      { windowsHide: true, maxBuffer: 5 * 1024 * 1024 }
    );
    const lines = String(stdout)
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    const found = [];
    for (const line of lines) {
      const name = line.split(",")[0]?.replace(/^"|"$/g, "").toLowerCase();
      if (PROCESS_NAMES.some((p) => name === p || name.includes("starcitizen"))) {
        found.push(name);
      }
    }
    return { running: found.length > 0, processes: [...new Set(found)] };
  } catch {
    return { running: false, processes: [] };
  }
}

/**
 * Parse les dernières lignes utiles du Game.log (événements connus communauté).
 * Pas exhaustif — CIG change les formats entre patches.
 */
export function parseLogSnippet(text) {
  const lines = String(text).split(/\r?\n/);
  const events = [];
  const reZone = /<(?:Channel|Zone)>.*?\[([^\]]+)\].*?(?:Entering|Entered|Loading).*?([A-Za-z0-9_\-. ]+)/i;
  const reKill =
    /(?:CDamage|Actor Death|Kill List|\[Notice\]).*?(?:killed|Destroyed|death).*?([A-Za-z0-9_\-]+).*?(?:by|from).*?([A-Za-z0-9_\-]+)/i;
  const reConnect = /Connected to.*?(?:game|server)|Authenticated|Login succeeded/i;
  const reError = /<Error>|Crash|Exception|Out of memory/i;

  for (const line of lines) {
    if (reConnect.test(line)) {
      events.push({ type: "session", message: "Connexion / auth détectée", raw: line.slice(0, 220) });
    } else if (reZone.test(line)) {
      const m = line.match(reZone);
      events.push({
        type: "zone",
        message: m ? `Zone : ${m[2] || m[1]}` : "Changement de zone",
        raw: line.slice(0, 220),
      });
    } else if (reKill.test(line)) {
      events.push({ type: "combat", message: "Événement combat / mort", raw: line.slice(0, 220) });
    } else if (reError.test(line)) {
      events.push({ type: "error", message: "Erreur log", raw: line.slice(0, 220) });
    }
  }
  return events.slice(-40);
}

export async function readGameLogTail(maxBytes = 256_000) {
  const found = await findGameLog();
  if (!found) {
    return { ok: false, error: "Game.log introuvable", log: null, events: [] };
  }
  const fh = await fsp.open(found.path, "r");
  try {
    const size = found.size;
    const start = Math.max(0, size - maxBytes);
    const len = size - start;
    const buf = Buffer.alloc(len);
    await fh.read(buf, 0, len, start);
    const text = buf.toString("utf8");
    return {
      ok: true,
      log: found,
      events: parseLogSnippet(text),
      preview: text.split(/\r?\n/).slice(-30),
    };
  } finally {
    await fh.close();
  }
}

export async function getGameStatus() {
  const [proc, log] = await Promise.all([isStarCitizenRunning(), findGameLog()]);
  return {
    running: proc.running,
    processes: proc.processes,
    logPath: log?.path || null,
    logMtime: log?.mtime || null,
    logSize: log?.size || null,
    connected: Boolean(proc.running && log),
    note:
      "Connexion locale uniquement (processus + Game.log). Pas d’accès mémoire ni API serveur CIG.",
  };
}

/** Surveille le log (poll) — renvoie les nouveaux événements depuis lastSize */
export async function pollGameLog(lastSize = 0) {
  const found = await findGameLog();
  if (!found) return { lastSize: 0, events: [], changed: false };
  if (found.size <= lastSize) {
    return { lastSize: found.size, events: [], changed: false };
  }
  const start = lastSize > 0 ? lastSize : Math.max(0, found.size - 64_000);
  const len = found.size - start;
  const buf = Buffer.alloc(len);
  const fh = await fsp.open(found.path, "r");
  try {
    await fh.read(buf, 0, len, start);
  } finally {
    await fh.close();
  }
  const text = buf.toString("utf8");
  return {
    lastSize: found.size,
    events: parseLogSnippet(text),
    changed: true,
  };
}

export function watchLogExists() {
  return fs.existsSync;
}
