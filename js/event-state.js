// Reads the public state of the event (price, sold, remaining) and keeps the
// buy button in sync with whether a purchase is currently possible.

import { state } from "./state.js";
import { els, toast } from "./ui.js";

const { ethers } = window;

export async function loadEventState() {
  if (!state.readContract) return;
  try {
    const [priceWei, minted, remaining] = await Promise.all([
      state.readContract.ticketPrice(),
      state.readContract.totalMinted(),
      state.readContract.remainingTickets(),
    ]);

    state.lastRemaining = remaining;

    els.priceVal.textContent = ethers.formatEther(priceWei);
    els.soldVal.textContent = minted.toString();
    els.remainVal.textContent = remaining.toString();

    const sold = Number(minted);
    const total = sold + Number(remaining);
    const pct = total > 0 ? Math.round((sold / total) * 100) : 0;
    els.progressBar.style.width = `${pct}%`;
    els.progressLabel.textContent = `${pct}% vendido`;

    updateBuyState();
  } catch (err) {
    console.error(err);
    toast("No pudimos leer el estado del evento.", "error");
  }
}

export function updateBuyState() {
  const connected = !!state.signer;
  const soldOut = state.lastRemaining !== null && state.lastRemaining === 0n;

  if (!connected) {
    els.buyBtn.disabled = true;
    els.buyHint.textContent = "Conectá tu wallet primero";
    return;
  }
  if (soldOut) {
    els.buyBtn.disabled = true;
    els.buyHint.textContent = "Sold out. No quedan entradas.";
    return;
  }
  els.buyBtn.disabled = false;
  els.buyHint.textContent = "Pago exacto · sin vueltas";
}
