// Reconstructs the tickets the user CURRENTLY owns. Since tickets can be
// transferred, "owned" is not the same as "bought": we read the ERC-721
// Transfer events that landed on the user, then confirm present ownership with
// ownerOf before showing each card.

import { CONTRACT_ADDRESS, ABI, EVENT_DATE } from "./config.js";
import { state } from "./state.js";
import { els, escapeHtml, formatDate } from "./ui.js";

const { ethers } = window;

export async function loadMyTickets() {
  if (!state.readContract || !state.account) return;

  els.ticketsGrid.innerHTML = "";
  const loading = document.createElement("p");
  loading.className = "text-bone/40 uppercase tracking-widest text-sm col-span-full py-10 text-center";
  loading.textContent = "Buscando tus entradas en la cadena...";
  els.ticketsGrid.appendChild(loading);

  try {
    const iface = new ethers.Interface(ABI);
    const transferTopic = iface.getEvent("Transfer").topicHash;
    const meAsTopic = ethers.zeroPadValue(state.account, 32);

    // Every token that ever arrived at this address — includes the original
    // mint (from = 0x0) and any transfers received from other people.
    const incoming = await state.provider.getLogs({
      address: CONTRACT_ADDRESS,
      fromBlock: 0,
      toBlock: "latest",
      topics: [transferTopic, null, meAsTopic], // [event, anyFrom, to = me]
    });

    if (incoming.length === 0) {
      renderNoTickets();
      return;
    }

    // Dedupe candidate tokenIds — a token can have arrived more than once.
    const candidateIds = new Set();
    for (const log of incoming) {
      const parsed = iface.parseLog({ topics: log.topics, data: log.data });
      candidateIds.add(parsed.args.tokenId.toString());
    }

    // A token that arrived may have left again. ownerOf is the source of truth.
    const owned = [];
    for (const tokenId of candidateIds) {
      let currentOwner;
      try {
        currentOwner = await state.readContract.ownerOf(tokenId);
      } catch (_) {
        continue; // Token burned or unreadable — skip it.
      }
      if (currentOwner.toLowerCase() !== state.account.toLowerCase()) continue;

      let meta = null;
      try {
        meta = await state.readContract.getTicketMetadata(tokenId);
      } catch (_) {
        // Metadata unreadable — fall back to defaults below.
      }

      owned.push({
        tokenId,
        seatNumber: meta ? meta.seatNumber.toString() : "—",
        eventName: meta ? meta.eventName : "WolFest",
      });
    }

    if (owned.length === 0) {
      renderNoTickets();
      return;
    }

    owned.sort((a, b) => Number(a.tokenId) - Number(b.tokenId));
    renderTickets(owned);
  } catch (err) {
    console.error(err);
    els.ticketsGrid.innerHTML = "";
    const errEl = document.createElement("p");
    errEl.className = "text-bloodlight uppercase tracking-widest text-sm col-span-full py-10 text-center border border-dashed border-blood/40";
    errEl.textContent = "No pudimos leer tus entradas desde la cadena.";
    els.ticketsGrid.appendChild(errEl);
  }
}

export function renderNoTickets() {
  els.ticketsGrid.innerHTML = "";
  els.ticketsEmpty.classList.remove("hidden");
  els.ticketsGrid.appendChild(els.ticketsEmpty);
}

function renderTickets(tickets) {
  els.ticketsGrid.innerHTML = "";
  for (const t of tickets) {
    const card = document.createElement("article");
    card.className = "relative bg-black/60 border border-blood/40 overflow-hidden group";
    card.innerHTML = `
      <div class="bg-blood text-bone px-4 py-2 flex items-center justify-between">
        <span class="font-display tracking-widest uppercase text-sm">Entrada NFT</span>
        <span class="font-display tracking-widest text-sm">#${escapeHtml(t.tokenId)}</span>
      </div>
      <div class="p-5">
        <h3 class="font-display text-2xl tracking-wider text-bone uppercase leading-tight">${escapeHtml(t.eventName)}</h3>
        <p class="text-bone/60 text-xs uppercase tracking-[0.2em] mt-2">${escapeHtml(formatDate(EVENT_DATE))}</p>

        <div class="mt-5 flex items-end justify-between border-t border-dashed border-bone/20 pt-4">
          <div>
            <p class="text-[10px] uppercase tracking-[0.2em] text-bone/40">Butaca</p>
            <p class="font-display text-4xl text-blood leading-none">${escapeHtml(t.seatNumber)}</p>
          </div>
          <div class="text-right">
            <p class="text-[10px] uppercase tracking-[0.2em] text-bone/40">TokenId</p>
            <p class="font-display text-xl text-bone leading-none">${escapeHtml(t.tokenId)}</p>
          </div>
        </div>

        <div class="mt-5 border-t border-dashed border-bone/20 pt-4">
          <label class="block text-[10px] uppercase tracking-[0.2em] text-bone/40 mb-2">Transferir a</label>
          <div class="flex gap-2">
            <input
              data-token-input="${escapeHtml(t.tokenId)}"
              type="text"
              spellcheck="false"
              placeholder="0x..."
              class="flex-1 min-w-0 bg-black/60 border border-bone/20 focus:border-blood outline-none text-bone text-xs px-3 py-2 font-mono" />
            <button
              data-transfer="${escapeHtml(t.tokenId)}"
              class="font-display tracking-widest uppercase text-xs bg-transparent border border-blood text-blood hover:bg-blood hover:text-bone transition-colors px-3 py-2 whitespace-nowrap">
              Transferir
            </button>
          </div>
        </div>
      </div>
    `;
    els.ticketsGrid.appendChild(card);
  }
}
