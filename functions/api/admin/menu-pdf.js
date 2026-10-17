// GET  /api/admin/menu-pdf: is the export button set up, and how did the last export run go?
// POST /api/admin/menu-pdf: start a new export now.
//
// The export itself runs on GitHub Actions (.github/workflows/menu-pdf.yml): it prints the live
// menu to public/menu/menu.pdf and commits it, and Cloudflare redeploys the site with the new file.
// Starting it from here needs a GitHub token saved as the GITHUB_TOKEN secret (fine-grained,
// only this repository, "Actions: read and write"). GITHUB_REPO and GITHUB_BRANCH are optional.
import { fail, json } from "../../../lib/server.js";

const WORKFLOW = "menu-pdf.yml";

function setup(env) {
  const repo = String(env.GITHUB_REPO || "HadiDeeb97/crepe-beirut").trim();
  const token = String(env.GITHUB_TOKEN || env.github_token || "").trim();
  return { repo, token, branch: String(env.GITHUB_BRANCH || "main").trim(), actionsUrl: `https://github.com/${repo}/actions/workflows/${WORKFLOW}` };
}

function github(s, path, init = {}) {
  return fetch(`https://api.github.com/repos/${s.repo}/actions/workflows/${WORKFLOW}${path}`, {
    ...init,
    headers: {
      authorization: "Bearer " + s.token,
      accept: "application/vnd.github+json",
      "x-github-api-version": "2022-11-28",
      "user-agent": "crepe-beirut-admin",
      ...(init.body ? { "content-type": "application/json" } : {})
    }
  });
}

export async function onRequestGet({ env }) {
  const s = setup(env);
  if (!s.token) return json({ configured: false, actionsUrl: s.actionsUrl });
  let lastRun = null;
  try {
    const r = await github(s, "/runs?per_page=1");
    if (r.ok) {
      const run = ((await r.json()).workflow_runs || [])[0];
      if (run) lastRun = { status: run.status, conclusion: run.conclusion, startedAt: run.run_started_at || run.created_at, url: run.html_url };
    } else if (r.status === 401 || r.status === 403 || r.status === 404) {
      return json({ configured: true, problem: "GitHub did not accept the token. Check that it can read and run Actions on " + s.repo + ".", actionsUrl: s.actionsUrl });
    }
  } catch { /* GitHub unreachable: still show the button */ }
  return json({ configured: true, lastRun, actionsUrl: s.actionsUrl });
}

export async function onRequestPost({ env }) {
  const s = setup(env);
  if (!s.token) return fail(501, "The export button is not set up yet.", { code: "no-token", actionsUrl: s.actionsUrl });
  let r;
  try {
    r = await github(s, "/dispatches", { method: "POST", body: JSON.stringify({ ref: s.branch, inputs: { force: "true" } }) });
  } catch {
    return fail(502, "Could not reach GitHub. Please try again.");
  }
  if (r.status === 204 || r.ok) return json({ started: true, actionsUrl: s.actionsUrl });
  if (r.status === 401 || r.status === 403) return fail(502, "GitHub did not accept the token. Check that it can read and run Actions on " + s.repo + ".", { actionsUrl: s.actionsUrl });
  if (r.status === 404) return fail(502, "GitHub could not find the export workflow in " + s.repo + ". Check GITHUB_REPO and that the token covers this repository.", { actionsUrl: s.actionsUrl });
  return fail(502, "GitHub said no (" + r.status + "). Please try again.", { actionsUrl: s.actionsUrl });
}
