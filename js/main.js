// Entry point. Wires DOM events to behavior and runs the initial public read.
// This is the only module the HTML loads directly; it pulls in the rest.

import { CONTRACT_ADDRESS, SEPOLIA_CHAIN_ID, ABI } from "./config.js";
import { state } from "./state.js";
import { els, toast } from "./ui.js";
import { connectWallet, hasMetaMask, initWalletListeners } from "./wallet.js";
import { buyTicket } from "./buy.js";
import { transferTicket } from "./transfer.js";
import { loadEventState } from "./event-state.js";
import { loadMyTickets } from "./tickets.js";
import { listTicket, delistTicket, buyResaleTicket, loadMarketplace } from "./marketplace.js";
import { initPlayer } from "./player.js";

const { ethers } = window;

els.contractLink.href = `https://sepolia.etherscan.io/address/${CONTRACT_ADDRESS}`;

els.connectBtn.addEventListener("click", connectWallet);
els.buyBtn.addEventListener("click", buyTicket);
els.refreshTickets.addEventListener("click", async () => {
  if (!state.account) {
    toast("Conectá tu wallet primero.", "info");
    return;
  }
  await loadEventState();
  await loadMyTickets();
});

els.refreshMarket.addEventListener("click", () => loadMarketplace());

// Delegated handler: one listener on the grid serves every ticket card, so it
// keeps working after the cards re-render. Covers transfer, list and delist.
els.ticketsGrid.addEventListener("click", (e) => {
  const transferBtn = e.target.closest("[data-transfer]");
  if (transferBtn) {
    const tokenId = transferBtn.getAttribute("data-transfer");
    const input = els.ticketsGrid.querySelector(`[data-token-input="${tokenId}"]`);
    transferTicket(tokenId, input ? input.value.trim() : "", transferBtn);
    return;
  }

  const listBtn = e.target.closest("[data-list]");
  if (listBtn) {
    const tokenId = listBtn.getAttribute("data-list");
    const input = els.ticketsGrid.querySelector(`[data-price-input="${tokenId}"]`);
    listTicket(tokenId, input ? input.value.trim() : "", listBtn);
    return;
  }

  const delistBtn = e.target.closest("[data-delist]");
  if (delistBtn) {
    delistTicket(delistBtn.getAttribute("data-delist"), delistBtn);
  }
});

// Marketplace cards: a single delegated handler for the Buy buttons.
els.marketGrid.addEventListener("click", (e) => {
  const buyBtn = e.target.closest("[data-buy-resale]");
  if (!buyBtn) return;
  buyResaleTicket(buyBtn.getAttribute("data-buy-resale"), buyBtn);
});

initWalletListeners();
initPlayer();

// Show the event state even before connecting. Tries MetaMask first (if already
// on Sepolia); falls back to a public RPC so price/availability are always visible.
(async function initPublicRead() {
  try {
    // Intentar con MetaMask primero (si está en Sepolia)
    if (hasMetaMask()) {
      const tmp = new ethers.BrowserProvider(window.ethereum);
      const net = await tmp.getNetwork();
      if (net.chainId === SEPOLIA_CHAIN_ID) {
        state.provider = tmp;
        state.readContract = new ethers.Contract(CONTRACT_ADDRESS, ABI, state.provider);
        await loadEventState();
        await loadMarketplace();
        return;
      }
    }
    // Fallback: RPC público de Sepolia — no requiere MetaMask ni red específica
    const fallbackProvider = new ethers.JsonRpcProvider("https://rpc.sepolia.org");
    state.readContract = new ethers.Contract(CONTRACT_ADDRESS, ABI, fallbackProvider);
    await loadEventState();
    await loadMarketplace();
  } catch (_) {
    // Silent — user can still connect manually.
  }
})();