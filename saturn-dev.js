// ============================================================
// SATURN v1.5 — saturn-dev.js (FINAL)
// All 6 bots | Jupiter lite-api | DexScreener new pairs
// Slippage | MEV protection | Aggressive mode | Real PnL
// ============================================================

// Match HTML’s session key exactly
const DEV_SESSION_KEY = “saturn_dev_v12”;

const SOL_MINT   = “So11111111111111111111111111111111111111112”;
const LAMPORTS   = 1_000_000_000;

const JUPITER_PRICE_API = “https://lite-api.jup.ag/price/v2”;
const JUPITER_QUOTE_API = “https://lite-api.jup.ag/swap/v1/quote”;
const JUPITER_SWAP_API  = “https://lite-api.jup.ag/swap/v1/swap”;
const DEX_NEW_PAIRS_API = “https://api.dexscreener.com/token-profiles/latest/v1”;
const DEX_PAIR_INFO_API = “https://api.dexscreener.com/latest/dex/tokens”;

const RPC_URL    = “https://mainnet.helius-rpc.com/?api-key=91b12828-68ae-42f0-a425-c7874c31d61d”;
const connection = new solanaWeb3.Connection(RPC_URL, “confirmed”);

// ─── SETTINGS ────────────────────────────────────────────────
let globalSlippageBps = parseFloat(localStorage.getItem(“globalSlippageBps”) || “150”);
let aggressiveEnabled = false;
let mevProtection     = localStorage.getItem(“mevProtection”) !== “false”;

// ─── ALL 6 AGENTS ────────────────────────────────────────────
let AGENTS_CONFIG = {
“The Mastermind”:    { active:true, intervalMs:3600000, amountSol:parseFloat(localStorage.getItem(“masterAmount”)  ||“0.05”),  slippageBps:null, strategy:“highVolume”, minLiqUsd:50000 },
“Sniper X”:          { active:true, intervalMs:120000,  amountSol:parseFloat(localStorage.getItem(“sniperAmount”)  ||“0.02”),  slippageBps:300,  strategy:“newest”,     minLiqUsd:3000  },
“DCA Steady”:        { active:true, intervalMs:1800000, amountSol:parseFloat(localStorage.getItem(“dcaAmount”)     ||“0.01”),  slippageBps:null, strategy:“highVolume”, minLiqUsd:10000 },
“Momentum Wave”:     { active:true, intervalMs:600000,  amountSol:parseFloat(localStorage.getItem(“momentumAmount”)||“0.015”), slippageBps:null, strategy:“momentum”,   minLiqUsd:5000  },
“Bundle Filter Pro”: { active:true, intervalMs:900000,  amountSol:parseFloat(localStorage.getItem(“bundleAmount”)  ||“0.01”),  slippageBps:null, strategy:“safeOnly”,   minLiqUsd:25000 },
“Night Owl”:         { active:true, intervalMs:900000,  amountSol:parseFloat(localStorage.getItem(“owlAmount”)     ||“0.005”), slippageBps:null, strategy:“highVolume”, minLiqUsd:5000  }
};

let tradeHistory = JSON.parse(localStorage.getItem(“saturnTrades”) || “[]”);
let liveFeedLog  = [];

// ─── HELPERS ─────────────────────────────────────────────────
function isDev() { return sessionStorage.getItem(DEV_SESSION_KEY) === “true”; }

// Browser-safe base64 → Uint8Array (never Buffer.from)
function base64ToUint8Array(b64) {
const bin = atob(b64), bytes = new Uint8Array(bin.length);
for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
return bytes;
}

function saveAmount(agentName, value) {
const keys = { “The Mastermind”:“masterAmount”,“Sniper X”:“sniperAmount”,“DCA Steady”:“dcaAmount”,“Momentum Wave”:“momentumAmount”,“Bundle Filter Pro”:“bundleAmount”,“Night Owl”:“owlAmount” };
const v = Math.max(0.001, Math.min(10, parseFloat(value)||0.01));
if (keys[agentName]) localStorage.setItem(keys[agentName], v);
if (AGENTS_CONFIG[agentName]) AGENTS_CONFIG[agentName].amountSol = v;
addToLiveFeed(`⚙️ ${agentName} → ${v} SOL/trade`);
}

function saveSlippage(value) {
globalSlippageBps = Math.max(50, Math.min(1000, parseFloat(value)||150));
localStorage.setItem(“globalSlippageBps”, globalSlippageBps);
const lbl = document.getElementById(“slippageVal”);
if (lbl) lbl.textContent = (globalSlippageBps/100).toFixed(1)+”%”;
addToLiveFeed(`⚙️ Slippage → ${(globalSlippageBps/100).toFixed(1)}%`);
}

function saveMevProtection(enabled) {
mevProtection = enabled;
localStorage.setItem(“mevProtection”, String(enabled));
addToLiveFeed(enabled ? “🛡️ MEV Protection ON” : “🛡️ MEV Protection OFF”);
}

// ─── LIVE $SATURN PRICE ───────────────────────────────────────
const SATURN_MINT_PLACEHOLDER = “PASTE_SATURN_MINT_HERE”;
async function updateSaturnTicker() {
if (SATURN_MINT_PLACEHOLDER === “PASTE_SATURN_MINT_HERE”) return;
try {
const res  = await fetch(`${JUPITER_PRICE_API}?ids=${SATURN_MINT_PLACEHOLDER}`, { signal:AbortSignal.timeout(5000) });
const data = await res.json();
const price = data.data?.[SATURN_MINT_PLACEHOLDER]?.price;
if (price) {
const el = document.querySelector(”.tprice”);
if (el) el.textContent = “$” + parseFloat(price).toFixed(6);
}
} catch(e) {}
}

// ─── DEXSCREENER FEED ────────────────────────────────────────
async function scanNewPairsFromDexScreener() {
try {
const res = await fetch(DEX_NEW_PAIRS_API, { signal:AbortSignal.timeout(8000) });
if (!res.ok) throw new Error(`HTTP ${res.status}`);
const items = await res.json();
const sol = items.filter(t => t.chainId===“solana” && t.tokenAddress).slice(0,25);
if (!sol.length) return getFallbackCoins();
const pr = await fetch(`${DEX_PAIR_INFO_API}/${sol.map(t=>t.tokenAddress).join(",")}`, { signal:AbortSignal.timeout(8000) });
if (!pr.ok) return getFallbackCoins();
const pd = await pr.json();
const pairs = (pd.pairs||[]).filter(p => p.chainId===“solana” && parseFloat(p.liquidity?.usd||0)>1000);
if (!pairs.length) return getFallbackCoins();
return pairs.map(p => ({
address:p.baseToken.address, symbol:p.baseToken.symbol, name:p.baseToken.name,
priceUsd:parseFloat(p.priceUsd||0), liquidityUsd:parseFloat(p.liquidity?.usd||0),
volume24h:parseFloat(p.volume?.h24||0), priceChange24h:parseFloat(p.priceChange?.h24||0),
pairAddress:p.pairAddress, dexId:p.dexId, createdAt:p.pairCreatedAt||0
}));
} catch(e) { console.warn(”[Saturn] DexScreener:”, e.message); return getFallbackCoins(); }
}

function selectCoin(coins, strategy, minLiqUsd) {
const el = coins.filter(c => c.liquidityUsd >= minLiqUsd);
if (!el.length) return coins[0]||null;
switch(strategy) {
case “newest”:   return el.sort((a,b)=>(b.createdAt||0)-(a.createdAt||0))[0];
case “momentum”: return (el.filter(c=>c.priceChange24h>0).sort((a,b)=>b.priceChange24h-a.priceChange24h)[0])||el[0];
case “safeOnly”: return (el.filter(c=>c.volume24h>5000).sort((a,b)=>b.liquidityUsd-a.liquidityUsd)[0])||el[0];
default:         return el.sort((a,b)=>b.volume24h-a.volume24h)[0];
}
}

function getFallbackCoins() {
addToLiveFeed(“⚠️ DexScreener unavailable — using fallback”);
return [
{ address:“DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263”, symbol:“BONK”, liquidityUsd:1000000, volume24h:500000, priceChange24h:0, createdAt:0 },
{ address:“JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN”,  symbol:“JUP”,  liquidityUsd:5000000, volume24h:1000000,priceChange24h:0, createdAt:0 }
];
}

// ─── JUPITER ─────────────────────────────────────────────────
async function getJupiterPrice(mint) {
try {
const r = await fetch(`${JUPITER_PRICE_API}?ids=${mint}`,{signal:AbortSignal.timeout(5000)});
if(!r.ok) throw new Error(`HTTP ${r.status}`);
const d = await r.json();
return parseFloat(d.data?.[mint]?.price||0);
} catch(e) { return 0; }
}

async function getJupiterQuote(outputMint, amountLamports, agentSlipBps=null) {
let slip = agentSlipBps ?? globalSlippageBps;
if (aggressiveEnabled) slip = Math.max(slip, 500);
try {
const p = new URLSearchParams({inputMint:SOL_MINT,outputMint,amount:amountLamports,slippageBps:slip});
const r = await fetch(`${JUPITER_QUOTE_API}?${p}`,{signal:AbortSignal.timeout(8000)});
if(!r.ok){ const e=await r.json().catch(()=>({})); throw new Error(e.error||`HTTP ${r.status}`); }
return await r.json();
} catch(e) { console.warn(”[Saturn] Quote:”,e.message); return null; }
}

async function executeJupiterSwap(quote, wallet) {
try {
const fee = mevProtection ? (aggressiveEnabled?25000:10000) : “auto”;
const r = await fetch(JUPITER_SWAP_API,{
method:“POST”, headers:{“Content-Type”:“application/json”},
body:JSON.stringify({ quoteResponse:quote, userPublicKey:wallet.publicKey.toString(), wrapAndUnwrapSol:true, dynamicComputeUnitLimit:true, prioritizationFeeLamports:fee }),
signal:AbortSignal.timeout(15000)
});
if(!r.ok) throw new Error(`Swap HTTP ${r.status}`);
const {transaction} = await r.json();
if(!transaction) throw new Error(“No transaction returned”);
const tx = solanaWeb3.VersionedTransaction.deserialize(base64ToUint8Array(transaction));
const signed = await wallet.signTransaction(tx);
return await connection.sendRawTransaction(signed.serialize(),{skipPreflight:true,maxRetries:3});
} catch(e) { console.error(”[Saturn] Swap:”,e.message); return null; }
}

// ─── TRADE LOGIC ─────────────────────────────────────────────
async function doTrade(agentName, wallet) {
const cfg = AGENTS_CONFIG[agentName];
if (!cfg?.active) return;
addToLiveFeed(`🤖 <strong>${agentName}</strong> scanning...`);
const coins = await scanNewPairsFromDexScreener();
const coin  = selectCoin(coins, cfg.strategy, cfg.minLiqUsd);
if (!coin) { addToLiveFeed(`❌ ${agentName}: no valid coin`); return; }
const lamps = Math.floor(cfg.amountSol * LAMPORTS);
const price = await getJupiterPrice(coin.address);
const disp  = price||coin.priceUsd||0;
addToLiveFeed(`📡 <strong>${coin.symbol}</strong> $${disp>0?disp.toFixed(8):"—"} | 💧$${(coin.liquidityUsd/1000).toFixed(0)}k`);
const quote = await getJupiterQuote(coin.address, lamps, cfg.slippageBps);
if (!quote) { addToLiveFeed(`❌ ${agentName}: quote failed`); return; }
const out = (parseInt(quote.outAmount)/Math.pow(10,quote.outputDecimals??9)).toFixed(4);
addToLiveFeed(`💱 ${agentName} → ${out} ${coin.symbol} for ${cfg.amountSol} SOL`);
const txid = await executeJupiterSwap(quote, wallet);
if (txid) {
tradeHistory.unshift({agent:agentName,symbol:coin.symbol,mint:coin.address,entryPriceUsd:disp,amountSol:cfg.amountSol,txid,ts:Date.now(),pnlPct:null});
if(tradeHistory.length>100) tradeHistory.pop();
localStorage.setItem(“saturnTrades”,JSON.stringify(tradeHistory));
addToLiveFeed(`🎉 <strong>${agentName}</strong> done! <a href="https://solscan.io/tx/${txid}" target="_blank" style="color:#c9a84c">${txid.slice(0,8)}…</a>`);
updateAgentCard(agentName);
console.log(`🚀 ${agentName} → ${coin.symbol} | https://solscan.io/tx/${txid}`);
} else { addToLiveFeed(`❌ ${agentName}: TX failed`); }
}

async function updatePnL() {
const open = tradeHistory.filter(t=>t.pnlPct===null&&t.mint);
if(!open.length) return;
const mints = […new Set(open.map(t=>t.mint))].join(”,”);
try {
const r = await fetch(`${JUPITER_PRICE_API}?ids=${mints}`,{signal:AbortSignal.timeout(6000)});
const d = await r.json();
let changed=false;
tradeHistory.forEach(t=>{
if(t.mint&&d.data?.[t.mint]&&t.pnlPct===null){
const cur=parseFloat(d.data[t.mint].price);
if(t.entryPriceUsd>0&&cur>0){t.pnlPct=(((cur-t.entryPriceUsd)/t.entryPriceUsd)*100).toFixed(2);changed=true;}
}
});
if(changed){localStorage.setItem(“saturnTrades”,JSON.stringify(tradeHistory));refreshMyAgentStats();}
} catch(e) {}
}

function updateAgentCard(agentName) {
const trades = tradeHistory.filter(t=>t.agent===agentName);
const withPnl = trades.filter(t=>t.pnlPct!==null);
const avg = withPnl.length ? (withPnl.reduce((s,t)=>s+parseFloat(t.pnlPct),0)/withPnl.length).toFixed(2) : null;
document.querySelectorAll(”[data-agent]”).forEach(card=>{
if(card.dataset.agent!==agentName) return;
const pnlEl    = card.querySelector(”[data-pnl]”);
const tradesEl = card.querySelector(”[data-trades]”);
if(pnlEl&&avg!==null){
pnlEl.textContent = `${parseFloat(avg)>=0?"+":""}${avg}%`;
pnlEl.style.color = parseFloat(avg)>=0?“var(–green)”:“var(–red)”;
}
if(tradesEl) tradesEl.textContent = trades.length;
});
}

function refreshMyAgentStats() {
Object.keys(AGENTS_CONFIG).forEach(updateAgentCard);
}

// ─── LIVE FEED DISPLAY ────────────────────────────────────────
async function refreshDexScreenerFeedDisplay() {
const coins = await scanNewPairsFromDexScreener();
coins.slice(0,8).forEach(c=>{
const chg=c.priceChange24h, arrow=chg>5?“🚀”:chg>0?“🟢”:chg<-5?“💀”:chg<0?“🔴”:“⚪”;
const chgStr=chg?` ${chg>0?"+":""}${chg.toFixed(1)}%`:””;
const liqStr=c.liquidityUsd?` 💧$${(c.liquidityUsd/1000).toFixed(0)}k`:””;
addToLiveFeed(`${arrow} <strong>${c.symbol}</strong> $${c.priceUsd?.toFixed(8)||"—"}${chgStr}${liqStr}`,false);
});
}

function addToLiveFeed(html, prepend=true) {
const ts = new Date().toLocaleTimeString(“en-US”,{hour:“2-digit”,minute:“2-digit”});
const entry = {html,ts};
prepend ? liveFeedLog.unshift(entry) : liveFeedLog.push(entry);
if(liveFeedLog.length>25) liveFeedLog.pop();
const box = document.getElementById(“liveFeedBox”);
if(box){
box.innerHTML = liveFeedLog.map(l=>`<div style="display:flex;justify-content:space-between;gap:8px;padding:5px 0;border-bottom:1px solid #1a2236;font-size:11.5px;line-height:1.5"><span>${l.html}</span><span style="color:#2a3a52;flex-shrink:0;font-family:'Space Mono',monospace">${l.ts}</span></div>`).join(””);
box.scrollTop=0;
}
}

// ─── MAIN ENGINE ─────────────────────────────────────────────
async function runAgentEngine() {
const wallet = window.solana||window.phantom?.solana;
if(!wallet?.isConnected){ addToLiveFeed(“🔌 Wallet not connected — bots paused”); return; }
await refreshDexScreenerFeedDisplay();
await updatePnL();
const active = Object.entries(AGENTS_CONFIG).filter(([,c])=>c.active);
for(const [name] of active){ await doTrade(name,wallet); await new Promise(r=>setTimeout(r,2500)); }
}

// ─── BOOT ────────────────────────────────────────────────────
if(window.location.pathname.includes(“agents”)){
console.log(“✅ SATURN v1.5 | 6 bots | Jupiter lite-api | DexScreener | Helius | MEV shield”);
window.addEventListener(“load”,()=>{
// Slippage slider (id=“slippageSlider”, label id=“slippageVal”)
const slider = document.getElementById(“slippageSlider”);
if(slider){
slider.value = globalSlippageBps;
const lbl = document.getElementById(“slippageVal”);
if(lbl) lbl.textContent = (globalSlippageBps/100).toFixed(1)+”%”;
slider.addEventListener(“input”,e=>saveSlippage(e.target.value));
}
// MEV toggle
const mevT = document.getElementById(“mevToggle”);
if(mevT){ mevT.checked=mevProtection; mevT.addEventListener(“change”,e=>saveMevProtection(e.target.checked)); }
// Aggressive toggle
const aggT = document.getElementById(“aggressiveToggle”);
if(aggT){
aggT.addEventListener(“change”,e=>{
aggressiveEnabled=e.target.checked;
if(aggressiveEnabled&&!confirm(“⚠️ AGGRESSIVE MODE\n\nMin 5% slippage + max MEV fees.\nHigher risk / higher reward.\n\nContinue?”)){
aggT.checked=false; aggressiveEnabled=false;
}
addToLiveFeed(aggressiveEnabled?“⚡ AGGRESSIVE MODE ON — high risk/reward”:“⚡ Aggressive mode OFF”);
});
}
// Initial feed + ticker
refreshDexScreenerFeedDisplay();
updateSaturnTicker();
// Engines
setInterval(runAgentEngine, 30000);
setInterval(updatePnL, 120000);
setInterval(updateSaturnTicker, 60000);
});
}
