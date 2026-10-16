# LibreTV core integration

- Upstream: https://github.com/LibreSpark/LibreTV
- Revision: `a24ad336a3f7c8a16ca93d1f1198e08ac6b7e943`
- Imported: 2026-10-16
- License: AGPL-3.0, reproduced in `LICENSE` in this directory.
- Imported modules: `src/lib/libretv/{cms-parser,m3u-parser,types,ssrf,fetch-utils,ad-filter}.ts` and parser/filter tests. `ad-filter.ts` extracts the filtering functions from upstream `m3u8.ts`.
- Local changes: TypeScript 4.9 compatibility, complete reserved-IP checks, response-body limits, parser preservation of signed URLs. Ad filtering recognizes relative `ads/` paths and evaluates the leading-group heuristic before removing marked ads to prevent cascading removal of the first movie group. TintinTV's wrapper guards encryption/byte ranges and preserves the end marker.

TintinTV integrates LibreTV's media core through `src/lib/downstream.ts` and the live APIs. Its UI, account model, Redis data, routes and category caches remain TintinTV-specific. This is a core integration, not a wholesale replacement with the upstream application. Keep upstream attribution and this license when updating these modules.
