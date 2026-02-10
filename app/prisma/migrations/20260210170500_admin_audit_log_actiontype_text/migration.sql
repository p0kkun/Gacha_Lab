-- Convert admin_audit_logs.actionType from Postgres enum (AdminActionType) to TEXT.
-- Rationale: avoid DB migrations for every new action type; allow free-form strings.

ALTER TABLE "admin_audit_logs"
ALTER COLUMN "actionType" TYPE TEXT
USING ("actionType"::text);

DROP TYPE "AdminActionType";

