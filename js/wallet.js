// MetaMask connection and network handling. Owns the lifecycle of the wallet:
// detect, connect, force Sepolia, and reflect connect/disconnect in the UI.

import { CONTRACT_ADDRESS, ABI, SEPOLIA_CHAIN_ID, SEPOLIA_HEX } from "./config.js";
import { state } from "./state.js";
import { els, toast, shorten } from "./ui.js";
import { loadEventState, updateBuyState } from "./event-state.js";
import { loadMyTickets, renderNoTickets } from "./tickets.js";

const { ethers } = window;

export function hasMetaMask() {
  return typeof window.ethereum !== "undefined";
}

async function ensureSepolia() {
  const net = await state.provider.getNetwork();
  if (net.chainId === SEPOLIA_CHAIN_ID) return true;

  toast("Red incorrecta. Te paso a Sepolia...", "info");
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: SEPOLIA_HEX }],
    });
    // Rebuild provider after the chain switch.
    state.provider = new ethers.BrowserProvider(window.ethereum);
    return true;
  } catch (err) {
    if (err && err.code === 4902) {
      toast("Sepolia no está en tu MetaMask. Agregala manualmente.", "error", 8000);
    } else {
      toast("No se pudo cambiar a Sepolia.", "error");
    }
    return false;
  }
}

export async function connectWallet() {
  if (!hasMetaMask()) {
    toast("No detectamos MetaMask. Instalá la extensión para seguir.", "error", 9000);
    return;
  }

  try {
    state.provider = new ethers.BrowserProvider(window.ethereum);
    await state.provider.send("eth_requestAccounts", []);

    const onSepolia = await ensureSepolia();
    if (!onSepolia) return;

    state.signer = await state.provider.getSigner();
    state.account = await state.signer.getAddress();

    state.readContract = new ethers.Contract(CONTRACT_ADDRESS, ABI, state.provider);

    renderConnected();
    toast("Wallet conectada. Bienvenido al ritual.", "success");

    await loadEventState();
    await loadMyTickets();
  } catch (err) {
    console.error(err);
    if (err && (err.code === 4001 || err.code === "ACTION_REJECTED")) {
      toast("Conexión rechazada.", "error");
    } else {
      toast("No se pudo conectar la wallet.", "error");
    }
  }
}

function renderConnected() {
  els.connectBtn.textContent = shorten(state.account);
  els.walletBanner.classList.remove("hidden");
  els.walletAddr.textContent = shorten(state.account);
  els.netBadge.textContent = "Sepolia";
  els.netBadge.className = "ml-3 text-xs px-2 py-0.5 border border-blood text-blood";
}

function renderDisconnected() {
  state.account = null;
  state.signer = null;
  els.connectBtn.textContent = "Conectar MetaMask";
  els.walletBanner.classList.add("hidden");
  updateBuyState();
  renderNoTickets();
}

// Reacts to the user switching accounts or networks from inside MetaMask.
export function initWalletListeners() {
  if (!hasMetaMask()) return;

  window.ethereum.on("accountsChanged", async (accounts) => {
    if (!accounts || accounts.length === 0) {
      renderDisconnected();
      toast("Wallet desconectada.", "info");
      return;
    }
    await connectWallet();
  });

  window.ethereum.on("chainChanged", () => {
    // Simplest correct behavior: reload so provider/state stay consistent.
    window.location.reload();
  });
}
