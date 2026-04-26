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

- [ ] **UX-01**: Pages transition with Framer Motion animations; skeleton loaders shown during data fetch (no layout shifts)
- [ ] **UX-02**: All interactive elements are ≥44px touch targets throughout the app

### Localization

- [ ] **LOC-01**: App is available in Russian and English; language auto-detected from browser with manual switcher

### Security / Compliance

- [ ] **SEC-01**: User can delete account with full data cascade; data export available; consent gate shown for children under 13 (COPPA/GDPR)
- [ ] **SEC-02**: Parent actions are recorded in an audit log (shop confirmations, settings changes, coin adjustments)

### Desktop

- [ ] **DSK-01**: App has a dedicated desktop layout (≥1024px): sidebar navigation, multi-column content areas, full-width chat
- [ ] **DSK-02**: Parent Center pages are fully designed for wide screen — no stretched mobile cards
- [ ] **DSK-03**: Kid Screen pages are fully designed for wide screen — no stretched mobile cards

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

## Traceability

Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| PWA-01 | Phase 4.1 (pwa) | Complete |
| PWA-02 | Phase 4.1 (pwa) | Complete |
| PWA-03 | Phase 4.1 (pwa) | Complete |
| UX-01 | Phase 4.2 (ux-polish) | Pending |
| UX-02 | Phase 4.2 (ux-polish) | Pending |
| LOC-01 | Phase 4.3 (localization) | Pending |
| SEC-01 | Phase 4.4 (security-compliance) | Pending |
| SEC-02 | Phase 4.4 (security-compliance) | Pending |
| DSK-01 | Phase 4.5 (desktop) | Pending |
| DSK-02 | Phase 4.5 (desktop) | Pending |
| DSK-03 | Phase 4.5 (desktop) | Pending |

**Coverage:**
- v4.0 requirements: 11 total
- Mapped to phases: 11
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-26*
*Last updated: 2026-04-26 — PWA-03 marked complete (04.1-02: offline caching + OfflineBanner)*
