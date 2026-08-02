/**
 * Licence Lemon Squeezy — activate / validate (API publique).
 * Stockage local dans userData Electron.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { app } from "electron";
import { LEMON, STORE } from "./config.js";

function storePath() {
  return path.join(app.getPath("userData"), "license.json");
}

export function loadLicense() {
  try {
    const raw = fs.readFileSync(storePath(), "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveLicense(data) {
  fs.mkdirSync(path.dirname(storePath()), { recursive: true });
  fs.writeFileSync(storePath(), JSON.stringify(data, null, 2), "utf8");
}

export function clearLicense() {
  try {
    fs.unlinkSync(storePath());
  } catch {
    /* ignore */
  }
}

async function postForm(url, fields) {
  const body = new URLSearchParams(fields);
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, json };
}

/** Mode dev : HM_DEV=1 ou clé "DEV-LOCAL" */
export function isDevUnlock(key) {
  if (process.env.HM_DEV === "1") return true;
  return String(key || "").trim().toUpperCase() === "DEV-LOCAL";
}

export async function activateLicense(licenseKey, instanceName) {
  const key = String(licenseKey || "").trim();
  if (!key) return { ok: false, error: "Clé vide" };

  if (isDevUnlock(key)) {
    const data = {
      licenseKey: key,
      instanceId: "dev-local",
      activatedAt: new Date().toISOString(),
      product: STORE.productName,
      valid: true,
      mode: "dev",
    };
    saveLicense(data);
    return { ok: true, data };
  }

  const { ok, json } = await postForm(LEMON.activate, {
    license_key: key,
    instance_name: instanceName || osHostname(),
  });

  if (!ok || json?.activated === false || json?.error) {
    return {
      ok: false,
      error: json?.error || json?.meta?.error || "Activation refusée",
      raw: json,
    };
  }

  const data = {
    licenseKey: key,
    instanceId: json?.instance?.id || null,
    activatedAt: new Date().toISOString(),
    product: json?.meta?.product_name || STORE.productName,
    customer: json?.meta?.customer_name || null,
    valid: true,
    mode: "lemonsqueezy",
  };
  saveLicense(data);
  return { ok: true, data };
}

function osHostname() {
  try {
    return os.hostname().slice(0, 64) || "HangarMatchPC";
  } catch {
    return "HangarMatchPC";
  }
}

export async function validateStoredLicense() {
  if (process.env.HM_DEV === "1") {
    return { ok: true, valid: true, mode: "dev-env" };
  }
  const stored = loadLicense();
  if (!stored?.licenseKey) {
    return { ok: false, valid: false, error: "Aucune licence" };
  }
  if (stored.mode === "dev" || isDevUnlock(stored.licenseKey)) {
    return { ok: true, valid: true, data: stored, mode: "dev" };
  }

  const fields = { license_key: stored.licenseKey };
  if (stored.instanceId) fields.instance_id = stored.instanceId;

  const { ok, json } = await postForm(LEMON.validate, fields);
  const valid = Boolean(json?.valid);
  if (ok && valid) {
    stored.valid = true;
    stored.lastValidated = new Date().toISOString();
    saveLicense(stored);
    return { ok: true, valid: true, data: stored };
  }
  return {
    ok: false,
    valid: false,
    error: json?.error || "Licence invalide",
    data: stored,
  };
}

export function getCheckoutUrl() {
  return STORE.checkoutUrl;
}
