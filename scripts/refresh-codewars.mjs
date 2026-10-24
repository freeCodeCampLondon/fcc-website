#!/usr/bin/env node
// Refreshes src/data/codewars.json from the public CodeWars API.
//
//   npm run data:codewars                 refresh every kata already listed
//   npm run data:codewars -- <id> [<id>]  also add new katas by id
//
// Run it by hand when the list changes; builds and tests never call the API.
// Katas that are still in beta (not approved) or have no JavaScript version
// are skipped and logged. Any HTTP error stops the run and leaves the existing
// file untouched.
import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

const DATA_FILE = fileURLToPath(
  new URL("../src/data/codewars.json", import.meta.url),
);
const API = "https://www.codewars.com/api/v1/code-challenges/";
const USER_AGENT =
  "freecodecamp.london kata refresh (+https://github.com/freeCodeCampLondon/fcc-website)";
const DELAY_MS = 250;
const ID_PATTERN = /^[0-9a-f]{24}$/;

/**
 * Maps one CodeWars API response to the shape stored in codewars.json, or
 * returns a reason string when the kata should be skipped.
 */
export function toKata(response) {
  if (!response.approvedAt) {
    return "not approved (beta)";
  }
  if (!response.languages?.includes("javascript")) {
    return "no JavaScript version";
  }
  const rank = -Number(response.rank?.id);
  if (!Number.isInteger(rank) || rank < 1 || rank > 8) {
    return `unexpected rank ${JSON.stringify(response.rank)}`;
  }
  return {
    id: response.id,
    title: response.name.replace(/\s+/g, " ").trim(),
    rank,
    tags: response.tags ?? [],
    approved: true,
  };
}

/** Easiest first (8 kyu down to 1 kyu), then by title. */
export function sortKatas(katas) {
  return [...katas].sort(
    (a, b) => b.rank - a.rank || a.title.localeCompare(b.title, "en"),
  );
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchKata(id) {
  const response = await fetch(API + id, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`GET ${API + id} failed: HTTP ${response.status}`);
  }
  return response.json();
}

async function main(extraIds) {
  const invalid = extraIds.filter((id) => !ID_PATTERN.test(id));
  if (invalid.length > 0) {
    throw new Error(`Not CodeWars kata ids: ${invalid.join(", ")}`);
  }
  const current = existsSync(DATA_FILE)
    ? JSON.parse(readFileSync(DATA_FILE, "utf8")).map((kata) => kata.id)
    : [];
  const ids = [...new Set([...current, ...extraIds])];
  if (ids.length === 0) {
    throw new Error("No kata ids: pass some as arguments");
  }

  const katas = [];
  for (const [index, id] of ids.entries()) {
    if (index > 0) {
      await sleep(DELAY_MS);
    }
    const result = toKata(await fetchKata(id));
    if (typeof result === "string") {
      console.warn(`Skipping ${id}: ${result}`);
      continue;
    }
    katas.push(result);
  }

  const temporary = `${DATA_FILE}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(sortKatas(katas), null, 2)}\n`);
  renameSync(temporary, DATA_FILE);

  const counts = Object.groupBy(katas, (kata) => `${kata.rank} kyu`);
  const summary = Object.entries(counts)
    .map(([rank, list]) => `${rank}: ${list.length}`)
    .join(", ");
  console.log(`Wrote ${katas.length} katas (${summary})`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
