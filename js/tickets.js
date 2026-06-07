// Reconstructs the connected user's tickets from TicketPurchased events.
// The contract exposes no ownerOf in this ABI, so we rebuild ownership from logs.

import { CONTRACT_ADDRESS, ABI } from "./config.js";
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
    const eventFragment = iface.getEvent("TicketPurchased");
    const topic0 = eventFragment.topicHash;
    const topicBuyer = ethers.zeroPadValue(state.account, 32);

    const logs = await state.provider.getLogs({
      address: CONTRACT_ADDRESS,
      fromBlock: 0,
      toBlock: "latest",
      topics: [topic0, topicBuyer],
    });

    if (logs.length === 0) {
      renderNoTickets();
      return;
    }

    const tickets = [];
    for (const log of logs) {
      const parsed = iface.parseLog({ topics: log.topics, data: log.data });
      const tokenId = parsed.args.tokenId;
      const seatNumber = parsed.args.seatNumber;

      let meta = null;
      try {
        meta = await state.readContract.getTicketMetadata(tokenId);
      } catch (_) {
        // Metadata read failed — render with what we have from the event.
      }

      tickets.push({
        tokenId: tokenId.toString(),
        seatNumber: seatNumber.toString(),
        eventName: meta ? meta.eventName : "WolFest",
        eventDate: meta ? meta.eventDate : null,
        officialUrl: meta ? meta.officialUrl : "",
      });
    }

    tickets.sort((a, b) => Number(a.tokenId) - Number(b.tokenId));
    renderTickets(tickets);
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
        <p class="text-bone/60 text-xs uppercase tracking-[0.2em] mt-2">${escapeHtml(formatDate(t.eventDate))}</p>

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
      </div>
    `;
    els.ticketsGrid.appendChild(card);
  }
}
