#!/usr/bin/env node
// Mirror-freshness sync — walks the configured local repo mirrors, checks git
// state against their GitHub remotes, and upserts one row per repo into
// System Horizon's `horizon_repo_health` table.
//
// Standalone by design: no dependency on Septentrion's sync logic or schema.
// Safe to relocate, rename, or fold into a bigger "AI ops" script later —
// it only needs the config JSON, the four env vars below, and git on PATH.
//
// Run manually:
//   node mirror-freshness-sync.mjs
// Run headless via Claude Code (same pattern as /septentrion-sync):
//   claude -p "/mirror-freshness-sync"
// Schedule via Windows Task Scheduler the same way the Septentrion 07:30
// generator is scheduled — point the action at:
//   claude -p "/mirror-freshness-sync"
//
// Required environment variables (put these in a local .env file next to
// this script, or set them in the Task Scheduler action — never commit
// them):
//   SUPABASE_URL       https://drtvlcgyjlofaffbwael.supabase.co
//   SUPABASE_ANON_KEY   the System Horizon anon key (same one src/supabase.js uses)
//   HORIZON_EMAIL       the System Horizon sign-in email
//   HORIZON_PASSWORD    the System Horizon sign-in password
//
// This signs in as that owner account (not a service-role key) so every
// row is written under the same RLS-scoped ownership as everything else
// in Horizon — no elevated credentials touch your machine.

import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadDotEnv() {
  const envPath = path.join(__dirname, '.env');
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadDotEnv();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const HORIZON_EMAIL = process.env.HORIZON_EMAIL;
const HORIZON_PASSWORD = process.env.HORIZON_PASSWORD;

function requireEnv() {
  const missing = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'HORIZON_EMAIL', 'HORIZON_PASSWORD']
    .filter((key) => !process.env[key]);
  if (missing.length) {
    console.error(`Missing required environment variable(s): ${missing.join(', ')}`);
    console.error('Set them in a local .env file next to this script (see header comment) or in your Task Scheduler action.');
    process.exit(1);
  }
}

function runGit(cwd, args) {
  return execSync(`git ${args}`, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function checkRepo(repo) {
  const { name, localPath } = repo;
  const row = {
    repo_name: name,
    local_path: localPath,
    has_local_mirror: true,
    uncommitted_count: null,
    ahead_count: null,
    behind_count: null,
    local_head_sha: null,
    local_head_at: null,
    remote_head_sha: null,
    last_handoff_at: null,
    check_error: null,
    checked_at: new Date().toISOString(),
  };

  if (!existsSync(localPath)) {
    row.has_local_mirror = false;
    row.check_error = 'Local path does not exist on this machine.';
    return row;
  }
  if (!existsSync(path.join(localPath, '.git'))) {
    row.has_local_mirror = false;
    row.check_error = 'Path exists but is not a git repository (no .git directory).';
    return row;
  }

  try {
    const status = runGit(localPath, 'status --porcelain');
    row.uncommitted_count = status ? status.split('\n').filter(Boolean).length : 0;
  } catch (error) {
    row.check_error = `git status failed: ${error.message.split('\n')[0]}`;
  }

  try {
    const headLine = runGit(localPath, "log -1 --format=%H%x09%cI");
    const [sha, isoDate] = headLine.split('\t');
    row.local_head_sha = sha || null;
    row.local_head_at = isoDate || null;
  } catch (error) {
    row.check_error = row.check_error || `git log failed: ${error.message.split('\n')[0]}`;
  }

  try {
    runGit(localPath, 'fetch --quiet');
  } catch (error) {
    row.check_error = row.check_error || `git fetch failed (offline or auth issue?): ${error.message.split('\n')[0]}`;
  }

  try {
    row.remote_head_sha = runGit(localPath, 'rev-parse @{u}');
    const counts = runGit(localPath, 'rev-list --left-right --count HEAD...@{u}');
    const [ahead, behind] = counts.split('\t').map((n) => parseInt(n, 10));
    row.ahead_count = Number.isFinite(ahead) ? ahead : null;
    row.behind_count = Number.isFinite(behind) ? behind : null;
  } catch (error) {
    row.check_error = row.check_error || `No upstream tracking branch configured (${error.message.split('\n')[0]})`;
  }

  const handoffPath = path.join(localPath, 'HANDOFF.md');
  if (existsSync(handoffPath)) {
    try {
      const text = readFileSync(handoffPath, 'utf8');
      const match = text.match(/^### (\d{4}-\d{2}-\d{2} \d{2}:\d{2}) ET/m);
      if (match) {
        // Approximation: treats "ET" as fixed UTC-4 (EDT). Off by one hour
        // during EST months (roughly Nov–Mar). Fine for a freshness flag,
        // not meant for precise auditing.
        row.last_handoff_at = new Date(`${match[1].replace(' ', 'T')}:00-04:00`).toISOString();
      }
    } catch {
      // Non-fatal — leave last_handoff_at null, repo just shows as "no handoff read"
    }
  }

  return row;
}

async function signIn() {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: HORIZON_EMAIL, password: HORIZON_PASSWORD }),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Sign-in failed (${response.status}): ${body}`);
  }
  const data = await response.json();
  return data.access_token;
}

async function upsertRows(accessToken, rows) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/horizon_repo_health?on_conflict=owner,repo_name`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(rows),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Upsert failed (${response.status}): ${body}`);
  }
}

async function main() {
  requireEnv();

  const configPath = process.argv[2] || path.join(__dirname, 'mirror-freshness-sync.config.json');
  if (!existsSync(configPath)) {
    console.error(`Config file not found: ${configPath}`);
    process.exit(1);
  }
  const { repos } = JSON.parse(readFileSync(configPath, 'utf8'));

  console.log(`Checking ${repos.length} repo(s)...`);
  const rows = repos.map((repo) => {
    const row = checkRepo(repo);
    const flag = row.check_error ? `⚠ ${row.check_error}` : `ok (uncommitted:${row.uncommitted_count} ahead:${row.ahead_count} behind:${row.behind_count})`;
    console.log(`  ${repo.name}: ${flag}`);
    return row;
  });

  console.log('Signing in...');
  const accessToken = await signIn();

  console.log('Uploading results to Supabase...');
  await upsertRows(accessToken, rows);

  console.log('Done.');
}

main().catch((error) => {
  console.error('Mirror-freshness sync failed:', error.message);
  process.exit(1);
});
