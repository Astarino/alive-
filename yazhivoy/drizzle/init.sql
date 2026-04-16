CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id          bigint UNIQUE NOT NULL,
  telegram_username    varchar(64),
  display_name         varchar(64) NOT NULL,
  check_interval_hours smallint NOT NULL DEFAULT 48,
  last_checkin_at      timestamptz,
  last_checkin_msg     varchar(140),
  onboarding_done      boolean NOT NULL DEFAULT false,
  created_at           timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS connections (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a_id  uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_b_id  uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_a_id, user_b_id),
  CHECK(user_a_id < user_b_id)
);

CREATE INDEX IF NOT EXISTS connections_user_a_idx ON connections(user_a_id);
CREATE INDEX IF NOT EXISTS connections_user_b_idx ON connections(user_b_id);

CREATE TABLE IF NOT EXISTS invites (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token      varchar(32) UNIQUE NOT NULL,
  created_by uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  used_by    uuid REFERENCES users(id),
  used_at    timestamptz,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS auth_codes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id bigint NOT NULL,
  code        char(6) NOT NULL,
  used        boolean NOT NULL DEFAULT false,
  expires_at  timestamptz NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sessions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notification_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        varchar(16) NOT NULL,
  deadline_ts timestamptz NOT NULL,
  sent_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, type, deadline_ts)
);

CREATE INDEX IF NOT EXISTS notification_log_user_idx ON notification_log(user_id);
