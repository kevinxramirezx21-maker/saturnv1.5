// ============================================================
// SATURN v1.5 — FINAL + SLIPPAGE + MEV PROTECTION
// Smart slippage slider + Aggressive auto-bump + MEV Shield
// ============================================================

const DEV_CODE = "boss2026";
const DEV_SESSION_KEY = "saturn_dev_mode";

let logoTapCount = 0;
let logoTapTimer = null;

// HELIUS RPC (your key)
const RPC_URL = "https://mainnet.helius-rpc.com/?api-key=91b12828-68ae-42f0-a425-c7874c31d61d";
const connection = new solanaWeb3.Connection(RPC_URL, "confirmed");

const SOL_MINT = "So11111111111111111111111111111111111111112";
const LAMPORTS = 1_000_000_000;

// JUPITER APIs
const JUPITER_PRICE_API = "https://lite-api.jup.ag/price/v2";
const JUPITER_QUOTE_API = "https://lite-api.jup.ag/swap/v1/quote";
const JUPITER_SWAP_API = "https://lite-api.jup.ag/swap/v1/swap";

// DEXSCREENER
const DEX_NEW_PAIRS_API = "https://api.dexscreener.com/token-profiles/latest/v1";
const DEX_PAIR_INFO_API = "https://api.dexscreener.com/latest/dex/tokens";

// SETTINGS (saved automatically)
let globalSlippageBps = parseFloat(localStorage.getItem("globalSlippageBps") || "150");
let aggressiveEnabled = false;
let mevProtection = localStorage.getItem("mevProtection") !== "false";

let AGENTS_CONFIG = {
  "DCA Steady": { active: true, intervalMs: 1800000, amountSol: parseFloat(localStorage.getItem("dcaAmount") || "0.01") },
  "Night Owl":   { active: true, intervalMs: 900000,  amountSol: parseFloat(localStorage.getItem("owlAmount") || "0.005") }
};

let liveFeedLog = [];

// Browser-safe base64
function base64ToUint8Array(base64) {
  const binaryStr = atob(base64);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
  return bytes;
}

// Save settings
function saveSlippage(value) {
  globalSlippageBps = Math.max(50, Math.min(1000, parseFloat(value)));
  localStorage.setItem("globalSlippageBps", globalSlippageBps);
  addToLiveFeed(`⚙️ Global slippage set to ${(globalSlippageBps/100).toFixed(1)}%`);
}

function saveMevProtection(enabled) {
  mevProtection = enabled;
  localStorage.setItem("mevProtection", enabled);
  addToLiveFeed(mevProtection ? "🛡️ MEV Protection ON (higher priority fees)" : "🛡️ MEV Protection OFF");
}

// DexScreener + Jupiter functions (same as before, just cleaner)
async function scanNewPairsFromDexScreener() { /* ... same as Claude's working version ... */ }
async function getJupiterPrice(mintAddress) { /* ... same ... */ }
async function getJupiterQuote(outputMint, amountLamports) {
  const slippage = aggressiveEnabled ? Math.max(globalSlippageBps, 500) : globalSlippageBps;
  const params = new URLSearchParams({ inputMint: SOL_MINT, outputMint, amount: amountLamports, slippageBps: slippage });
  try {
    const res = await fetch(`${JUPITER_QUOTE_API}?${params}`, { signal: AbortSignal.timeout(8000) });
    return await res.json();
  } catch (e) { return null; }
}

async function executeJupiterSwap(quote, wallet) {
  try {
    const res = await fetch(JUPITER_SWAP_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        quoteResponse: quote,
        userPublicKey: wallet.publicKey.toString(),
        wrapAndUnwrapSol: true,
        dynamicComputeUnitLimit: true,
        prioritizationFeeLamports: mevProtection ? 10000 : "auto"   // ← MEV protection fee boost
      })
    });
    const { transaction } = await res.json();
    const tx = solanaWeb3.VersionedTransaction.deserialize(base64ToUint8Array(transaction));
    const signedTx = await wallet.signTransaction(tx);
    return await connection.sendRawTransaction(signedTx.serialize(), { skipPreflight: true, maxRetries: 3 });
  } catch (e) {
    console.error(e);
    return null;
  }
}

// Live feed + trade logic (same as before with new settings)
async function doTrade(agentName, wallet) { /* ... uses globalSlippageBps and MEV ... */ }
function addToLiveFeed(html) { /* same */ }

// Boot + UI listeners
if (window.location.pathname.includes("agents")) {
  window.addEventListener("load", () => {
    initDevMode();

    // Slippage slider listener
    const slider = document.getElementById("slippageSlider");
    if (slider) {
      slider.value = globalSlippageBps;
      slider.addEventListener("input", (e) => saveSlippage(e.target.value));
    }

    // MEV toggle
    const mevToggle = document.getElementById("mevToggle");
    if (mevToggle) {
      mevToggle.checked = mevProtection;
      mevToggle.addEventListener("change", (e) => saveMevProtection(e.target.checked));
    }

    // Aggressive toggle (already there)
    const aggToggle = document.getElementById("aggressiveToggle");
    if (aggToggle) {
      aggToggle.addEventListener("change", (e) => {
        aggressiveEnabled = e.target.checked;
        if (aggressiveEnabled) alert("⚠️ AGGRESSIVE MODE\nBigger trades + higher slippage + MEV boost\nHigher risk/reward!");
      });
    }

    setInterval(runAgentEngine, 30000);
    refreshDexScreenerFeedDisplay();
  });
}
