// FoxPlug update writer: a GitHub Action with no dependencies (Node 24, built-in fetch).
//
// 1. Checks the current repository is public (the free path reads public repos only).
// 2. Asks FoxPlug's public try endpoint (the same one the foxplug.com box uses, with the
//    same limits) to write an update from the repo's recent releases and commits.
// 3. Writes that update to ONE place the workflow chose:
//    - mode "release": a DRAFT release in this repo (never published by this action), or
//    - mode "issue":   a comment on the issue number the workflow names.
// Nothing is posted anywhere else.

"use strict";
const fs = require("fs");

const TRY_URL = "https://fybedvapqhhgctkeqvbs.supabase.co/functions/v1/lcnc-repo-firstrun";
const USER_AGENT = "foxplug-action/1.0 (+https://github.com/OsakaSaul/foxplug-action)";
const SITE = "https://foxplug.com/?utm_source=gh_action";
const GH_API = process.env.GITHUB_API_URL || "https://api.github.com";

function input(name) {
  return String(process.env["INPUT_" + name.toUpperCase()] || "").trim();
}
function setOutput(name, value) {
  const file = process.env.GITHUB_OUTPUT;
  if (!file) return;
  const delim = "FOXPLUG_" + Math.random().toString(36).slice(2);
  fs.appendFileSync(file, `${name}<<${delim}\n${value}\n${delim}\n`);
}
function summary(md) {
  const file = process.env.GITHUB_STEP_SUMMARY;
  if (file) fs.appendFileSync(file, md + "\n");
}
function fail(msg) {
  console.log(`::error::${msg}`);
  process.exitCode = 1;
}
function mask(v) { if (v) console.log(`::add-mask::${v}`); }
// No one gets pinged by an update: "@name" is shown, not linked.
function noMentions(s) { return String(s || "").replace(/@(?=[A-Za-z0-9_-])/g, "@​"); }

async function gh(path, token, init = {}) {
  const r = await fetch(GH_API + path, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": USER_AGENT,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(init.headers || {}),
    },
  });
  const j = await r.json().catch(() => null);
  return { status: r.status, ok: r.ok, json: j };
}

function renderMarkdown(p) {
  const u = p.update || {};
  const d = p.drafts || {};
  const lines = [];
  lines.push(`## ${noMentions(u.title)}`, "", noMentions(u.body), "");
  const drafts = [["Post for X", d.x], ["Post for LinkedIn", d.linkedin], ["Short post", d.short]].filter(([, t]) => String(t || "").trim());
  if (drafts.length) {
    lines.push("<details><summary>Draft posts</summary>", "");
    for (const [label, text] of drafts) lines.push(`**${label}**`, "", noMentions(String(text).trim()), "");
    lines.push("</details>", "");
  }
  lines.push("---", `Written by [FoxPlug](${SITE}) from this repository's public releases and commits. Review and edit it before you share it.`);
  return lines.join("\n");
}

async function main() {
  const mode = (input("mode") || "release").toLowerCase();
  const issueRaw = input("issue-number");
  const token = input("github-token");
  const apiKey = input("foxplug-api-key");
  mask(apiKey);
  const repo = process.env.GITHUB_REPOSITORY || "";

  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo)) return fail("GITHUB_REPOSITORY is not set; run this action inside a GitHub workflow.");
  if (mode !== "release" && mode !== "issue") return fail(`mode must be "release" or "issue" (got "${mode}").`);
  let issueNumber = 0;
  if (mode === "issue") {
    if (!/^[1-9][0-9]{0,9}$/.test(issueRaw)) return fail('mode "issue" needs issue-number: the number of the issue to comment on.');
    issueNumber = Number(issueRaw);
  }
  if (!token) return fail("github-token is empty. Leave it unset to use the workflow's own token.");

  // 1. Public repos only.
  const info = await gh(`/repos/${repo}`, token);
  if (!info.ok) return fail(`Could not read ${repo} (HTTP ${info.status}). Check the workflow's permissions.`);
  if (info.json && (info.json.private || info.json.visibility === "private" || info.json.visibility === "internal")) {
    return fail(`${repo} is not public. The free FoxPlug path reads public repositories only and never sends private code anywhere. For a private repo, connect it in your FoxPlug account: ${SITE}`);
  }

  // 2. Ask FoxPlug for the update.
  console.log(`Asking FoxPlug to write an update for github.com/${repo} ...`);
  const headers = { "Content-Type": "application/json", "User-Agent": USER_AGENT };
  if (apiKey) headers["X-FoxPlug-Api-Key"] = apiKey;
  let res, p;
  try {
    res = await fetch(TRY_URL, {
      method: "POST", headers,
      body: JSON.stringify({ action: "try", url: `github.com/${repo}` }),
      signal: AbortSignal.timeout(120_000),
    });
    p = await res.json().catch(() => null);
  } catch (e) {
    return fail(`FoxPlug could not be reached: ${e.message}`);
  }
  if (!p || !p.ok) {
    const reason = (p && p.reason) || `http_${res.status}`;
    const msg = (p && p.message) || "FoxPlug did not return an update.";
    if (reason === "empty") {
      console.log(`::notice::${msg}`);
      summary(`### FoxPlug\n\nNothing to write this time: ${msg}`);
      setOutput("written", "false");
      return;
    }
    return fail(`FoxPlug: ${msg} (${reason})`);
  }
  const u = p.update || {};
  if (!u.title || !u.body) return fail("FoxPlug returned no update text.");
  const md = renderMarkdown(p);
  setOutput("title", u.title);
  setOutput("body", u.body);

  // 3. Write it to the one place the workflow chose.
  let url = "";
  if (mode === "release") {
    const tag = input("release-tag") || `foxplug-update-${new Date().toISOString().slice(0, 10)}`;
    const r = await gh(`/repos/${repo}/releases`, token, {
      method: "POST",
      body: JSON.stringify({ tag_name: tag, name: String(u.title).slice(0, 200), body: md, draft: true, prerelease: false }),
    });
    if (!r.ok) return fail(`Could not create the draft release (HTTP ${r.status}: ${(r.json && r.json.message) || "no message"}). The workflow needs "permissions: contents: write".`);
    if (r.json && r.json.draft !== true) return fail("GitHub did not keep the release as a draft; stopping.");
    url = r.json.html_url || "";
    console.log(`Draft release created (not published): ${url}`);
  } else {
    const r = await gh(`/repos/${repo}/issues/${issueNumber}/comments`, token, {
      method: "POST", body: JSON.stringify({ body: md }),
    });
    if (!r.ok) return fail(`Could not comment on issue #${issueNumber} (HTTP ${r.status}: ${(r.json && r.json.message) || "no message"}). The workflow needs "permissions: issues: write".`);
    url = r.json.html_url || "";
    console.log(`Comment added to issue #${issueNumber}: ${url}`);
  }
  setOutput("url", url);
  setOutput("written", "true");

  console.log("\n----- update -----\n" + md + "\n------------------");
  summary(`### FoxPlug update ${mode === "release" ? "(draft release)" : `(comment on #${issueNumber})`}\n\n${url}\n\n${md}`);
}

main().catch((e) => fail(e && e.stack ? e.stack : String(e)));
