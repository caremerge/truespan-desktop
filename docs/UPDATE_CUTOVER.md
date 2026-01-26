## Update Cutover Guide (ryangalea23 -> caremerge)

This repo is currently configured to publish releases to `caremerge/truespan`, with optional
legacy uploads to `ryangalea23/truespan` when `LEGACY_RELEASE_TOKEN` is set.

Use this checklist when you are ready to cut over.

### 1) Keep legacy updates working (optional)
- Add repo secret `LEGACY_RELEASE_TOKEN` (classic PAT with `repo` scope on `ryangalea23/truespan`).
- Optional secret `LEGACY_RELEASE_REPO` if the legacy repo is different.
- This ensures old installs can still download the bridge release.

### 2) Publish a bridge release
- Bump version and tag as usual.
- Publish to the current repo.
- If `LEGACY_RELEASE_TOKEN` is set, the same assets will upload to the legacy repo.
- Old installs update once from the legacy repo and then follow `caremerge/truespan` after restart.

### 3) Verify updates
- Install an older build (pointing to `ryangalea23/truespan`) and verify it sees the new version.
- Install a fresh build (pointing to `caremerge/truespan`) and verify it updates from caremerge.

### 4) Sunset legacy uploads
- Remove `LEGACY_RELEASE_TOKEN` from repo secrets.
- Future releases will only upload to `caremerge/truespan`.
