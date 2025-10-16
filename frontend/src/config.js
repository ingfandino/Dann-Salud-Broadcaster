// frontend/src/config.js

function pickOriginFromList(raw) {
  // Acepta una lista separada por comas y devuelve el que mejor coincide con el hostname actual
  const list = String(raw || "").split(",").map(s => s.trim()).filter(Boolean);
  if (list.length === 0) return null;

  const currentHost = window.location.hostname;

  // Prioridad 1: coincidencia exacta por hostname
  for (const item of list) {
    try {
      const u = /^https?:\/\//i.test(item) ? new URL(item) : new URL(`http://${item}`);
      if (u.hostname === currentHost) return u.toString();
    } catch {}
  }

  // Prioridad 2: localhost si estamos en localhost
  if (currentHost === "localhost" || currentHost === "127.0.0.1") {
    const local = list.find(x => /localhost|127\.0\.0\.1/i.test(x));
    if (local) return local;
  }

  // Prioridad 3: devolver el primero válido
  for (const item of list) {
    try {
      const u = /^https?:\/\//i.test(item) ? new URL(item) : new URL(`http://${item}`);
      return u.toString();
    } catch {}
  }

  return list[0];
}

function normalizeApiUrl(raw) {
  try {
    if (!raw) return `${window.location.origin}/api`;

    // Soporte para múltiples orígenes separados por coma
    const chosen = pickOriginFromList(raw) || raw;

    let u = chosen.trim();
    if (!/^https?:\/\//i.test(u)) u = `http://${u}`;

    const url = new URL(u);

    // Forzar http en entornos sin TLS
    url.protocol = "http:";

    if (!url.port) url.port = "5000";

    const path = url.pathname || "/";
    if (path === "/") {
      url.pathname = "/api";
    } else if (!/\/api\/?$/i.test(path)) {
      url.pathname = path.replace(/\/$/, "") + "/api";
    }

    return url.toString().replace(/\/$/, "");
  } catch {
    return `${window.location.origin}/api`;
  }
}

export const API_URL = normalizeApiUrl(import.meta.env.VITE_API_URL);
console.log(`[Config] VITE_API_URL: ${import.meta.env.VITE_API_URL}`);
console.log(`[Config] API_URL final: ${API_URL}`);

export const SOCKET_ORIGIN = (() => {
  try {
    const u = new URL(API_URL);
    const origin = u.origin;
    console.log(`[Config] SOCKET_ORIGIN derivado: ${origin}`);
    console.log(`[Config] Utilizando API_URL: ${API_URL} y SOCKET_ORIGIN: ${origin}`);
    return origin;
  } catch {
    console.warn(`[Config] No se pudo derivar SOCKET_ORIGIN desde API_URL. Usando window.location.origin.`);
    console.log(`[Config] Utilizando API_URL: ${API_URL} y SOCKET_ORIGIN: ${window.location.origin}`);
    return window.location.origin;
  }
})();