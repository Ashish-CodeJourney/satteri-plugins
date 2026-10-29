# satteri-slug

## 0.3.0

### Minor Changes

- fd16b1b: Require Sätteri 0.11. The `satteri` peer range is now `^0.11.5`; Sätteri 0.10 is no longer supported.

## 0.2.0

### Minor Changes

- 3433973: Require Sätteri 0.10. The `satteri` peer range is now `^0.10.0`; Sätteri 0.9 is no longer supported.

## 0.1.1

### Patch Changes

- 18272ba: First release published through GitHub Actions with npm trusted publishing, so these tarballs carry
  a signed provenance attestation. `0.1.0` was published from a terminal to bootstrap the trusted
  publisher and has no attestation. No code changes.

## 0.1.0

### Minor Changes

- c1e7bdd: Add `satteri-slug`, a port of `rehype-slug` that gives every heading a GitHub-compatible `id`.
