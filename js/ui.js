// Everything that touches the screen: DOM references, toasts, and presentation
// formatting. No blockchain logic lives here.

const $ = (id) => document.getElementById(id);

export const els = {
  connectBtn: $("connectBtn"),
  walletBanner: $("walletBanner"),
  walletAddr: $("walletAddr"),
  netBadge: $("netBadge"),
  priceVal: $("priceVal"),
  soldVal: $("soldVal"),
  remainVal: $("remainVal"),
  progressBar: $("progressBar"),
  progressLabel: $("progressLabel"),
  buyBtn: $("buyBtn"),
  buyHint: $("buyHint"),
  ticketsGrid: $("ticketsGrid"),
  ticketsEmpty: $("ticketsEmpty"),
  refreshTickets: $("refreshTickets"),
  contractLink: $("contractLink"),
  toasts: $("toasts"),
};

export function toast(message, kind = "info", ttl = 6000) {
  const colors = {
    info: "border-bone/30 text-bone",
    success: "border-blood text-bone",
    error: "border-bloodlight text-bone",
  };
  const el = document.createElement("div");
  el.className = `toast-enter bg-black/90 border-l-4 ${colors[kind] || colors.info} px-4 py-3 text-sm uppercase tracking-wider shadow-lg`;
  el.textContent = message;
  els.toasts.appendChild(el);
  setTimeout(() => {
    el.style.transition = "opacity .3s";
    el.style.opacity = "0";
    setTimeout(() => el.remove(), 300);
  }, ttl);
  return el;
}

export function shorten(addr) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function setBuyLoading(loading, label) {
  if (loading) {
    els.buyBtn.disabled = true;
    els.buyBtn.innerHTML =
      `<span class="inline-block w-4 h-4 border-2 border-bone/40 border-t-bone rounded-full spin"></span>${label || "Procesando..."}`;
  } else {
    els.buyBtn.innerHTML = "Comprar entrada";
  }
}

export function formatDate(value) {
  let d;
  if (value instanceof Date) {
    d = value;
  } else {
    if (value === null || value === undefined) return "Fecha por confirmar";
    const n = Number(value);
    if (!n) return "Fecha por confirmar";
    d = new Date(n * 1000);
  }
  return d.toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
