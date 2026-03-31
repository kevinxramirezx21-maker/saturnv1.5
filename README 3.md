# 🪐 Saturn Protocol V1.2

> The first Solana protocol combining AI trading agents with meme coin token locking — powered by the **$SATURN** native token.

## 🌐 Live Apps

| App | File | Description |
|-----|------|-------------|
| 🪐 Saturn Terminal | `index.html` | Main hub — home, swap, navigation |
| 🔒 Saturn Lock | `lock.html` | Meme coin token locker |
| 🤖 Saturn Agents | `agents.html` | AI trading bot marketplace |

---

## 💎 $SATURN Token Utility

| Action | SOL Price | $SATURN Price |
|--------|-----------|---------------|
| Create a token lock | 0.5 SOL | ~50% off |
| Deploy an AI agent | 0.125 SOL/month | ~50% off |
| Protocol fee (all locks) | 0.20% of tokens | — |

---

## 🚀 Step 1 — Update your SATURN_MINT

After launching $SATURN on pump.fun, replace the mint address in **all three files**:

Search for this in `index.html`, `lock.html`, and `agents.html`:
```
PASTE_SATURN_MINT_HERE
```
Replace with your real mint address, e.g.:
```
const SATURN_MINT = "YourRealMintAddressHere123456789";
```

---

## 📁 Step 2 — Create GitHub Repository

### On GitHub.com:
1. Go to **github.com** and log in
2. Click the **+** button → **New repository**
3. Name it: `saturn-protocol`
4. Set to **Public**
5. Do NOT check "Add README" (we already have one)
6. Click **Create repository**

### On your computer (Windows):
Open **Command Prompt** or **Git Bash** and run:

```bash
# 1. Navigate to your project folder
cd C:\Users\YourName\Desktop

# 2. Create the folder
mkdir saturn-protocol
cd saturn-protocol

# 3. Copy your files into this folder, then:
git init
git add .
git commit -m "🪐 Saturn Protocol V1.2 - Initial launch"
git branch -M main
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/saturn-protocol.git
git push -u origin main
```

> Replace `YOUR_GITHUB_USERNAME` with your actual GitHub username (kevinxramirezx21-maker)

---

## 🌐 Step 3 — Deploy to GitHub Pages (FREE hosting)

1. Go to your repository on GitHub
2. Click **Settings** tab
3. Scroll down to **Pages** (left sidebar)
4. Under **Source**, select **Deploy from a branch**
5. Branch: `main` · Folder: `/ (root)`
6. Click **Save**

Your site will be live at:
```
https://kevinxramirezx21-maker.github.io/saturn-protocol/
```

✅ `index.html` will be the homepage (Saturn Terminal)
✅ `lock.html` → `.../saturn-protocol/lock.html`
✅ `agents.html` → `.../saturn-protocol/agents.html`

---

## ⚙️ Step 4 — After Launch Checklist

### Immediately after getting your pump.fun mint address:
- [ ] Update `SATURN_MINT` in all 3 HTML files
- [ ] Commit and push: `git add . && git commit -m "Update SATURN_MINT" && git push`
- [ ] GitHub Pages auto-deploys in ~60 seconds

### Update price feed (optional — replace fake price):
Find this in all files:
```javascript
satUSD = 0.005; // replace with real oracle post-launch
```
Replace with a call to Jupiter Price API:
```javascript
const r = await fetch(`https://price.jup.ag/v6/price?ids=${SATURN_MINT}`);
const d = await r.json();
satUSD = d.data[SATURN_MINT]?.price || 0.005;
```

### Update fee wallet (already set to yours):
```javascript
const FEE_WALLET = "F36PUYop1oCsBQMyP8aHncGppiGd1xyUm8k75PtHAoN3";
```
This is already your wallet — no change needed.

---

## 🛠 File Structure

```
saturn-protocol/
├── index.html       ← Saturn Terminal (main hub + swap)
├── lock.html        ← Saturn Lock (token locker)
├── agents.html      ← Saturn Agents (AI bot marketplace)
└── README.md        ← This file
```

---

## 🔗 Links to Update

After launch, update these placeholders in all files:

| Placeholder | Replace with |
|-------------|-------------|
| `PASTE_SATURN_MINT_HERE` | Your real $SATURN mint address |
| `YOUR_WEBSITE_URL` | `https://kevinxramirezx21-maker.github.io/saturn-protocol/` |

---

## 💳 Fee Architecture

All fees are sent to: `F36PUYop1oCsBQMyP8aHncGppiGd1xyUm8k75PtHAoN3`

| Fee Type | Amount | Method |
|----------|--------|--------|
| Lock creation (SOL) | 0.5 SOL | `SystemProgram.transfer` |
| Lock creation ($SATURN) | ~50% equivalent | SPL token transfer |
| Agent subscription (SOL) | 0.125 SOL/month | `SystemProgram.transfer` |
| Agent subscription ($SATURN) | ~50% equivalent | SPL token transfer |
| Protocol fee (tokens) | 0.20% of locked amount | SPL token transfer |

---

## 🤝 Supported Wallets

All three apps support:
- 🟣 Phantom
- 🔶 Solflare
- 🎒 Backpack
- 🔵 Coinbase Wallet
- 🦁 Brave Wallet
- 🛡️ Trust Wallet

---

## ⚡ Quick Deploy Commands

```bash
# Push an update
git add .
git commit -m "Update SATURN_MINT and price feed"
git push

# Check status
git status

# View commit history
git log --oneline
```

---

Built with ❤️ on Solana · Saturn Protocol V1.2 · $SATURN
