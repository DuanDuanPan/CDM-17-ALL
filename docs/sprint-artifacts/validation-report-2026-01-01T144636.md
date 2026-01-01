# Validation Report

**Document:** `docs/sprint-artifacts/4-5-smart-notification-center.md`  
**Checklist:** `_bmad/bmm/workflows/4-implementation/create-story/checklist.md`  
**Date:** 2026-01-01T144636

## Summary

- Overall (critical mistakes prevention): 2/8 pass (25%)
- Critical Issues: 8

## Section Results

### 1) Alignment to Epics / Tracking

[⚠ PARTIAL] Story ID/numbering alignment across tracking files  
Evidence:
- Story file title is `Story 4.5` (`docs/sprint-artifacts/4-5-smart-notification-center.md` L1).
- Epics define **Smart Notification Center** as `Story 4.2` (`docs/epics.md` L398-L412).
- Sprint tracking uses `4-5-smart-notification-center` (`docs/sprint-artifacts/sprint-status.yaml` L64-L70).  
Impact: cross-references in stories/dev notes can confuse devs, and future story generation from `docs/epics.md` may drift further.

[✓ PASS] Story statement + AC match Epic intent  
Evidence:
- Story + AC in `docs/epics.md` (`docs/epics.md` L398-L412) matches story file (`docs/sprint-artifacts/4-5-smart-notification-center.md` L9-L22).  
Impact: dev can implement against AC without needing extra elicitation.

### 2) Critical Mistakes To Prevent (Checklist Core)

[⚠ PARTIAL] Reinventing wheels (duplicate functionality)  
Evidence:
- Story explicitly calls out reuse (`docs/sprint-artifacts/4-5-smart-notification-center.md` L296-L320), but points to a throttler service path that does not exist (`docs/sprint-artifacts/4-5-smart-notification-center.md` L69-L76, L360).  
Impact: dev may waste time creating a new throttler instead of extending the existing throttle implementation.

[✗ FAIL] Wrong libraries / dependencies  
Evidence:
- Story recommends SWR Infinite + react-window (`docs/sprint-artifacts/4-5-smart-notification-center.md` L92-L94, L106-L117), but `apps/web/package.json` has neither `swr` nor `react-window` (`apps/web/package.json` L15-L43).  
Impact: dev may introduce unplanned deps and patterns that don’t match current codebase (extra review/rework).

[✗ FAIL] Wrong file locations / incorrect file references  
Evidence:
- Notification types file is referenced as `packages/types/src/notification.ts` (`docs/sprint-artifacts/4-5-smart-notification-center.md` L28), but actual is `packages/types/src/notification-types.ts` (`packages/types/src/notification-types.ts` L13-L21).
- Story references `apps/api/src/modules/notification/notification-throttler.service.ts` (`docs/sprint-artifacts/4-5-smart-notification-center.md` L69) but current throttling logic lives in `apps/api/src/modules/subscriptions/subscription.listener.ts` (`apps/api/src/modules/subscriptions/subscription.listener.ts` L23-L25, L41-L47, L64-L75).  
Impact: dev will likely create duplicate/incorrect files or chase non-existent modules.

[⚠ PARTIAL] Breaking regressions (API/WS contract drift)  
Evidence:
- Existing web hook expects `/api/notifications`, `/api/notifications/unread-count`, `/api/notifications/:id:markRead`, `/api/notifications/markAllRead` (`apps/web/hooks/useNotifications.ts` L49-L52, L73-L75, L88-L92, L110-L114).
- Existing API controller implements those endpoints (`apps/api/src/modules/notification/notification.controller.ts` L20-L36, L42-L55, L60-L73).
- Story proposes a different REST surface (paged list + `POST /mark-read` + `/count`) (`docs/sprint-artifacts/4-5-smart-notification-center.md` L43-L57).  
Impact: unless the story explicitly requires backward-compat or synchronized web+api change, dev can easily break the UI.

[✓ PASS] Ignoring UX / missing UX requirements  
Evidence:
- Dedicated UI/UX design + prototypes exist (`docs/sprint-artifacts/4-5-smart-notification-center.md` L401-L478).  
Impact: reduces UI ambiguity; dev can implement consistently.

[⚠ PARTIAL] Vague implementations  
Evidence:
- Many tasks are specific, but some key behaviors are underspecified:
  - Aggregation key (“同一对象”) + summary formatting requires concrete grouping rules (`docs/sprint-artifacts/4-5-smart-notification-center.md` L15-L17, L72-L76).
  - “张三修改了 {count} 个节点” needs actor identity; current WATCH_UPDATE content does not carry actorName (`apps/api/src/modules/subscriptions/subscription.listener.ts` L277-L284).  
Impact: dev may implement aggregation differently than product intent.

[✓ PASS] Lying about completion / no test plan  
Evidence:
- Test plan exists (unit + component + e2e) (`docs/sprint-artifacts/4-5-smart-notification-center.md` L140-L155, L364-L398).  
Impact: enables real verification vs “looks done”.

[⚠ PARTIAL] Not learning from past work / patterns  
Evidence:
- Story references reuse from Story 4.3 + 4.4 (`docs/sprint-artifacts/4-5-smart-notification-center.md` L308-L311, L490-L492) but some referenced artifacts are outdated/wrong (e.g., throttler service path; types file name).  
Impact: dev may miss the real prior-art locations (plugins + subscription listener).

### 3) Data Model + Contract Accuracy

[✗ FAIL] Notification priority field assumed in schema (inaccurate)  
Evidence:
- Story claims `priority` exists / should be added (e.g., `docs/sprint-artifacts/4-5-smart-notification-center.md` L34-L35, L160-L182).
- Actual Prisma `Notification` model has aggregation fields `groupKey/batchCount/lastAggregatedAt` but **no** `priority` (`packages/database/prisma/schema.prisma` L241-L260).  
Impact: dev may skip required migration or build API filters on a non-existent column.

[⚠ PARTIAL] Real-time event naming consistency  
Evidence:
- Existing client listens to `notification:new` (`apps/web/hooks/useNotifications.ts` L156-L160).
- Existing gateway uses generic `sendToUser(..., event, ...)` and current service emits `notification:new` (`apps/api/src/modules/notification/notification.service.ts` L33-L37; `apps/api/src/modules/notification/notification.gateway.ts` L28-L30).
- Story references `notification.new` and `emitToUser/emitBatch` (not present) (`docs/sprint-artifacts/4-5-smart-notification-center.md` L78-L82, L128-L133).  
Impact: dev may implement mismatched event names/methods and break real-time delivery.

## Failed Items

1. Replace non-existent deps (SWR/react-window) with current patterns or explicitly add deps + rationale.
2. Fix incorrect file references (`notification.ts`, `notification-throttler.service.ts`, missing hooks/components).
3. Fix Prisma/contract mismatch around notification `priority`.

## Partial Items

1. Clarify aggregation keys + summary format requirements (especially actor display).
2. Define backward-compat plan for REST/WS changes.
3. Update “reuse” pointers to actual prior-art locations (plugins + `SubscriptionListener`).

## Recommendations

1. Must Fix
   - Update story file paths to match repo (types + throttling + existing UI/hook names).
   - Reconcile Story numbering/reference drift between `docs/epics.md` and sprint artifacts.
   - Make the data model plan accurate: either (a) add `priority` via migration, or (b) compute priority from `type` and filter without DB changes.
2. Should Improve
   - Make aggregation explicit: groupKey definition, overflow behavior (`MAX_BUFFER_SIZE`), and actor labeling rules.
   - Align event names/methods to existing `notification:new` + `sendToUser`.
3. Consider
   - Reduce duplication: prefer enhancing existing `NotificationList` + `useNotifications` instead of adding parallel components/hooks, unless there’s a clear UX reason to split.
