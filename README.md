# WolFest — Entradas NFT

dApp para comprar, ver, transferir y revender entradas NFT de **WolFest**, un recital tributo al Indio Solari. Corre en la testnet **Sepolia** de Ethereum: las entradas son tokens ERC-721 que viven en un smart contract, no en una base de datos.

> Estética de flyer de recital, no de fintech. Negro, rojo, tipografía cruda.

---

## Probarlo

La app necesita **MetaMask** y la red **Sepolia** (el ETH es de testnet, no plata real).

1. Entrá a la app (o levantala local, ver abajo).
2. Tocá **Conectar MetaMask** — si estás en otra red, te ofrece pasar a Sepolia.
3. Mirá el precio y la disponibilidad (visible sin wallet, leído de RPCs públicos), comprá una entrada, y vela aparecer en **Mis entradas**.

¿No tenés ETH de Sepolia? Pedí en un faucet (por ejemplo [sepoliafaucet.com](https://sepoliafaucet.com)).

---

## Qué hace

| Función | Detalle |
|---------|---------|
| Conexión de wallet | Detecta MetaMask, fuerza la red Sepolia, muestra la address truncada |
| Estado del evento | Precio, vendidas, disponibles y barra de aforo, leídos del contrato |
| Lectura sin wallet | El estado del evento y el marketplace cargan antes de conectar MetaMask (3 RPCs públicos en carrera) |
| Comprar entrada | Llama `buyTicket()` con el precio exacto y espera la confirmación |
| Mis entradas | Reconstruye lo que **poseés hoy** desde los eventos `Transfer` + `ownerOf` |
| Transferir entrada | Envía un ticket a otra address con `safeTransferFrom` (sin cobro, sin royalty) |
| Marketplace de reventa | Listá tu entrada con precio, cancelá la venta, o comprá la entrada de otro — el contrato cobra 10% al organizador y paga 90% al vendedor, de forma atómica on-chain |
| Música | Reproductor con playlist de 3 temas de Redondos: play/pausa, anterior, siguiente y volumen |

---

## Stack

Sin build step, sin npm. Todo por CDN.

- **HTML + JavaScript vanilla** con ES Modules (`type="module"`)
- **Tailwind CSS** vía CDN
- **ethers.js v6** vía CDN — la sintaxis difiere de v5 (`BrowserProvider`, `formatEther`, `parseEther`)

---

## Contrato

| Dato | Valor |
|------|-------|
| Red | Sepolia Testnet (`chainId` 11155111) |
| Address | `0xc5F938749d025c63eCB08D8Be119055fB677cB88` |
| Estándar | ERC-721 + EIP-2981 (royalties) + Ownable |
| Supply máximo | 1.000 entradas |
| Royalty de reventa | 10% al organizador, 90% al vendedor |
| Explorador | [Etherscan](https://sepolia.etherscan.io/address/0xc5F938749d025c63eCB08D8Be119055fB677cB88) |

---

## Estructura

Cada módulo de `js/` tiene **una sola responsabilidad** — una razón para cambiar.

```
wolfest/
├── index.html           HTML + estilos + carga del módulo de entrada
├── smart-contract.sol   Fuente del contrato desplegado
├── vercel.json          Rewrite para servir como sitio estático
├── assets/
│   ├── imgs/
│   │   └── indio-solari-muerte-saltograndeextra.png
│   └── sounds/
│       ├── Patricio Rey y sus Redonditos de Ricota - Tarea Fina (Audio Oficial).mp3
│       ├── Patricio Rey y sus Redonditos de Ricota - Nuestro Amo Juega al Esclavo (Audio Oficial).mp3
│       └── Patricio Rey y sus Redonditos de Ricota - Jijiji (Audio Oficial).mp3
└── js/
    ├── config.js        Address, red y ABI del contrato
    ├── state.js         Estado compartido de la conexión (provider, signer, account)
    ├── ui.js            DOM, toasts y formateo — todo lo que toca pantalla
    ├── wallet.js        Conexión a MetaMask y manejo de red
    ├── event-state.js   Lectura del estado del evento
    ├── buy.js           Flujo de compra
    ├── tickets.js       Reconstrucción y render de "Mis entradas"
    ├── transfer.js      Transferencia directa a otra address
    ├── marketplace.js   Reventa: listar, cancelar, comprar con royalty on-chain
    ├── player.js        Reproductor de música con playlist
    └── main.js          Orquesta y cablea los eventos
```

---

## Correr local

Los ES Modules **no funcionan abriendo el HTML con doble clic** (`file://`): necesitás servirlo por HTTP.

```bash
npx serve
# o cualquier server estático, o la extensión Live Server de VS Code
```

Después abrí la URL que te imprime (por ejemplo `http://localhost:3000`).

---

## Deploy

Es un sitio estático. Vercel lo detecta solo desde el repo de GitHub: no hace falta configuración extra. El `vercel.json` solo agrega el rewrite para que toda ruta sirva `index.html`.

---

## Notas

- **Es testnet.** Todo se paga con ETH de Sepolia. No hay plata real en juego.
- **Dos modos de transferencia:** la transferencia directa mueve el NFT sin cobrar nada; la reventa por marketplace es atómica — el contrato distribuye el pago y transfiere el NFT en la misma transacción.
- **Autoplay:** la música intenta arrancar al cargar; si el navegador lo bloquea, arranca con la primera interacción del usuario.
- **Fuente de la dirección pública en `config.js`:** ese es el único archivo a tocar si el contrato se redespliega.
