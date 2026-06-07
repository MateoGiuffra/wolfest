// Internal resale marketplace. Unlike a direct transfer, selling here routes
// payment through the contract: 10% royalty to the organizer, 90% to the
// seller. Covers listing/delisting the user's own tickets and browsing/buying
// everyone else's listings.

import { CONTRACT_ADDRESS, ABI } from "./config.js";
import { state } from "./state.js";
import { els, toast, escapeHtml } from "./ui.js";
import { loadMyTickets } from "./tickets.js";

const { ethers } = window;

function writeContract() {
  return new ethers.Contract(CONTRACT_ADDRESS, ABI, state.signer);
}

// ---- Seller actions (on the user's own ticket cards) ----

export async function listTicket(tokenId, priceEth, btn) {
  if (!state.signer) return toast("Conectá tu wallet primero.", "error");

  let priceWei;
  try {
    priceWei = ethers.parseEther(priceEth);
  } catch (_) {
    return toast("Precio inválido. Usá un número en ETH, por ejemplo 0.05.", "error");
  }
  if (priceWei <= 0n) return toast("El precio tiene que ser mayor a cero.", "error");

  const original = setBusy(btn, "Listando...");
  try {
    // The contract internally calls approve(address(this), tokenId) before
    // listing, so MetaMask will ask for TWO confirmations.
    toast("Vas a confirmar DOS veces: primero el permiso (approve), después el listado.", "info", 9000);

    const tx = await writeContract().listForResale(tokenId, priceWei);
    await tx.wait();
    toast(`Entrada #${tokenId} listada a ${priceEth} ETH.`, "success", 8000);

    await loadMyTickets();
    await loadMarketplace();
  } catch (err) {
    console.error(err);
    handleError(err, "No se pudo listar la entrada.");
  } finally {
    restoreBusy(btn, original);
  }
}

export async function delistTicket(tokenId, btn) {
  if (!state.signer) return toast("Conectá tu wallet primero.", "error");

  const original = setBusy(btn, "Cancelando...");
  try {
    const tx = await writeContract().delistFromResale(tokenId);
    await tx.wait();
    toast(`Listado de la entrada #${tokenId} cancelado.`, "success");

    await loadMyTickets();
    await loadMarketplace();
  } catch (err) {
    console.error(err);
    handleError(err, "No se pudo cancelar el listado.");
  } finally {
    restoreBusy(btn, original);
  }
}

// ---- Buyer action (on the marketplace cards) ----

export async function buyResaleTicket(tokenId, btn) {
  if (!state.signer) return toast("Conectá tu wallet primero.", "error");

  const original = setBusy(btn, "Comprando...");
  try {
    // Re-read the price at purchase time: it may have changed or been delisted.
    const price = await state.readContract.resalePrice(tokenId);
    if (price <= 0n) {
      toast("Esa entrada ya no está a la venta.", "error");
      await loadMarketplace();
      return;
    }

    const tx = await writeContract().buyResale(tokenId, { value: price });
    toast("Compra enviada. Esperando confirmación...", "info");
    await tx.wait();
    toast(`¡Compraste la entrada #${tokenId} en el marketplace!`, "success", 9000);

    await loadMarketplace();
    await loadMyTickets();
  } catch (err) {
    console.error(err);
    handleError(err, "No se pudo comprar la entrada.");
    await loadMarketplace();
  } finally {
    restoreBusy(btn, original);
  }
}

// ---- Marketplace listing section ----

export async function loadMarketplace() {
  if (!state.readContract) return;

  els.marketGrid.innerHTML = "";
  const loading = document.createElement("p");
  loading.className = "text-bone/40 uppercase tracking-widest text-sm col-span-full py-10 text-center";
  loading.textContent = "Buscando entradas en reventa...";
  els.marketGrid.appendChild(loading);

  try {
    const iface = new ethers.Interface(ABI);
    const listedTopic = iface.getEvent("TicketListed").topicHash;

    const logs = await state.provider.getLogs({
      address: CONTRACT_ADDRESS,
      fromBlock: 0,
      toBlock: "latest",
      topics: [listedTopic],
    });

    // A token can be listed more than once over time — keep unique ids.
    const candidateIds = new Set();
    for (const log of logs) {
      const parsed = iface.parseLog({ topics: log.topics, data: log.data });
      candidateIds.add(parsed.args.tokenId.toString());
    }

    const myAddr = state.account ? state.account.toLowerCase() : null;
    const listings = [];

    for (const tokenId of candidateIds) {
      let price;
      try {
        price = await state.readContract.resalePrice(tokenId);
      } catch (_) {
        continue;
      }
      if (price <= 0n) continue; // Delisted or already sold.

      // Hide the connected user's own listings — they can't buy from themselves.
      let owner;
      try {
        owner = await state.readContract.ownerOf(tokenId);
      } catch (_) {
        owner = null;
      }
      if (myAddr && owner && owner.toLowerCase() === myAddr) continue;

      let seatNumber = "—";
      try {
        const meta = await state.readContract.getTicketMetadata(tokenId);
        seatNumber = meta.seatNumber.toString();
      } catch (_) {
        // Fall back to the placeholder.
      }

      listings.push({ tokenId, priceEth: ethers.formatEther(price), seatNumber });
    }

    if (listings.length === 0) {
      renderEmptyMarket();
      return;
    }

    listings.sort((a, b) => Number(a.tokenId) - Number(b.tokenId));
    renderMarket(listings);
  } catch (err) {
    console.error(err);
    els.marketGrid.innerHTML = "";
    const errEl = document.createElement("p");
    errEl.className = "text-bloodlight uppercase tracking-widest text-sm col-span-full py-10 text-center border border-dashed border-blood/40";
    errEl.textContent = "No pudimos leer el marketplace.";
    els.marketGrid.appendChild(errEl);
  }
}

function renderEmptyMarket() {
  els.marketGrid.innerHTML = "";
  els.marketEmpty.classList.remove("hidden");
  els.marketGrid.appendChild(els.marketEmpty);
}

function renderMarket(listings) {
  els.marketGrid.innerHTML = "";
  for (const l of listings) {
    const card = document.createElement("article");
    card.className = "relative bg-black/60 border border-blood/40 overflow-hidden";
    card.innerHTML = `
      <div class="bg-blood text-bone px-4 py-2 flex items-center justify-between">
        <span class="font-display tracking-widest uppercase text-sm">En reventa</span>
        <span class="font-display tracking-widest text-sm">#${escapeHtml(l.tokenId)}</span>
      </div>
      <div class="p-5">
        <div class="flex items-end justify-between">
          <div>
            <p class="text-[10px] uppercase tracking-[0.2em] text-bone/40">Butaca</p>
            <p class="font-display text-4xl text-blood leading-none">${escapeHtml(l.seatNumber)}</p>
          </div>
          <div class="text-right">
            <p class="text-[10px] uppercase tracking-[0.2em] text-bone/40">Precio</p>
            <p class="font-display text-2xl text-bone leading-none">${escapeHtml(l.priceEth)} ETH</p>
          </div>
        </div>
        <button
          data-buy-resale="${escapeHtml(l.tokenId)}"
          class="mt-5 w-full font-display tracking-widest uppercase text-sm bg-blood hover:bg-bloodlight transition-colors py-3 border border-blood text-bone">
          Comprar
        </button>
        <p class="text-center text-[10px] uppercase tracking-[0.2em] text-bone/40 mt-2">10% al organizador · 90% al vendedor</p>
      </div>
    `;
    els.marketGrid.appendChild(card);
  }
}

// ---- Shared helpers ----

function setBusy(btn, label) {
  if (!btn) return null;
  const original = btn.textContent;
  btn.disabled = true;
  btn.textContent = label;
  return original;
}

function restoreBusy(btn, original) {
  if (!btn) return;
  btn.disabled = false;
  if (original !== null) btn.textContent = original;
}

function handleError(err, fallback) {
  const code = err && err.code;
  const msg = ((err && (err.shortMessage || err.message)) || "").toLowerCase();

  if (code === 4001 || code === "ACTION_REJECTED" || msg.includes("user rejected") || msg.includes("user denied")) {
    toast("Cancelaste la operación.", "error");
  } else if (code === "INSUFFICIENT_FUNDS" || msg.includes("insufficient funds")) {
    toast("Fondos insuficientes para cubrir el precio + gas.", "error", 8000);
  } else if (msg.includes("already sold") || msg.includes("not listed") || msg.includes("not for sale")) {
    toast("Esa entrada ya no está disponible.", "error");
  } else if (msg.includes("price") && msg.includes("mismatch")) {
    toast("El precio cambió. Refrescá el marketplace.", "error");
  } else {
    toast(fallback, "error", 8000);
  }
}
