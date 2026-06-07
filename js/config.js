// Contract identity and ABI. This is the only file that changes when the
// deployed contract changes — addresses, network, and function signatures live here.

export const CONTRACT_ADDRESS = "0xDe9a284E5b7609970773d899b061ae963109C079";
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
];
