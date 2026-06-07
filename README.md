# WolFest — Entradas NFT

dApp para comprar, ver y transferir entradas NFT de **WolFest**, un recital tributo al Indio Solari. Corre en la testnet **Sepolia** de Ethereum: las entradas son tokens ERC-721 que viven en un smart contract, no en una base de datos.

> Estética de flyer de recital, no de fintech. Negro, rojo, tipografía cruda.

---

## Probarlo

La app necesita **MetaMask** y la red **Sepolia** (el ETH es de testnet, no plata real).

1. Entrá a la app (o levantala local, ver abajo).
2. Tocá **Conectar MetaMask** — si estás en otra red, te ofrece pasar a Sepolia.
3. Mirá el precio y la disponibilidad, comprá una entrada, y vela aparecer en **Mis entradas**.

¿No tenés ETH de Sepolia? Pedí en un faucet (por ejemplo [sepoliafaucet.com](https://sepoliafaucet.com)).

---

## Qué hace

| Función | Detalle |
|---------|---------|
| Conexión de wallet | Detecta MetaMask, fuerza la red Sepolia, muestra la address truncada |
| Estado del evento | Precio, vendidas, disponibles y barra de aforo, leídos del contrato |
| Comprar entrada | Llama `buyTicket()` con el precio exacto y espera la confirmación |
| Mis entradas | Reconstruye lo que **poseés hoy** desde los eventos `Transfer` + `ownerOf` |
| Transferir entrada | Envía un ticket a otra address con `safeTransferFrom` (ERC-721) |
| Música | Reproductor del tema del recital con play/pausa y volumen |

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
| Address | `0xDe9a284E5b7609970773d899b061ae963109C079` |
| Estándar | ERC-721 |
| Explorador | [Etherscan](https://sepolia.etherscan.io/address/0xDe9a284E5b7609970773d899b061ae963109C079) |

---

## Estructura

Cada módulo de `js/` tiene **una sola responsabilidad** — una razón para cambiar.

```
wolfest/
├── index.html        HTML + estilos + carga del módulo de entrada
├── vercel.json       Rewrite para servir como sitio estático
├── tarea-fina.mp3    Tema del recital
└── js/
    ├── config.js       Address, red y ABI del contrato
    ├── state.js        Estado compartido de la conexión (provider, signer, account)
    ├── ui.js           DOM, toasts y formateo — todo lo que toca pantalla
    ├── wallet.js       Conexión a MetaMask y manejo de red
    ├── event-state.js  Lectura del estado del evento
    ├── buy.js          Flujo de compra
    ├── tickets.js      Reconstrucción y render de "Mis entradas"
    ├── transfer.js     Transferencia de entradas a otra address
    ├── player.js       Reproductor de música
    └── main.js         Orquesta y cablea los eventos
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
- **Reventa con pago:** la transferencia mueve el NFT pero **no cobra** — no es una venta atómica. Una reventa con pago garantizado requiere lógica nueva en el contrato (Solidity), no se resuelve desde el front.
- **Autoplay:** la música arranca solo cuando tocás play; los navegadores bloquean el audio automático.
