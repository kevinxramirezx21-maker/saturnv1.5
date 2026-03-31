// ============================================================
// SATURN v1.5 — FINAL PRODUCTION BUILD
// All 6 bots | Jupiter live quotes | DexScreener new pairs
// Slippage control | MEV protection | Aggressive mode
// Real PnL tracking | Helius RPC | Browser-safe
// ============================================================

const DEV_CODE        = “boss2026”;
const DEV_SESSION_KEY = “saturn_dev_mode”;

let logoTapCount = 0;
let logoTapTimer  = null;

const RPC_URL    = “https://mainnet.helius-rpc.com/?api-key=91b12828-68ae-42f0-a425-c7874c31d61d”;
const connection = new solanaWeb3.Connection(RPC_URL, “confirmed”);
const SOL_MINT   = “So11111111111111111111111111111111111111112”;
const LAMPORTS   = 1_000_000_000;

const JUPITER_PRICE_API = “https://lite-api.jup.ag/price/v2”;
const JUPITER_QUOTE_API = “https://lite-api.jup.ag/swap/v1/quote”;
const JUPITER_SWAP_API  = “https://lite-api.jup.ag/swap/v1/swap”;
const DEX_NEW_PAIRS_API = “https://api.dexscreener.com/token-profiles/latest/v1”;
const DEX_PAIR_INFO_API = “https://api.dexscreener.com/latest/dex/tokens”;

let globalSlippageBps = parseFloat(localStorage.getItem(“globalSlippageBps”) || “150”);
let aggressiveEnabled = false;
let mevProtection     = localStorage.getItem(“mevProtection”) !== “false”;

let AGENTS_CONFIG = {
“The Mastermind”:    { active: true, intervalMs: 3600000, amountSol: parseFloat(localStorage.getItem(“masterAmount”)   || “0.05”),  slippageBps: null, strategy: “highVolume”, minLiqUsd: 50000 },
“Sniper X”:          { active: true, intervalMs: 120000,  amountSol: parseFloat(localStorage.getItem(“sniperAmount”)   || “0.02”),  slippageBps: 300,  strategy: “newest”,     minLiqUsd: 3000  },
“DCA Steady”:        { active: true, intervalMs: 1800000, amountSol: parseFloat(localStorage.getItem(“dcaAmount”)      || “0.01”),  slippageBps: null, strategy: “highVolume”, minLiqUsd: 10000 },
“Momentum Wave”:     { active: true, intervalMs: 600000,  amountSol: parseFloat(localStorage.getItem(“momentumAmount”) || “0.015”), slippageBps: null, strategy: “momentum”,   minLiqUsd: 5000  },
“Bundle Filter Pro”: { active: true, intervalMs: 900000,  amountSol: parseFloat(localStorage.getItem(“bundleAmount”)   || “0.01”),  slippageBps: null, strategy: “safeOnly”,   minLiqUsd: 25000 },
“Night Owl”:         { active: true, intervalMs: 900000,  amountSol: parseFloat(localStorage.getItem(“owlAmount”)      || “0.005”), slippageBps: null, strategy: “highVolume”, minLiqUsd: 5000  }
};

let tradeHistory = JSON.parse(localStorage.getItem(“saturnTrades”) || “[]”);
let liveFeedLog  = [];

function saveTrade(agentName, coin, entryPriceUsd, amountSol, txid) {
const record = { agent: agentName, symbol: coin.symbol, mint: coin.address, entryPriceUsd, amountSol, txid, ts: Date.now(), pnlPct: null };
tradeHistory.unshift(record);
if (tradeHistory.length > 100) tradeHistory.pop();
localStorage.setItem(“saturnTrades”, JSON.stringify(tradeHistory));
}

async function updatePnL() {
const open = tradeHistory.filter(t => t.pnlPct === null && t.mint);
if (!open.length) return;
const mints = […new Set(open.map(t => t.mint))].join(”,”);
try {
const res  = await fetch(`${JUPITER_PRICE_API}?ids=${mints}`, { signal: AbortSignal.timeout(6000) });
const data = await res.json();
let changed = false;
tradeHistory.forEach(t => {
if (t.mint && data.data?.[t.mint] && t.pnlPct === null) {
const cur = parseFloat(data.data[t.mint].price);
if (t.entryPriceUsd > 0 && cur > 0) { t.pnlPct = (((cur - t.entryPriceUsd) / t.entryPriceUsd) * 100).toFixed(2); changed = true; }
}
});
if (changed) localStorage.setItem(“saturnTrades”, JSON.stringify(tradeHistory));
} catch (e) { console.warn(”[Saturn] PnL update failed:”, e.message); }
}

function base64ToUint8Array(base64) {
const bin = atob(base64); const bytes = new Uint8Array(bin.length);
for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
return bytes;
}

function saveSlippage(value) {
globalSlippageBps = Math.max(50, Math.min(1000, parseFloat(value) || 150));
localStorage.setItem(“globalSlippageBps”, globalSlippageBps);
addToLiveFeed(`⚙️ Slippage → ${(globalSlippageBps / 100).toFixed(1)}%`);
}

function saveMevProtection(enabled) {
mevProtection = enabled;
localStorage.setItem(“mevProtection”, String(enabled));
addToLiveFeed(enabled ? “🛡️ MEV Protection ON” : “🛡️ MEV Protection OFF”);
}

function saveAmount(agentName, value) {
const keyMap = { “The Mastermind”: “masterAmount”, “Sniper X”: “sniperAmount”, “DCA Steady”: “dcaAmount”, “Momentum Wave”: “momentumAmount”, “Bundle Filter Pro”: “bundleAmount”, “Night Owl”: “owlAmount” };
const parsed = Math.max(0.001, Math.min(10, parseFloat(value) || 0.01));
if (keyMap[agentName]) localStorage.setItem(keyMap[agentName], parsed);
if (AGENTS_CONFIG[agentName]) AGENTS_CONFIG[agentName].amountSol = parsed;
addToLiveFeed(`⚙️ ${agentName} → ${parsed} SOL per trade`);
}

async function scanNewPairsFromDexScreener() {
try {
const res   = await fetch(DEX_NEW_PAIRS_API, { signal: AbortSignal.timeout(8000) });
if (!res.ok) throw new Error(`HTTP ${res.status}`);
const items = await res.json();
const solItems = items.filter(t => t.chainId === “solana” && t.tokenAddress).slice(0, 25);
if (!solItems.length) return getFallbackCoins();
const pairRes  = await fetch(`${DEX_PAIR_INFO_API}/${solItems.map(t => t.tokenAddress).join(",")}`, { signal: AbortSignal.timeout(8000) });
if (!pairRes.ok) return getFallbackCoins();
const pairData = await pairRes.json();
const pairs    = (pairData.pairs || []).filter(p => p.chainId === “solana” && parseFloat(p.liquidity?.usd || 0) > 1000);
if (!pairs.length) return getFallbackCoins();
return pairs.map(p => ({ address: p.baseToken.address, symbol: p.baseToken.symbol, name: p.baseToken.name, priceUsd: parseFloat(p.priceUsd || 0), liquidityUsd: parseFloat(p.liquidity?.usd || 0), volume24h: parseFloat(p.volume?.h24 || 0), priceChange24h: parseFloat(p.priceChange?.h24 || 0), pairAddress: p.pairAddress, dexId: p.dexId, createdAt: p.pairCreatedAt || 0 }));
} catch (e) { console.warn(”[Saturn] DexScreener failed:”, e.message); return getFallbackCoins(); }
}

function selectCoinForStrategy(coins, strategy, minLiqUsd) {
const eligible = coins.filter(c => c.liquidityUsd >= minLiqUsd);
if (!eligible.length) return coins[0] || null;
switch (strategy) {
case “newest”:     return eligible.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))[0];
case “momentum”:   return (eligible.filter(c => c.priceChange24h > 0).sort((a, b) => b.priceChange24h - a.priceChange24h)[0]) || eligible[0];
case “safeOnly”:   return (eligible.filter(c => c.volume24h > 5000).sort((a, b) => b.liquidityUsd - a.liquidityUsd)[0]) || eligible[0];
default:           return eligible.sort((a, b) => b.volume24h - a.volume24h)[0];
}
}

function getFallbackCoins() {
addToLiveFeed(“⚠️ DexScreener unavailable — using fallback tokens”);
return [
{ address: “DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263”, symbol: “BONK”, liquidityUsd: 1000000, volume24h: 500000, priceChange24h: 0 },
{ address: “JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN”,  symbol: “JUP”,  liquidityUsd: 5000000, volume24h: 1000000, priceChange24h: 0 }
];
}

async function getJupiterPrice(mintAddress) {
try {
const res  = await fetch(`${JUPITER_PRICE_API}?ids=${mintAddress}`, { signal: AbortSignal.timeout(5000) });
if (!res.ok) throw new Error(`HTTP ${res.status}`);
const data = await res.json();
return parseFloat(data.data?.[mintAddress]?.price || 0);
} catch (e) { console.warn(”[Saturn] Price fetch failed:”, e.message); return 0; }
}

async function getJupiterQuote(outputMint, amountLamports, agentSlippageOverride = null) {
let slippage = agentSlippageOverride ?? globalSlippageBps;
if (aggressiveEnabled) slippage = Math.max(slippage, 500);
try {
const params = new URLSearchParams({ inputMint: SOL_MINT, outputMint, amount: amountLamports, slippageBps: slippage });
const res    = await fetch(`${JUPITER_QUOTE_API}?${params}`, { signal: AbortSignal.timeout(8000) });
if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || `HTTP ${res.status}`); }
return await res.json();
} catch (e) { console.warn(”[Saturn] Quote failed:”, e.message); return null; }
}

async function executeJupiterSwap(quote, wallet) {
try {
const priorityFee = mevProtection ? (aggressiveEnabled ? 25000 : 10000) : “auto”;
const res = await fetch(JUPITER_SWAP_API, {
method: “POST”,
headers: { “Content-Type”: “application/json” },
body: JSON.stringify({ quoteResponse: quote, userPublicKey: wallet.publicKey.toString(), wrapAndUnwrapSol: true, dynamicComputeUnitLimit: true, prioritizationFeeLamports: priorityFee }),
signal: AbortSignal.timeout(15000)
});
if (!res.ok) throw new Error(`Swap API HTTP ${res.status}`);
const { transaction } = await res.json();
if (!transaction) throw new Error(“No transaction returned”);
const tx       = solanaWeb3.VersionedTransaction.deserialize(base64ToUint8Array(transaction));
const signedTx = await wallet.signTransaction(tx);
return await connection.sendRawTransaction(signedTx.serialize(), { skipPreflight: true, maxRetries: 3 });
} catch (e) { console.error(”[Saturn] Swap failed:”, e.message); return null; }
}

async function doTrade(agentName, wallet) {
const config = AGENTS_CONFIG[agentName];
if (!config?.active) return;
addToLiveFeed(`🤖 <strong>${agentName}</strong> scanning...`);
const allCoins = await scanNewPairsFromDexScreener();
const coin     = selectCoinForStrategy(allCoins, config.strategy, config.minLiqUsd);
if (!coin) { addToLiveFeed(`❌ ${agentName}: No valid coin found`); return; }
const amountLamports = Math.floor(config.amountSol * LAMPORTS);
const livePrice      = await getJupiterPrice(coin.address);
const displayPrice   = livePrice || coin.priceUsd || 0;
addToLiveFeed(`📡 <strong>${coin.symbol}</strong> @ $${displayPrice > 0 ? displayPrice.toFixed(8) : "—"} | 💧$${(coin.liquidityUsd / 1000).toFixed(0)}k`);
const quote = await getJupiterQuote(coin.address, amountLamports, config.slippageBps);
if (!quote) { addToLiveFeed(`❌ ${agentName}: Quote failed for ${coin.symbol}`); return; }
const expectedOut = (parseInt(quote.outAmount) / Math.pow(10, quote.outputDecimals ?? 9)).toFixed(4);
addToLiveFeed(`💱 ${agentName} → ${expectedOut} ${coin.symbol} for ${config.amountSol} SOL`);
const txid = await executeJupiterSwap(quote, wallet);
if (txid) {
saveTrade(agentName, coin, displayPrice, config.amountSol, txid);
addToLiveFeed(`🎉 <strong>${agentName}</strong> done! <a href="https://solscan.io/tx/${txid}" target="_blank" style="color:#c9a84c">${txid.slice(0,8)}…</a>`);
updateAgentCard(agentName, coin, displayPrice);
console.log(`🚀 ${agentName} → ${coin.symbol} | https://solscan.io/tx/${txid}`);
} else { addToLiveFeed(`❌ ${agentName}: TX failed — check wallet or slippage`); }
}

async function refreshDexScreenerFeedDisplay() {
const coins = await scanNewPairsFromDexScreener();
coins.slice(0, 8).forEach(c => {
const chg    = c.priceChange24h;
const arrow  = chg > 5 ? “🚀” : chg > 0 ? “🟢” : chg < -5 ? “💀” : chg < 0 ? “🔴” : “⚪”;
const chgStr = chg ? ` ${chg > 0 ? "+" : ""}${chg.toFixed(1)}%` : “”;
const liqStr = c.liquidityUsd ? ` 💧$${(c.liquidityUsd / 1000).toFixed(0)}k` : “”;
addToLiveFeed(`${arrow} <strong>${c.symbol}</strong> $${c.priceUsd?.toFixed(8) || "—"}${chgStr}${liqStr}`, false);
});
}

function addToLiveFeed(html, prepend = true) {
const entry = { html, ts: new Date().toLocaleTimeString(“en-US”, { hour: “2-digit”, minute: “2-digit” }) };
prepend ? liveFeedLog.unshift(entry) : liveFeedLog.push(entry);
if (liveFeedLog.length > 25) liveFeedLog.pop();
const box = document.getElementById(“liveFeedBox”);
if (box) {
box.innerHTML = liveFeedLog.map(l => `<div style="display:flex;justify-content:space-between;gap:8px;padding:4px 0;border-bottom:1px solid #2a2a2a;font-size:12px"><span>${l.html}</span><span style="color:#555;flex-shrink:0">${l.ts}</span></div>`).join(””);
box.scrollTop = 0;
}
}

function updateAgentCard(agentName, coin, entryPrice) {
const agentTrades = tradeHistory.filter(t => t.agent === agentName && t.pnlPct !== null);
const avgPnl      = agentTrades.length ? (agentTrades.reduce((s, t) => s + parseFloat(t.pnlPct), 0) / agentTrades.length).toFixed(2) : null;
const totalTrades = tradeHistory.filter(t => t.agent === agentName).length;
document.querySelectorAll(”.agent-card, .card”).forEach(card => {
if (!card.textContent.includes(agentName)) return;
const pnlEl    = card.querySelector(”.pnl, .PNL, [data-pnl]”);
const tradesEl = card.querySelector(”.trades, .TRADES, [data-trades]”);
const tokenEl  = card.querySelector(”.token, [data-token]”);
if (pnlEl && avgPnl !== null) { pnlEl.textContent = `${parseFloat(avgPnl) >= 0 ? "+" : ""}${avgPnl}%`; pnlEl.style.color = parseFloat(avgPnl) >= 0 ? “#4ade80” : “#f87171”; }
if (tradesEl) tradesEl.textContent = totalTrades;
if (tokenEl && coin?.symbol) tokenEl.textContent = coin.symbol;
});
}

async function runAgentEngine() {
const wallet = window.solana || window.phantom?.solana;
if (!wallet?.isConnected) { addToLiveFeed(“🔌 Wallet not connected — bots paused”); return; }
await refreshDexScreenerFeedDisplay();
await updatePnL();
const active = Object.entries(AGENTS_CONFIG).filter(([, c]) => c.active);
for (const [name] of active) { await doTrade(name, wallet); await new Promise(r => setTimeout(r, 2500)); }
}

function initDevMode() {
if (sessionStorage.getItem(DEV_SESSION_KEY) === “true”) applyDevMode(true);
const logo = document.getElementById(“saturnLogo”) || document.querySelector(“img”);
if (!logo) return;
logo.style.cursor = “pointer”;
logo.addEventListener(“click”, () => { logoTapCount++; clearTimeout(logoTapTimer); logoTapTimer = setTimeout(() => { logoTapCount = 0; }, 3000); if (logoTapCount >= 5) { logoTapCount = 0; openDevModal(); } });
}

function openDevModal() {
if (document.getElementById(“devModal”)) return;
const modal = Object.assign(document.createElement(“div”), { id: “devModal” });
modal.innerHTML = `<div style="position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:9999;display:flex;align-items:center;justify-content:center"><div style="background:#111;border:1px solid #c9a84c;padding:28px;border-radius:14px;width:320px;box-shadow:0 0 40px rgba(201,168,76,.2)"><h3 style="color:#c9a84c;margin:0 0 6px;font-size:18px">🪐 Dev Mode</h3><p style="color:#666;font-size:12px;margin:0 0 16px">Enter your dev code to unlock</p><input id="devCodeInput" type="password" placeholder="Enter code…" style="width:100%;box-sizing:border-box;padding:10px;background:#1a1a1a;border:1px solid #333;color:#fff;border-radius:8px;margin-bottom:14px;font-size:14px"/><div style="display:flex;gap:8px"><button onclick="submitDevCode()" style="flex:1;padding:10px;background:#c9a84c;color:#000;border:none;border-radius:8px;cursor:pointer;font-weight:bold;font-size:14px">Activate</button><button onclick="document.getElementById('devModal').remove()" style="flex:1;padding:10px;background:#222;color:#aaa;border:1px solid #333;border-radius:8px;cursor:pointer;font-size:14px">Cancel</button></div></div></div>`;
document.body.appendChild(modal);
document.getElementById(“devCodeInput”)?.focus();
}

function submitDevCode() {
const input = document.getElementById(“devCodeInput”)?.value?.trim();
if (input === DEV_CODE) { sessionStorage.setItem(DEV_SESSION_KEY, “true”); applyDevMode(true); document.getElementById(“devModal”)?.remove(); addToLiveFeed(“🔓 Dev mode activated”); }
else { const inp = document.getElementById(“devCodeInput”); if (inp) { inp.style.borderColor = “#f87171”; inp.value = “”; inp.placeholder = “Wrong code…”; } }
}
function deactivateDev()    { sessionStorage.removeItem(DEV_SESSION_KEY); applyDevMode(false); addToLiveFeed(“🔒 Dev mode deactivated”); }
function applyDevMode(active) { const b = document.getElementById(“devBadge”); if (b) b.style.display = active ? “flex” : “none”; }

if (window.location.pathname.includes(“agents”)) {
console.log(“✅ SATURN v1.5 — 6 bots | Jupiter lite-api | DexScreener | Helius RPC | MEV shield”);
window.addEventListener(“load”, () => {
initDevMode();
const slider = document.getElementById(“slippageSlider”);
if (slider) { slider.value = globalSlippageBps; slider.addEventListener(“input”, e => { saveSlippage(e.target.value); const lbl = document.getElementById(“slippageLabel”); if (lbl) lbl.textContent = `${(globalSlippageBps / 100).toFixed(1)}%`; }); }
const mevToggle = document.getElementById(“mevToggle”);
if (mevToggle) { mevToggle.checked = mevProtection; mevToggle.addEventListener(“change”, e => saveMevProtection(e.target.checked)); }
const aggToggle = document.getElementById(“aggressiveToggle”);
if (aggToggle) { aggToggle.addEventListener(“change”, e => { aggressiveEnabled = e.target.checked; if (aggressiveEnabled && !confirm(“⚠️ AGGRESSIVE MODE\n\nHigher slippage (min 5%) + max MEV boost\nHigher risk / higher reward.\n\nContinue?”)) { aggToggle.checked = false; aggressiveEnabled = false; } addToLiveFeed(aggressiveEnabled ? “⚡ AGGRESSIVE MODE ON” : “⚡ Aggressive mode OFF”); }); }
refreshDexScreenerFeedDisplay();
setInterval(runAgentEngine, 30000);
setInterval(updatePnL, 120000);
});
}
