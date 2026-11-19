# Session idle timeout

Global database-backed policy: system.session_policy.idle_timeout_minutes, default 30, integer range 1..1440. Admin with effective system.read can modify through PUT /system/session-policy; changes are transactional and audited. Authenticated users may GET the policy. UI is a separate global card at the top of System Management / Parameters; it is saved separately from existing browser-local store parameters. Debug/mock mode does not use this production policy.

Migration 021 adds sessions.last_activity_at and the singleton policy. Existing sessions start their idle grace period when migration runs. Absolute seven-day expiry remains. Every authenticated server request checks both expiry constraints. Only POST /session/activity renews idle time; normal reads, background polling and session checks do not. Expired activity cannot revive a session. GET /session removes rejected session tokens.

Frontend listens to trusted pointer, keyboard, wheel and touch activity in visible tabs. Activity reporting is throttled to ten seconds; session status is checked every ten seconds and on becoming visible. Server enforcement is immediate at request time, while an idle visible UI can take approximately ten seconds to show logout; sleeping browsers detect it when resuming. Multiple tabs share the server session. Logout clears React Query data; login page explains expired/invalid session. Network failure does not renew the server session. Local display/debug auth is not a security boundary.

Regression tested with independent PostgreSQL schema and synthetic users: passive session read keeps deadline unchanged, activity extends it, global policy persists, 1..1440 integer validation, store-role PUT forbidden, expired activity/session/business calls return 401. Expired time was set in isolated DB to avoid waiting 30 minutes. Typecheck and release build passed. Browser automation unavailable in the session; no claim of completed browser interaction QA.

Related changes: shared pagination options 10/20/30/50/100; existing callbacks reset page when size changes. Audit search Button uses accent theme variant.
