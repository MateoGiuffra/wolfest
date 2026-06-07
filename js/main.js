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

// Delegated handler: one listener on the grid serves every ticket card, so it
// keeps working after the cards re-render.
els.ticketsGrid.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-transfer]");
  if (!btn) return;
  const tokenId = btn.getAttribute("data-transfer");
  const input = els.ticketsGrid.querySelector(`[data-token-input="${tokenId}"]`);
  const toAddress = input ? input.value.trim() : "";
  transferTicket(tokenId, toAddress, btn);
});

initWalletListeners();

// Show the event state even before connecting, using MetaMask's provider if it
// is already on Sepolia. Otherwise the panel stays in "—" until the user connects.
(async function initPublicRead() {
  if (!hasMetaMask()) return;
  try {
    const tmp = new ethers.BrowserProvider(window.ethereum);
    const net = await tmp.getNetwork();
    if (net.chainId === SEPOLIA_CHAIN_ID) {
      state.provider = tmp;
      state.readContract = new ethers.Contract(CONTRACT_ADDRESS, ABI, state.provider);
      await loadEventState();
    }
  } catch (_) {
    // Silent — user can still connect manually.
  }
})();
