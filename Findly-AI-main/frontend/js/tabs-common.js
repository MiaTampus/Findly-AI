// Shared helpers for claims, notifications and profile pages.
//
// IMPORTANT: this file reuses the Supabase client from your existing
// js/supabase.js. It supports these export styles:
//     export const supabase = createClient(...)     (most common)
//     export default createClient(...)
//     export const client = createClient(...)
// If yours is different, change the one line marked  <-- ADJUST

import * as sbModule from "./supabase.js";

export const supabase =
  sbModule.supabase || sbModule.default || sbModule.client; // <-- ADJUST

if (!supabase) {
  throw new Error(
    "tabs-common.js: could not find the Supabase client exported by js/supabase.js"
  );
}

/* ---------- small utilities ---------- */

export function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c]));
}

export function fmtDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function timeAgo(iso) {
  const secs = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return "just now";
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} h ago`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `${days} d ago`;
  return fmtDate(iso);
}

let toastTimer;
export function toast(message, isError = false) {
  document.querySelector(".toast")?.remove();
  const el = document.createElement("div");
  el.className = "toast" + (isError ? " error" : "");
  el.setAttribute("role", isError ? "alert" : "status");
  el.textContent = message;
  document.body.appendChild(el);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.remove(), 3500);
}

/* ---------- auth ---------- */

// Redirects to login.html when signed out. Returns { user, profile } or null.
export async function requireAuth() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    window.location.href = "login.html";
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", session.user.id)
    .maybeSingle();

  return {
    user: session.user,
    profile: profile || {
      id: session.user.id,
      full_name: session.user.email,
      email: session.user.email,
      role: "student",
    },
  };
}

export async function logout() {
  await supabase.auth.signOut();
  window.location.href = "login.html";
}

/* ---------- navigation bar ---------- */

const LINKS = [
  ["dashboard.html", "Dashboard"],
  ["report-lost.html", "Report lost"],
  ["report-found.html", "Report found"],
  ["matches.html", "Matches"],
  ["claims.html", "Claims"],
  ["notifications.html", "Notifications"],
  ["profile.html", "Profile"],
];

export async function refreshBadge(userId) {
  const badge = document.getElementById("notif-badge");
  if (!badge) return;
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_read", false);
  const n = count || 0;
  badge.textContent = n > 99 ? "99+" : String(n);
  badge.hidden = n === 0;
}

// Fills <div id="app-nav"></div> and keeps the unread badge live.
export function renderShell(activePage, ctx) {
  const host = document.getElementById("app-nav");
  if (!host) return;

  const items = LINKS.map(([href, label]) => {
    const active = href === activePage ? " active" : "";
    const badge =
      href === "notifications.html"
        ? '<span id="notif-badge" class="badge" hidden aria-label="unread notifications"></span>'
        : "";
    const current = href === activePage ? ' aria-current="page"' : "";
    return `<a class="${active.trim()}" href="${href}"${current}>${label}${badge}</a>`;
  }).join("");

  host.innerHTML = `
    <header class="topbar">
      <div class="topbar-inner">
        <a class="brand" href="dashboard.html">Findly</a>
        <nav class="nav" aria-label="Main">${items}</nav>
        <button class="btn small" id="logout-btn" type="button">Log out</button>
      </div>
    </header>`;

  document.getElementById("logout-btn").addEventListener("click", logout);

  refreshBadge(ctx.user.id);
  supabase
    .channel("badge-" + ctx.user.id)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${ctx.user.id}`,
      },
      () => refreshBadge(ctx.user.id)
    )
    .subscribe();
}
