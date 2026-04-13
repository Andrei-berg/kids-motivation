# Requirements: KidsCoins

**Defined:** 2026-04-13
**Core Value:** Any family can register and use the app — children earn coins for real effort, spend them on real rewards

## v3.0 Requirements

Requirements for Milestone v3.0 — Communication.

### Notifications

- [x] **NOTIF-01**: Child receives push notification when parent confirms a task
- [ ] **NOTIF-02**: Child receives push notification when earning a badge
- [ ] **NOTIF-03**: Child receives push notification when coins are credited or deducted from wallet
- [ ] **NOTIF-04**: Parent can send "Medal of the Day" — personal message + bonus coins; child receives push notification

### Chat

- [ ] **CHAT-01**: Family members can send text messages in a shared family group chat in real time (Supabase Realtime)
- [ ] **CHAT-02**: Family members can react to messages with ❤️ 👍 🔥 🏆
- [ ] **CHAT-03**: Family members can send stickers from a predefined sticker pack
- [ ] **CHAT-04**: Achievement events (badge earned, streak milestone, coins credited) auto-post to family chat

### Photos

- [ ] **PHOTO-01**: Family members can attach a photo to a chat message
- [ ] **PHOTO-02**: Child can attach a photo as proof when marking a task complete; parent sees photo in task confirmation view

## v4.0 Requirements

Deferred to future release.

### Voice

- **VOICE-01**: Family members can send voice messages in chat
- **VOICE-02**: Child can attach voice note as task proof

## Out of Scope

| Feature | Reason |
|---------|--------|
| Voice messages in v3.0 | Requires Supabase Pro (storage costs); defer to v4.0 |
| Video messages | High storage/bandwidth cost |
| Private 1-on-1 chat | Group chat sufficient for family; lower complexity |
| Message delete/edit | Nice-to-have, not core to communication value |
| Read receipts | Adds complexity; lower priority |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| NOTIF-01 | Phase 3.1 | Complete |
| NOTIF-02 | Phase 3.1 | Pending |
| NOTIF-03 | Phase 3.1 | Pending |
| NOTIF-04 | Phase 3.1 | Pending |
| CHAT-01 | Phase 3.2 | Pending |
| CHAT-02 | Phase 3.2 | Pending |
| CHAT-03 | Phase 3.2 | Pending |
| CHAT-04 | Phase 3.2 | Pending |
| PHOTO-01 | Phase 3.3 | Pending |
| PHOTO-02 | Phase 3.3 | Pending |

**Coverage:**
- v3.0 requirements: 10 total
- Mapped to phases: 10
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-13*
*Last updated: 2026-04-13 — traceability filled after roadmap creation*
