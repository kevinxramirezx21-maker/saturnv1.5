// ═══════════════════════════════════════════════════════
// SATURN PROTOCOL — DEV MODE SYSTEM
// Trigger: tap logo 5x rapidly → enter promo code boss2026
// Dev gets: zero protocol fees, free agent access
// Network/priority fees always paid (Solana gas, not us)
// ═══════════════════════════════════════════════════════

const DEV_CODE        = "boss2026";
const DEV_SESSION_KEY = "saturn_dev_mode";
const DEV_WALLET      = "F36PUYop1oCsBQMyP8aHncGppiGd1xyUm8k75PtHAoN3"; // dev deposit address

let logoTapCount = 0;
let logoTapTimer = null;

function initDevMode() {
  // Check if already active this session
  if (sessionStorage.getItem(DEV_SESSION_KEY) === "true") {
    applyDevMode(true);
  }

  // Logo tap counter (5 taps within 3 seconds)
  const logo = document.getElementById("saturnLogo");
  if (logo) {
    logo.addEventListener("click", () => {
      logoTapCount++;
      clearTimeout(logoTapTimer);
      logoTapTimer = setTimeout(() => { logoTapCount = 0; }, 3000);
      if (logoTapCount >= 5) {
        logoTapCount = 0;
        openDevModal();
      }
    });
  }
}

function openDevModal() {
  const m = document.getElementById("devModal");
  if (m) { m.classList.add("open"); document.getElementById("devCodeInput").focus(); }
}

function closeDevModal() {
  const m = document.getElementById("devModal");
  if (m) { m.classList.remove("open"); document.getElementById("devCodeInput").value = ""; document.getElementById("devError").textContent = ""; }
}

function submitDevCode() {
  const val = document.getElementById("devCodeInput").value.trim().toLowerCase();
  if (val === DEV_CODE) {
    sessionStorage.setItem(DEV_SESSION_KEY, "true");
    closeDevModal();
    applyDevMode(true);
  } else {
    document.getElementById("devError").textContent = "Invalid promo code. Try again.";
    document.getElementById("devCodeInput").value = "";
  }
}

function deactivateDev() {
  sessionStorage.removeItem(DEV_SESSION_KEY);
  applyDevMode(false);
}

function applyDevMode(active) {
  const badge = document.getElementById("devBadge");
  if (badge) badge.style.display = active ? "flex" : "none";
  // Re-render if render() exists (lock page)
  if (typeof render === "function") render();
  // Re-render if renderAgentGrid exists (agents page)
  if (typeof renderAgentGrid === "function") renderAgentGrid(
    typeof AGENTS !== "undefined" ? AGENTS : []
  );
}

function isDevMode() {
  return sessionStorage.getItem(DEV_SESSION_KEY) === "true";
}

// Handle Enter key in dev modal
function devKeyDown(e) {
  if (e.key === "Enter") submitDevCode();
}
