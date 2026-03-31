# 🪐 Saturn Protocol V1.2

> AI Trading Agents & Meme Token Locks — Built on Solana  
> Powered by **$SATURN** · 50% fee discount across the entire ecosystem

---

## 🌐 Live Apps

| App | File | Description |
|-----|------|-------------|
| **Saturn Hub** | `index.html` | Main dashboard & landing page |
| **Saturn Lock** | `lock.html` | Meme coin token locker + Jupiter swap |
| **Saturn Agents** | `agents.html` | AI trading bot marketplace |

---

## ⚡ Quick Start (GitHub Pages)

1. Fork or clone this repo
2. Go to **Settings → Pages → Source → main branch / root**
3. Your site will be live at `https://YOUR-USERNAME.github.io/saturn-protocol/`

---

## 🔧 Setup After Token Launch

Once you launch **$SATURN** on pump.fun, update this one line in all three HTML files:

```javascript
// In lock.html, agents.html, and index.html — find this line:
const SATURN_MINT = "PASTE_SATURN_MINT_HERE";

// Replace with your real mint address, e.g.:
const SATURN_MINT = "SATxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";
```

Files to update:
- `lock.html` — line ~10 in the `<script>` section
- `agents.html` — line ~10 in the `<script>` section  
- `index.html` — no mint needed (hub page only)

---

## 💸 Fee Structure

| Action | SOL Price | $SATURN Price | Savings |
|--------|-----------|---------------|---------|
| Create Token Lock | 0.5 SOL | 0.25 SOL equiv. | **50% off** |
| Agent Monthly Sub | 0.125 SOL/mo | 0.0625 SOL equiv. | **50% off** |
| Protocol Token Fee | 0.20% of locked tokens | 0.20% of locked tokens | Always |
| Agent Profit Share | 10% of profits | 5% of profits | **50% off** |

All fees route to: `F36PUYop1oCsBQMyP8aHncGppiGd1xyUm8k75PtHAoN3`

---

## 🔒 Saturn Lock Features

- ⏱ **Time-Based Locks** — lock tokens for days / weeks / months / years
- 📈 **Price-Based Locks** — unlock automatically when price target is hit
- 💎 **$SATURN discount** — pay 50% less using native token
- ⚡ **Built-in Jupiter Swap** — swap SOL → $SATURN directly in app
- 👛 **Multi-wallet** — Phantom, Solflare, Backpack, Coinbase, Brave, Trust
- 📊 **0.20% protocol fee** on all locked tokens (SPL transfer on-chain)

---

## 🤖 Saturn Agents — AI Trading Bots

| Agent | Strategy | Win Rate | Monthly Fee |
|-------|----------|----------|-------------|
| 🧠 The Mastermind | MACD + DCA memecoin | 67% | 0.125 SOL |
| 🎯 Sniper X | New token sniper | 54% | 0.125 SOL |
| 📈 DCA Steady | Dollar-cost averaging | 78% | 0.075 SOL |
| 🌊 Momentum Wave | RSI breakout | 61% | 0.125 SOL |
| 🛡️ Bundle Filter Pro | Anti-rug detection | 71% | 0.125 SOL |
| 🦉 Night Owl | Asian session trading | 58% | 0.100 SOL |

All agent fees are 50% cheaper when paid in **$SATURN**.

---

## 🪐 $SATURN Token

- **Name:** Saturn V1.2
- **Ticker:** $SATURN
- **Network:** Solana (SPL Token)
- **Decimals:** 9
- **Utility:** 50% discount on all Saturn Protocol fees
- **Launch:** pump.fun → auto-graduates to Raydium at $69K market cap

---

## 🛠 Tech Stack

- Pure HTML/CSS/JS — no framework needed
- [@solana/web3.js](https://github.com/solana-labs/solana-web3.js) for transactions
- [Jupiter Terminal](https://terminal.jup.ag) for in-app swaps
- GitHub Pages for hosting (free)

---

## 📁 File Structure

```
saturn-protocol/
├── index.html          ← Saturn Hub (main dashboard)
├── lock.html           ← Saturn Lock (token locker)
├── agents.html         ← Saturn Agents (AI bots)
├── saturn-config.js    ← Shared config (optional)
└── README.md
```

---

## 🚀 Deployment Options

### GitHub Pages (Free — Recommended)
See Quick Start above.

### Vercel (Free)
1. Connect your GitHub repo at vercel.com
2. Deploy — done. Auto-deploys on every push.

### Netlify (Free)
1. Drag and drop the folder at netlify.com/drop
2. Get instant URL.

---

## ⚠️ Post-Launch Checklist

- [ ] Launch $SATURN on pump.fun
- [ ] Copy mint address
- [ ] Replace `PASTE_SATURN_MINT_HERE` in `lock.html` and `agents.html`
- [ ] Update Jupiter swap `initialOutputMint` with real $SATURN mint
- [ ] Add real $SATURN price feed (Jupiter Price API or Birdeye)
- [ ] Deploy to GitHub Pages / Vercel
- [ ] Post contract address on Twitter and Telegram
- [ ] Submit to DEXScreener

---

## 📜 License

MIT — open source, fork freely.

---

Built with 🪐 by Saturn Protocol · [@pepetheparrot](https://x.com/pepetheparrot)
