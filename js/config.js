// Contract identity and ABI. This is the only file that changes when the
// deployed contract changes — addresses, network, and function signatures live here.

// export const CONTRACT_ADDRESS = "0xDe9a284E5b7609970773d899b061ae963109C079"; // vieja
export const CONTRACT_ADDRESS = "0xc5F938749d025c63eCB08D8Be119055fB677cB88";
export const SEPOLIA_CHAIN_ID = 11155111n;
export const SEPOLIA_HEX = "0xaa36a7";

export const ABI = [
  { name: "buyTicket", type: "function", stateMutability: "payable", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { name: "ticketPrice", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { name: "totalMinted", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { name: "remainingTickets", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  {
    name: "getTicketMetadata", type: "function", stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{
      name: "", type: "tuple",
      components: [
        { name: "eventName", type: "string" },
        { name: "eventDate", type: "uint256" },
        { name: "officialUrl", type: "string" },
        { name: "seatNumber", type: "uint256" },
      ],
    }],
  },
  {
    name: "TicketPurchased", type: "event",
    inputs: [
      { name: "buyer", indexed: true, type: "address" },
      { name: "tokenId", indexed: true, type: "uint256" },
      { name: "seatNumber", indexed: false, type: "uint256" },
    ],
  },

  // ---- Standard ERC-721 surface (the contract implements these on-chain) ----
  { name: "name", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "string" }] },
  { name: "symbol", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "string" }] },
  { name: "tokenURI", type: "function", stateMutability: "view", inputs: [{ name: "tokenId", type: "uint256" }], outputs: [{ name: "", type: "string" }] },
  { name: "balanceOf", type: "function", stateMutability: "view", inputs: [{ name: "owner", type: "address" }], outputs: [{ name: "", type: "uint256" }] },
  { name: "ownerOf", type: "function", stateMutability: "view", inputs: [{ name: "tokenId", type: "uint256" }], outputs: [{ name: "", type: "address" }] },
  { name: "getApproved", type: "function", stateMutability: "view", inputs: [{ name: "tokenId", type: "uint256" }], outputs: [{ name: "", type: "address" }] },
  { name: "isApprovedForAll", type: "function", stateMutability: "view", inputs: [{ name: "owner", type: "address" }, { name: "operator", type: "address" }], outputs: [{ name: "", type: "bool" }] },
  { name: "approve", type: "function", stateMutability: "nonpayable", inputs: [{ name: "to", type: "address" }, { name: "tokenId", type: "uint256" }], outputs: [] },
  { name: "setApprovalForAll", type: "function", stateMutability: "nonpayable", inputs: [{ name: "operator", type: "address" }, { name: "approved", type: "bool" }], outputs: [] },
  { name: "transferFrom", type: "function", stateMutability: "nonpayable", inputs: [{ name: "from", type: "address" }, { name: "to", type: "address" }, { name: "tokenId", type: "uint256" }], outputs: [] },
  // Only the 3-arg overload is declared, so ethers sees no ambiguity and we can
  // call safeTransferFrom(from, to, tokenId) directly without the full signature.
  { name: "safeTransferFrom", type: "function", stateMutability: "nonpayable", inputs: [{ name: "from", type: "address" }, { name: "to", type: "address" }, { name: "tokenId", type: "uint256" }], outputs: [] },
  {
    name: "Transfer", type: "event",
    inputs: [
      { name: "from", indexed: true, type: "address" },
      { name: "to", indexed: true, type: "address" },
      { name: "tokenId", indexed: true, type: "uint256" },
    ],
  },

  // ---- Internal resale marketplace (10% royalty to organizer on-chain) ----
  { name: "listForResale", type: "function", stateMutability: "nonpayable", inputs: [{ name: "tokenId", type: "uint256" }, { name: "price", type: "uint256" }], outputs: [] },
  { name: "delistFromResale", type: "function", stateMutability: "nonpayable", inputs: [{ name: "tokenId", type: "uint256" }], outputs: [] },
  { name: "buyResale", type: "function", stateMutability: "payable", inputs: [{ name: "tokenId", type: "uint256" }], outputs: [] },
  { name: "resalePrice", type: "function", stateMutability: "view", inputs: [{ name: "tokenId", type: "uint256" }], outputs: [{ name: "", type: "uint256" }] },
  {
    name: "TicketListed", type: "event",
    inputs: [
      { name: "seller", indexed: true, type: "address" },
      { name: "tokenId", indexed: true, type: "uint256" },
      { name: "price", indexed: false, type: "uint256" },
    ],
  },
  {
    name: "TicketResold", type: "event",
    inputs: [
      { name: "seller", indexed: true, type: "address" },
      { name: "buyer", indexed: true, type: "address" },
      { name: "tokenId", indexed: true, type: "uint256" },
      { name: "price", indexed: false, type: "uint256" },
    ],
  },
];
