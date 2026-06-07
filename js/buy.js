// The purchase flow: send buyTicket with the exact price, wait for the receipt,
// read the TicketPurchased event back, and translate failures into clear messages.

import { CONTRACT_ADDRESS, ABI } from "./config.js";
import { state } from "./state.js";
import { els, toast, setBuyLoading } from "./ui.js";
import { loadEventState, updateBuyState } from "./event-state.js";
import { loadMyTickets } from "./tickets.js";

const { ethers } = window;

export async function buyTicket() {
  if (!state.signer) {
    toast("Conectá tu wallet primero.", "error");
    return;
  }

  setBuyLoading(true, "Confirmá en MetaMask...");
  try {
    const writeContract = new ethers.Contract(CONTRACT_ADDRESS, ABI, state.signer);
    const price = await writeContract.ticketPrice();

    const tx = await writeContract.buyTicket({ value: price });
    setBuyLoading(true, "Esperando confirmación...");
    toast("Transacción enviada. Esperando que la mina escupa el bloque...", "info");

    const receipt = await tx.wait();
    const purchase = parsePurchaseFromReceipt(receipt, writeContract);

    if (purchase) {
      toast(`¡Entrada comprada! Butaca #${purchase.seatNumber}, TokenId: ${purchase.tokenId}`, "success", 9000);
    } else {
      toast("¡Entrada comprada! (No pudimos leer la butaca del recibo)", "success", 8000);
    }

    await loadEventState();
    await loadMyTickets();
  } catch (err) {
    console.error(err);
    handleTxError(err);
  } finally {
    setBuyLoading(false);
    updateBuyState();
  }
}

function parsePurchaseFromReceipt(receipt, contract) {
  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== CONTRACT_ADDRESS.toLowerCase()) continue;
    try {
      const parsed = contract.interface.parseLog({ topics: log.topics, data: log.data });
      if (parsed && parsed.name === "TicketPurchased") {
        return {
          buyer: parsed.args.buyer,
          tokenId: parsed.args.tokenId.toString(),
          seatNumber: parsed.args.seatNumber.toString(),
        };
      }
    } catch (_) {
      // Not our event — keep scanning.
    }
  }
  return null;
}

function handleTxError(err) {
  const code = err && err.code;
  const msg = ((err && (err.shortMessage || err.message)) || "").toLowerCase();

  if (code === 4001 || code === "ACTION_REJECTED" || msg.includes("user rejected") || msg.includes("user denied")) {
    toast("Rechazaste la transacción.", "error");
  } else if (code === "INSUFFICIENT_FUNDS" || msg.includes("insufficient funds")) {
    toast("Fondos insuficientes para pagar la entrada + gas.", "error", 8000);
  } else if (msg.includes("sold out") || msg.includes("sold-out") || msg.includes("no tickets")) {
    toast("Sold out. Llegaste tarde.", "error");
  } else {
    toast("La transacción falló. Probá de nuevo.", "error", 8000);
  }
}
