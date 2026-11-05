# Data Model and API Contract (Conceptual)

This is a logical schema, not a migration script. The coding agent must adapt it to the repository and document any deviations.

## 1. Data minimization rule

No table, API contract, event, queue, log, analytics payload, or support tool in the hosted MVP may contain seed phrases, private keys, wallet passwords/PINs, threshold shares, DEKs, or plaintext recovery packages.

## 2. Entities

### users

- `id` (opaque UUID)
- `created_at`, `updated_at`
- authentication credential references (avoid storing authenticator private keys)
- notification preferences
- account status and deletion state

### plans

- `id`, `owner_user_id`
- `schema_version`
- `status` (enum/state-machine value)
- `checkin_interval_days`
- `grace_period_days`
- `next_checkin_at`, `last_checkin_at`
- `timezone` (IANA identifier)
- `created_at`, `updated_at`, `row_version`

### wallet_records

- `id`, `plan_id`
- `label`
- `chain_namespace`, `network_id`
- `public_address` (optional; sensitive metadata)
- `wallet_software`, `hardware_device_model`
- `account_path_notes` (non-secret; plain-language guidance)
- `multisig_summary` (non-secret; never include private keys or full secret configs)
- `visibility_policy`
- timestamps

### plan_members

- `id`, `plan_id`, `user_id` (nullable before invite acceptance)
- `role` (`OWNER`, `GUARDIAN`, `HEIR`, `EXECUTOR`)
- `status` (`INVITED`, `ACCEPTED`, `REVOKED`, `DECLINED`)
- `role_scope`, `accepted_at`, `revoked_at`
- `created_at`, `updated_at`

### invitations

- `id`, `plan_id`, `role`, `recipient_binding`
- `token_verifier` (never plaintext token)
- `expires_at`, `consumed_at`, `revoked_at`
- delivery status; do not store secret invitation URL in logs

### checkin_events

- `id`, `plan_id`, `event_type`, `actor_user_id`
- `occurred_at`, `server_received_at`, `state_version`
- `idempotency_key_hash`
- `result`, `metadata_redacted`

### guardian_attestations

- `id`, `plan_id`, `guardian_user_id`
- `attestation_type` (`CONTACTED_OWNER`, `UNABLE_TO_CONTACT`, `REQUEST_MORE_TIME`)
- `occurred_at`, `notes_redacted_or_absent`, `state_version`
- Do not store legal claims or sensitive family narratives by default.

### cancel_code_verifiers

- `plan_id`, `verifier`, `created_at`, `rotated_at`, `used_at`
- Use a uniformly random high-entropy code. A verifier must not enable offline brute-force of a low-entropy phrase.

### notification_events

- `id`, `plan_id`, `recipient_user_id`, `channel`, `template_id`
- `queued_at`, `sent_at`, `delivery_status`, `provider_message_id_redacted`
- Do not persist full message body if avoidable.

### audit_events

- `id`, `plan_id`, `actor_id`, `actor_role`, `action`, `target_type`, `target_id`
- `occurred_at`, `request_id`, `state_version`, `outcome`, `redacted_diff_hash`
- Append-only to application roles; privileged infrastructure access separately monitored.

## 3. Authorization matrix (initial proposal)

| Resource/action | Owner | Guardian | Heir | Executor | Operator |
|---|---:|---:|---:|---:|---:|
| View/edit own plan | Yes | No | No | No | No by default |
| View assigned guardian instructions | Yes | Limited | No | Limited | No by default |
| View heir instructions | Yes | No | After plan permits | After plan permits | No by default |
| Accept/reject own invitation | N/A | Yes | Yes | Yes | No |
| Record guardian contact attempt | Yes | Yes, own record | No | Limited | No |
| Change guardians/quorum | Yes, re-auth + delay | No | No | No | No |
| Trigger/cancel overdue workflow | Owner can check in/cancel | Attest only | Request contact | Attest only | No override |
| Delete/export own plan | Yes | Own account data only | Own account data only | Own account data only | Controlled operational process |

All authorization is enforced by the server and database policy where applicable. This table is not a substitute for test cases.

## 4. API endpoint families (illustrative)

- `POST /v1/plans` — create a plan.
- `GET /v1/plans/{planId}` — read only if authorized.
- `PATCH /v1/plans/{planId}` — strict field allow-list; re-auth for high-risk fields.
- `POST /v1/plans/{planId}/check-ins` — idempotent owner check-in.
- `POST /v1/plans/{planId}/cancel-overdue` — passkey-authenticated or high-entropy cancel-code flow.
- `POST /v1/plans/{planId}/invitations` — create single-use invitation.
- `POST /v1/invitations/{token}/accept` — bind intended recipient and consume token once.
- `POST /v1/plans/{planId}/guardian-attestations` — guardian's limited attestation.
- `GET /v1/plans/{planId}/export` — owner-authorized export.
- `DELETE /v1/plans/{planId}` — authenticated deletion request with documented retention behavior.

Reject unknown properties on all sensitive request bodies. A request containing a field such as `seedPhrase`, `mnemonic`, `privateKey`, `secret`, `recoveryShare`, `walletPassword`, `pin`, or similarly named field must be rejected and must not echo the value in the response or logs.

## 5. API security requirements

- CSRF protection where cookie authentication is used.
- Rate limits and abuse monitoring.
- Strict CORS allow-list; never wildcard credentials.
- Opaque identifiers; IDs are not authorization.
- Idempotency and replay prevention for state changes.
- Generic errors for login and invitation lookup.
- Avoid PII and wallet data in URL paths/query strings.
- Request size limits and content-type validation.
- API contract tests for every role and cross-tenant access attempt.
