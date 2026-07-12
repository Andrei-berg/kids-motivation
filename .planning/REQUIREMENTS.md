# Requirements: FamilyCoins

**Defined:** 2026-04-26
**Core Value:** Any family can register and use the app — children earn coins for real effort, spend them on real rewards

## v4.0 Requirements

Requirements for v4.0 PWA Polish milestone. Each maps to roadmap phases.

### PWA

- [x] **PWA-01**: User can install the app on iPhone/Android via Add to Home Screen prompt
- [x] **PWA-02**: Web Push notifications are delivered when the app is closed (service worker background push)
- [x] **PWA-03**: Basic offline support — cached shell loads without internet; graceful degradation shown

### UX Polish

- [x] **UX-01**: Pages transition with Framer Motion animations; skeleton loaders shown during data fetch (no layout shifts)
- [ ] **UX-02**: All interactive elements are ≥44px touch targets throughout the app

### Localization

- [x] **LOC-01**: App is available in Russian and English; language auto-detected from browser with manual switcher

### Security / Compliance

- [x] **SEC-01**: User can delete account with full data cascade; data export available; consent gate shown for children under 13 (COPPA/GDPR)
- [x] **SEC-02**: Parent actions are recorded in an audit log (shop confirmations, settings changes, coin adjustments)

### Desktop

- [ ] **DSK-01**: App has a dedicated desktop layout (≥1024px): sidebar navigation, multi-column content areas, full-width chat
- [ ] **DSK-02**: Parent Center pages are fully designed for wide screen — no stretched mobile cards
- [x] **DSK-03**: Kid Screen pages are fully designed for wide screen — no stretched mobile cards

## Future Requirements

Requirements acknowledged but deferred beyond v4.0.

### Social

- Voice messages in chat — storage cost, defer to v5.0+
- Family friendship and cross-family challenges — v6.0

### Native

- iOS / Android native apps (Expo) — v7.0

## Out of Scope

Explicitly excluded from v4.0.

| Feature | Reason |
|---------|--------|
| Apple ID login | Google + email sufficient for beta |
| Video messages | High storage/bandwidth cost |
| Offline Realtime chat | Real-time is core; graceful degradation is sufficient |
| B2B teacher/coach accounts | Post-product-market-fit |
| Freemium limits + Stripe | v5.0 |

## v5.0 Requirements (success-criteria traceability)

v5.0 phases (5.1–5.11) trace to their ROADMAP **Success Criteria**, not to new
user-facing REQ-IDs. Plan frontmatter `requirements:` fields carry SC-IDs; this
table registers them so traceability checks don't flag them as uncovered.
When planning a new v5.0 phase, add its SC-IDs here.

| SC-ID | Phase | Criterion (short) | Status |
|-------|-------|-------------------|--------|
| LP-SC1 | 5.1 launch-prep | Secrets rotated | Complete |
| LP-SC2 | 5.1 launch-prep | Sentry + PostHog wired | Complete |
| LP-SC3 | 5.1 launch-prep | Money-route integration tests | Complete |
| LP-SC4 | 5.1 launch-prep | FamilyCoins naming | Complete |
| RT-SC1 | 5.2 room-tasks | room_tasks/room_checks tables + seed | Complete |
| RT-SC2 | 5.2 room-tasks | Kid/parent forms render dynamic checklist | Complete |
| RT-SC3 | 5.2 room-tasks | Award computes from room_checks | Complete |
| RT-SC4 | 5.2 room-tasks | Settings editor (add/rename/toggle/reorder/delete) | Complete |
| DT-SC1 | 5.3 design-tokens | Unified token source lib/design/tokens.ts | Complete |
| DT-SC2 | 5.3 design-tokens | Fonts: Bitter / Golos Text / JetBrains Mono | Complete |
| DT-SC3 | 5.3 design-tokens | Shared atoms (LedgerRow/Amount/StatusChip) | Complete |
| DT-SC4 | 5.3 design-tokens | Pilots on kid wallet + parent dashboard | Complete |
| 05.4-SC1 | 5.4 streak-settings | wallet_settings streak fields + defaults | Complete |
| 05.4-SC2 | 5.4 streak-settings | Award reads streak settings, parity kept | Complete |
| 05.4-SC3 | 5.4 streak-settings | Parent edits streak rules end-to-end | Complete |
| 05.5-SC1 | 5.5 year-calendar | Parent sets school-year dates + quarters/trimesters mode | Planned |
| 05.5-SC2 | 5.5 year-calendar | Region preset fills vacations (bundled JSON), manual wins | Planned |
| 05.5-SC3 | 5.5 year-calendar | Configurable weekend days + sick day pauses streaks | Planned |
| 05.5-SC4 | 5.5 year-calendar | getDayType fully data-driven; kid day screen reflects it | Planned |
| 05.5-SC5 | 5.5 year-calendar | CR-01 fix: streak writes server-side + streaks SELECT-only lock | Planned |

## Traceability

Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| PWA-01 | Phase 4.1 (pwa) | Complete |
| PWA-02 | Phase 4.1 (pwa) | Complete |
| PWA-03 | Phase 4.1 (pwa) | Complete |
| UX-01 | Phase 4.2 (ux-polish) | Complete |
| UX-02 | Phase 4.2 (ux-polish) | Pending |
| LOC-01 | Phase 4.3 (localization) | Complete |
| SEC-01 | Phase 4.4 (security-compliance) | Complete |
| SEC-02 | Phase 4.4 (security-compliance) | Complete |
| DSK-01 | Phase 4.5 (desktop) | Pending |
| DSK-02 | Phase 4.5 (desktop) | Pending |
| DSK-03 | Phase 4.5 (desktop) | Complete |

**Coverage:**
- v4.0 requirements: 11 total
- Mapped to phases: 11
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-26*
*Last updated: 2026-07-07 — v5.0 SC-ID traceability section added (kills the \u00abuncovered REQ-ID\u00bb gap-analysis noise for phases 5.1\u20135.4; future v5 phases register SC-IDs here at plan time)*
