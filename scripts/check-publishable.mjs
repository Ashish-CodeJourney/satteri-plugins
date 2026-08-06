#!/usr/bin/env node
/**
 * Refuses to publish a package that changesets has not versioned yet.
 *
 * New packages are scaffolded at 0.0.0 so the first changeset decides their
 * real version. That only holds if the "Version Packages" PR merges before
 * anyone publishes; publish first and 0.0.0 goes to npm permanently, because
 * npm never lets a version number be reused.
 *
 * Runs from `prepublishOnly`, so it guards both `npm publish` and CI.
 */
import { readFileSync } from "node:fs";

const { name, version } = JSON.parse(readFileSync("./package.json", "utf8"));

if (version === "0.0.0") {
  console.error(`
Refusing to publish ${name}@0.0.0.

This package has not been versioned yet. Merge the "Version Packages" pull
request that changesets opens, pull, and publish from that. 0.0.0 cannot be
unpublished and reused later.

  pnpm changeset          # if no changeset exists for this package yet
  # merge the Version Packages PR, then
  git pull && pnpm install && pnpm build
`);
  process.exit(1);
}
