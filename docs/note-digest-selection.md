# Note Digest Selection

## Summary

- Selects a note digest batch of documents based on review state signals.
- Balances due items with controlled introduction of new items.

## Scope

- In scope: scoring and selecting review candidates for a note digest.
- Out of scope: scheduling, delivery channels, review state mutation, LLM quiz generation.

## Main Files

| Path | Responsibility |
|------|----------------|
| `packages/core/src/domain/note-digest.ts` | Score and select review candidates into a batch. |
| `packages/core/src/domain/note-digest.test.ts` | Batch selection tests. |
| `packages/db/src/schemas/core.ts` | Review state fields consumed by the algorithm. |

## Main Flows

### Generate batch

1. Filter out candidates with `status = suspended` or `deprioritizedUntil > now`.
2. Score remaining candidates:
   - Overdue and due-soon get higher base scores.
   - New items (`nextDueAt = null`) get a mid score.
   - Future scheduled items get a low score.
   - Multiply by `priorityWeight` (clamped).
   - Apply a cooldown penalty if `lastSentAt` is within `minSendIntervalDays`.
3. Sort by score (tie-breakers: earlier due date, higher priority, lower document id).
4. Fill batch:
   - Take all overdue/due-soon first.
   - Add up to `maxNewFraction` of new items.
   - Fill with scheduled items, then remaining new items if needed.
5. Assign `position` and return selected items + skipped list.

## Data Model / DB

- Tables/entities: `review_states` provides `status`, `priority_weight`, `deprioritized_until`, `next_due_at`, `last_sent_at`.
- Identifiers: selection uses `documentId` from `review_states`.
- Invariants:
  - Suspended items never appear in a batch.
  - Deprioritized items are skipped until `deprioritizedUntil`.
  - Batch size is capped; new items are capped by `maxNewFraction` unless needed to fill.

## External Constraints

- None in the algorithm itself (no network calls).

## Testing / Verification

- Run: `bun test packages/core/src/domain/note-digest.test.ts`
- Note: `bun test` for the whole repo requires `DATABASE_URL` due to other suites.
