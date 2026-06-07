// Shared connection state. Single source of truth for everything that depends
// on the wallet being connected. Modules import this object and mutate its
// properties; nothing else holds connection state.

export const state = {
  provider: null,     // ethers.BrowserProvider — read access (and write via signer)
  signer: null,       // ethers.Signer — present only when a wallet is connected
  account: null,      // connected address (string) or null
  readContract: null, // ethers.Contract bound to the provider for view calls
  lastRemaining: null, // last known remainingTickets (bigint) — drives sold-out UI
};
