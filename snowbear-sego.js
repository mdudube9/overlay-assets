const container = document.getElementById("main-container");

// timings (ms)
const NORMAL_ACTIVE_DURATION = 2500;  // if messages are coming in
const NORMAL_IDLE_DURATION   = 9000;  // if chat is quiet
const ALERT_DURATION         = 6000;
const FADE_MS         = 220;  // must match your CSS opacity transition time

let lastChatAt = 0;

// one persistent card
const card = document.createElement("div");
card.className = "message normal";
card.innerHTML = `
  <div class="username"></div>

  <div class="message-center">
    <div class="text"></div>
  </div>

  <div class="amount"></div>
`;
container.appendChild(card);

const elUser = card.querySelector(".username");
const elText = card.querySelector(".text");
const elAmt  = card.querySelector(".amount");

// state
let hideTimer = null;
let clearTimer = null;
let updateId = 0;

let alertLockUntil = 0;
let isIdle = true;

window.addEventListener("onEventReceived", (obj) => {
  const listener = obj?.detail?.listener;
  const evt = obj?.detail?.event;

  // CHAT
  if (evt?.data?.displayName && typeof evt.data.text === "string") {
    if (Date.now() < alertLockUntil) return;

    const now = Date.now();
    const quiet = (now - lastChatAt) > 4000; // 4s gap = "idle"
    lastChatAt = now;

    showPayload({
      type: "normal",
      username: evt.data.displayName,
      text: evt.data.text,
      color: evt.data.displayColor || "#ffffff",
      amount: ""
    }, quiet ? NORMAL_IDLE_DURATION : NORMAL_ACTIVE_DURATION);

    return;
  }

  // ALERTS OVERRIDE
  if (listener === "tip-latest" && evt?.name) {
    alertLockUntil = Date.now() + ALERT_DURATION;

    showPayload({
      type: "gift",
      username: evt.name,
      text: evt.message || "sent a tip!",
      color: "#ffffff",
      amount: evt.amount != null ? "£" + evt.amount : ""
    }, ALERT_DURATION);

    return;
  }

  if (listener === "subscriber-latest" && evt?.name) {
    alertLockUntil = Date.now() + ALERT_DURATION;

    showPayload({
      type: "gift",
      username: evt.name,
      text: "Just subscribed!",
      color: "#ffffff",
      amount: ""
    }, ALERT_DURATION);

    return;
  }

  if (listener === "cheer-latest" && evt?.name) {
    alertLockUntil = Date.now() + ALERT_DURATION;

    showPayload({
      type: "gift",
      username: evt.name,
      text: "cheered!",
      color: "#ffffff",
      amount: evt.amount != null ? String(evt.amount) + " bits" : ""
    }, ALERT_DURATION);

    return;
  }
});

function showPayload(payload, durationMs) {
  updateId += 1;
  const myId = updateId;

  // cancel pending expiry
  if (hideTimer) clearTimeout(hideTimer);
  if (clearTimer) clearTimeout(clearTimer);

  const visible = card.classList.contains("is-visible");

  if (isIdle || !visible) {
    // idle -> re-enter with slide animation
    isIdle = false;

    applyPayload(payload);

    // retrigger enter animation each time we come from idle
    card.classList.remove("enter");
    void card.offsetHeight;
    card.classList.add("enter");

    // show
    card.classList.add("is-visible");
  } else {
    // active -> fade out first, then swap, then fade in (NO slide)
    card.classList.remove("is-visible");

    setTimeout(() => {
      if (myId !== updateId) return;

      applyPayload(payload);
      card.classList.add("is-visible");
    }, FADE_MS);
  }

  // expire when quiet
  hideTimer = setTimeout(() => {
    if (myId !== updateId) return;

    card.classList.remove("is-visible");

    clearTimer = setTimeout(() => {
      if (myId !== updateId) return;

      elUser.textContent = "";
      elText.textContent = "";
      elAmt.textContent = "";
      elAmt.style.display = "none";

      isIdle = true;
    }, FADE_MS + 20);
  }, durationMs);
}

function applyPayload(payload) {
  // background switch
  card.classList.remove("normal", "gift");
  card.classList.add(payload.type);

  // content
  elUser.textContent = payload.username;
  elUser.style.color = payload.color || "#ffffff";

  elText.textContent = payload.text;

  if (payload.amount) {
    elAmt.textContent = payload.amount;
    elAmt.style.display = "block";
  } else {
    elAmt.textContent = "";
    elAmt.style.display = "none";
  }
}
