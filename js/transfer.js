// Transferring a ticket the user owns to another address. Uses ERC-721
// safeTransferFrom. The owner can move their own token directly — no prior
// approve() is needed; approve is only for letting a THIRD PARTY move it.

import { CONTRACT_ADDRESS, ABI } from "./config.js";
import { state } from "./state.js";
import { toast } from "./ui.js";
import { loadMyTickets } from "./tickets.js";

const { ethers } = window;

export async function transferTicket(tokenId, toAddress, btn) {
  if (!state.signer) {
    toast("Conectá tu wallet primero.", "error");
    return;
  }

  // Validate the destination before spending a single unit of gas.
  if (!ethers.isAddress(toAddress)) {
    toast("Esa address no es válida. Revisá que esté completa.", "error");
    return;
  }
  if (toAddress.toLowerCase() === state.account.toLowerCase()) {
    toast("No tiene sentido transferirte la entrada a vos mismo.", "error");
    return;
  }
  if (toAddress === ethers.ZeroAddress) {
    toast("No podés transferir a la address cero (eso es quemar la entrada).", "error");
    return;
  }

  const originalLabel = btn ? btn.textContent : null;
  if (btn) {
    btn.disabled = true;
    btn.textContent = "Transfiriendo...";
  }

  try {
    const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, state.signer);

    const tx = await contract.safeTransferFrom(state.account, toAddress, tokenId);
    toast("Transferencia enviada. Esperando confirmación...", "info");

    await tx.wait();
    toast(`Entrada #${tokenId} transferida. Ya no es tuya.`, "success", 8000);

    // The ticket left the wallet — rebuild the list from current ownership.
    await loadMyTickets();
  } catch (err) {
    console.error(err);
    handleTransferError(err);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = originalLabel || "Transferir";
    }
  }
}

function handleTransferError(err) {
  const code = err && err.code;
  const msg = ((err && (err.shortMessage || err.message)) || "").toLowerCase();

  if (code === 4001 || code === "ACTION_REJECTED" || msg.includes("user rejected") || msg.includes("user denied")) {
    toast("Cancelaste la transferencia.", "error");
  } else if (msg.includes("not owner") || msg.includes("incorrect owner") || msg.includes("caller is not")) {
    toast("No sos el dueño de esa entrada.", "error");
  } else if (msg.includes("insufficient funds")) {
    toast("No te alcanza para el gas de la transferencia.", "error", 8000);
  } else {
    toast("La transferencia falló. Probá de nuevo.", "error", 8000);
  }
}
