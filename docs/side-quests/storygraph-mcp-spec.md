# StoryGraph MCP Server — Build Spec

Handoff document. Open this in Claude Code on the laptop and say "build this using the mcp-builder skill."

## What this is

A remote MCP server on Cloudflare Workers that scrapes a **public** StoryGraph profile and exposes it to Claude as three read-only tools. No authentication, no stored credentials, no writes.

**Why it exists:** StoryGraph has no public API. It has been on their roadmap as "long-term" since March 2021 and is still unbuilt as of August 2026. The app is server-side-rendered Rails, so there is no internal JSON API to borrow either. Scraping the public profile is the only route.

## Hard prerequisites

1. StoryGraph profile set to **public** at `app.thestorygraph.com/profile/edit/<username>`. Without this, nothing works.
2. StoryGraph username, stored as the `STORYGRAPH_USERNAME` environment variable in the Worker.
3. Cloudflare account with Workers enabled, and `wrangler` installed locally.

## Prior art to read before writing code

- `github.com/xdesro/storygraph-api` — Netlify Functions doing this exact scrape. Its `utils/parseBookPane.js` has the book-parsing JSDoc and is the single most useful file. Port the parsing logic; do not port the Netlify function wrapper.
- `github.com/ym496/storygraph-api` — Python equivalent, useful as a second opinion on selectors.

Neither is a dependency. Read them, then write fresh TypeScript.

## Tools to implement

All three are read-only. Set annotations: `readOnlyHint: true`, `destructiveHint: false`, `idempotentHint: true`, `openWorldHint: true`.

| Tool | Scrape target | Purpose |
|---|---|---|
| `storygraph_currently_reading` | `currently-reading` | What's in progress right now |
| `storygraph_books_read` | `books-read` | Finished books, newest first |
| `storygraph_to_read` | `to-read` | The TBR pile |

**Shared input schema (Zod):**

- `limit` (number, optional, default 25, max 100) — books to return. Do not default to unlimited; see the subrequest limit below.
- `username` (string, optional) — override the env default. Useful for testing against another public profile.

**Output schema** per book, with fields omitted when absent rather than set to null:

```
id                     string   StoryGraph's internal GUID
title                  string
author                 string
bookCoverStoryGraphUrl string
genreTags              string[]
moodTags               string[]
pageCount              number
firstPublished         number
```

**Open question to resolve during the build:** whether a star rating and a date-read are present in the read-list HTML. Inspect the actual markup for `books-read` before finalizing the schema. If they are there, add `rating` (number) and `dateRead` (string) to the read-history output. If they are not, they are login-gated and do not get faked.

## Implementation notes

**Transport:** streamable HTTP, stateless JSON. Required for a remote connector.

**Pagination:** StoryGraph paginates these lists. Each page is a separate `fetch`. Cloudflare Workers cap subrequests at 50 per request on the free plan, so a large read history will hit the ceiling. Enforce the `limit` max and stop paginating once satisfied. Return a clear message when the list is truncated rather than silently returning partial data.

**Parsing:** use a Workers-compatible HTML parser. `HTMLRewriter` is built into the Workers runtime and is the right choice; Cheerio is heavier and may not behave in the Workers environment.

**Error handling, explicit and actionable:**
- 404 from the profile URL means the profile is private or the username is wrong. Say both possibilities in the error.
- A parse returning zero books when the page loaded fine means StoryGraph changed their markup. Say that explicitly. This is the expected failure mode over time.
- Never fall back to empty results silently.

**Caching:** cache responses for roughly an hour with the Workers Cache API. Reading lists do not change minute to minute, and it cuts both latency and scrape volume.

## Deploy and wire up

1. `wrangler deploy` from the project root.
2. Set the secret: `wrangler secret put STORYGRAPH_USERNAME`.
3. Test locally first with `npx @modelcontextprotocol/inspector` against `wrangler dev`.
4. Add the deployed Worker URL to Claude as a custom connector. Once it is a remote connector it works on mobile too, which is the whole point.

## Known risks, stated plainly

- **This breaks.** Any StoryGraph front-end change can break the selectors with no warning and no deprecation notice. Budget for occasional repair, not zero maintenance.
- **Profile must stay public.** Flipping it private kills the server silently.
- **Read-only forever.** There is no path to logging books or updating progress from here without credentials. If that is ever the goal, this is the wrong architecture.
