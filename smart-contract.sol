// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// ============================================================
//  WolFest — Entradas NFT en tributo al Indio Solari
//  Red: Sepolia Testnet
//  Estándar: ERC-721 + EIP-2981 (royalties)
// ============================================================

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract WolFest is ERC721, ERC721URIStorage, ERC2981, Ownable {

    // ─────────────────────────────────────────
    //  CONSTANTES DEL EVENTO
    // ─────────────────────────────────────────

    uint256 public constant MAX_SUPPLY  = 1000;   // Supply fijo: nunca se puede superar
    uint256 public constant ROYALTY_BPS = 1000;   // 10 % en basis points (1000 / 10000)

    // ─────────────────────────────────────────
    //  ESTADO GLOBAL
    // ─────────────────────────────────────────

    uint256 public ticketPrice;      // Precio en Wei; el owner lo puede actualizar
    uint256 private _nextTokenId;   // Contador interno de tokens (empieza en 0)

    // Almacenamiento del evento (compartido por todos los tokens)
    uint256 private _eventDate;
    string  private _officialUrl;

    // ─────────────────────────────────────────
    //  METADATOS ON-CHAIN POR ENTRADA
    // ─────────────────────────────────────────

    struct TicketMetadata {
        string  eventName;    // "WolFest — Tributo al Indio Solari"
        uint256 eventDate;    // Unix timestamp del inicio del evento
        string  officialUrl;  // Link a la página oficial
        uint256 seatNumber;   // Número de butaca (= tokenId + 1)
    }

    mapping(uint256 => TicketMetadata) private _ticketData;

    // ─────────────────────────────────────────
    //  MARKETPLACE INTERNO DE REVENTA
    // ─────────────────────────────────────────

    // tokenId => precio de reventa en Wei (0 = no está en venta)
    mapping(uint256 => uint256) public resalePrice;

    // ─────────────────────────────────────────
    //  EVENTOS
    // ─────────────────────────────────────────

    event TicketPurchased(address indexed buyer, uint256 indexed tokenId, uint256 seatNumber);
    event TicketListed(address indexed seller, uint256 indexed tokenId, uint256 price);
    event TicketDelisted(address indexed seller, uint256 indexed tokenId);
    event TicketResold(address indexed seller, address indexed buyer, uint256 indexed tokenId, uint256 price);
    event TicketPriceUpdated(uint256 oldPrice, uint256 newPrice);
    event FundsWithdrawn(address indexed to, uint256 amount);

    // ─────────────────────────────────────────
    //  CONSTRUCTOR
    // ─────────────────────────────────────────

    /**
     * @param initialPrice  Precio inicial de la entrada en Wei
     *                      Ejemplo: 0.01 ETH = 10_000_000_000_000_000
     * @param eventDate     Unix timestamp del evento (ej: 1735689600 = 01/01/2025 00:00 UTC)
     * @param officialUrl   URL del evento (ej: "https://wolfest.vercel.app")
     */
    constructor(
        uint256 initialPrice,
        uint256 eventDate,
        string memory officialUrl
    )
        ERC721("WolFest", "WOLF")
        Ownable(msg.sender)
    {
        ticketPrice  = initialPrice;
        _eventDate   = eventDate;
        _officialUrl = officialUrl;

        // EIP-2981: el receiver de royalties es el deployer (organizador)
        _setDefaultRoyalty(msg.sender, uint96(ROYALTY_BPS));
    }

    // ─────────────────────────────────────────
    //  FUNCIÓN PRINCIPAL: COMPRA DE ENTRADA
    // ─────────────────────────────────────────

    /**
     * @notice Cualquier persona puede llamar a esta función enviando exactamente
     *         `ticketPrice` Wei para recibir su entrada NFT.
     *
     * Flujo:
     *   1. Validamos que queden entradas disponibles.
     *   2. Validamos que el ETH enviado sea exactamente el precio.
     *   3. Generamos un nuevo tokenId.
     *   4. Linkeamos la address del comprador con el token (safeMint).
     *   5. Guardamos los metadatos on-chain de esa entrada.
     *   6. Emitimos el evento TicketPurchased.
     *   7. Retornamos el tokenId.
     */
    function buyTicket() external payable returns (uint256) {

        require(
            _nextTokenId < MAX_SUPPLY,
            "WolFest: sold out, no hay mas entradas"
        );
        require(
            msg.value == ticketPrice,
            "WolFest: el monto enviado no coincide con el precio de la entrada"
        );

        uint256 tokenId = _nextTokenId;
        _nextTokenId++;

        _safeMint(msg.sender, tokenId);

        _ticketData[tokenId] = TicketMetadata({
            eventName  : "WolFest - Tributo al Indio Solari",
            eventDate  : _eventDate,
            officialUrl: _officialUrl,
            seatNumber : tokenId + 1
        });

        emit TicketPurchased(msg.sender, tokenId, tokenId + 1);
        return tokenId;
    }

    // ─────────────────────────────────────────
    //  MARKETPLACE INTERNO DE REVENTA
    // ─────────────────────────────────────────

    /**
     * @notice El holder lista su entrada para reventa en el marketplace interno.
     *         El precio tiene que ser mayor a 0.
     *         El contrato queda aprobado para transferir el token cuando se venda.
     *
     * @param tokenId  ID del token a listar
     * @param price    Precio de reventa en Wei
     */
    function listForResale(uint256 tokenId, uint256 price) external {
        require(ownerOf(tokenId) == msg.sender, "WolFest: no sos el owner de esta entrada");
        require(price > 0, "WolFest: el precio debe ser mayor a 0");

        // Aprobamos al contrato para mover el token cuando se concrete la venta
        approve(address(this), tokenId);

        resalePrice[tokenId] = price;

        emit TicketListed(msg.sender, tokenId, price);
    }

    /**
     * @notice El holder baja su entrada del marketplace (cancela la venta).
     *
     * @param tokenId  ID del token a deslistar
     */
    function delistFromResale(uint256 tokenId) external {
        require(ownerOf(tokenId) == msg.sender, "WolFest: no sos el owner de esta entrada");
        require(resalePrice[tokenId] > 0, "WolFest: la entrada no esta listada");

        resalePrice[tokenId] = 0;

        emit TicketDelisted(msg.sender, tokenId);
    }

    /**
     * @notice Compra una entrada listada en el marketplace interno.
     *         El comprador debe enviar exactamente el precio de reventa.
     *         El 10% va al organizador (royalty), el 90% restante al vendedor.
     *
     * @param tokenId  ID del token a comprar
     */
    function buyResale(uint256 tokenId) external payable {
        uint256 price = resalePrice[tokenId];

        require(price > 0, "WolFest: esta entrada no esta en venta");
        require(msg.value == price, "WolFest: el monto enviado no coincide con el precio de reventa");

        address seller = ownerOf(tokenId);
        require(seller != msg.sender, "WolFest: no podes comprarte tu propia entrada");

        // Calculamos el royalty (10%) y lo que le queda al vendedor (90%)
        uint256 royaltyAmount = (price * ROYALTY_BPS) / 10000;
        uint256 sellerAmount  = price - royaltyAmount;

        // Bajamos el listing antes de transferir (previene reentrancy)
        resalePrice[tokenId] = 0;

        // Transferimos el NFT del vendedor al comprador
        // Usamos transferFrom con address(this) como operador aprobado
        _transfer(seller, msg.sender, tokenId);

        // Distribuimos el ETH
        (bool okRoyalty, ) = payable(owner()).call{value: royaltyAmount}("");
        require(okRoyalty, "WolFest: fallo el pago del royalty");

        (bool okSeller, ) = payable(seller).call{value: sellerAmount}("");
        require(okSeller, "WolFest: fallo el pago al vendedor");

        emit TicketResold(seller, msg.sender, tokenId, price);
    }

    // ─────────────────────────────────────────
    //  REVENTA P2P (transferencia directa)
    // ─────────────────────────────────────────
    //
    //  Las funciones transfer/safeTransfer de ERC-721 ya están heredadas y
    //  habilitadas. Cualquier holder puede transferir su entrada a otra address
    //  directamente, sin pasar por el marketplace interno.
    //
    //  DIFERENCIA CON EL MARKETPLACE INTERNO:
    //  - Transferencia directa: el royalty NO se cobra (limitación del estándar).
    //  - Marketplace interno:   el royalty del 10% se cobra on-chain sí o sí.
    //
    //  Los royalties EIP-2981 se cobran en marketplaces externos (OpenSea, etc.)
    //  que respetan el estándar pero no en transferencias directas entre wallets.

    // ─────────────────────────────────────────
    //  LECTURA DE METADATOS
    // ─────────────────────────────────────────

    /// @notice Devuelve los metadatos on-chain de una entrada
    function getTicketMetadata(uint256 tokenId)
        external
        view
        returns (TicketMetadata memory)
    {
        require(_ownerOf(tokenId) != address(0), "WolFest: token no existe");
        return _ticketData[tokenId];
    }

    /// @notice Entradas ya vendidas
    function totalMinted() external view returns (uint256) {
        return _nextTokenId;
    }

    /// @notice Entradas disponibles
    function remainingTickets() external view returns (uint256) {
        return MAX_SUPPLY - _nextTokenId;
    }

    // ─────────────────────────────────────────
    //  FUNCIONES DE ADMINISTRACIÓN (solo owner)
    // ─────────────────────────────────────────

    /// @notice Actualiza el precio de la entrada (en Wei)
    function setTicketPrice(uint256 newPrice) external onlyOwner {
        emit TicketPriceUpdated(ticketPrice, newPrice);
        ticketPrice = newPrice;
    }

    /// @notice Actualiza la fecha del evento (Unix timestamp)
    function setEventDate(uint256 newDate) external onlyOwner {
        _eventDate = newDate;
    }

    /// @notice Actualiza la URL oficial del evento
    function setOfficialUrl(string memory newUrl) external onlyOwner {
        _officialUrl = newUrl;
    }

    /// @notice Actualiza el receptor de royalties
    function setRoyaltyReceiver(address newReceiver) external onlyOwner {
        require(newReceiver != address(0), "WolFest: address invalida");
        _setDefaultRoyalty(newReceiver, uint96(ROYALTY_BPS));
    }

    /// @notice Retira todo el ETH acumulado en el contrato hacia el owner
    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "WolFest: no hay fondos para retirar");
        (bool ok, ) = payable(owner()).call{value: balance}("");
        require(ok, "WolFest: fallo la transferencia");
        emit FundsWithdrawn(owner(), balance);
    }

    // ─────────────────────────────────────────
    //  OVERRIDES REQUERIDOS POR SOLIDITY
    // ─────────────────────────────────────────

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage, ERC2981)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
