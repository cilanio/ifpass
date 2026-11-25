#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."

# Instância local via loopback interno. Nenhuma porta é publicada.
db=ifpass73-api-db
jwt=$(openssl rand -hex 32)
docker run -d --rm --name "$db" --network none --tmpfs /var/lib/postgresql/data:rw,size=256m   -e POSTGRES_HOST_AUTH_METHOD=trust postgres:17-alpine >/dev/null
limpar() { docker stop ifpass73-rest ifpass73-auth "$db" >/dev/null 2>&1 || true; }
trap limpar EXIT
for _ in $(seq 1 40); do
  if docker exec "$db" pg_isready -h 127.0.0.1 -U postgres >/dev/null 2>&1; then break; fi
  sleep 0.25
done
pg() { docker exec -i "$db" psql -qX -U postgres -v ON_ERROR_STOP=1 "$@"; }
pg <<'SQL'
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN BYPASSRLS;
CREATE ROLE authenticator LOGIN NOINHERIT;
GRANT anon, authenticated, service_role TO authenticator;
CREATE SCHEMA auth;
ALTER ROLE postgres IN DATABASE postgres SET search_path TO auth, public;
SQL
docker run -d --rm --name ifpass73-auth --network "container:$db" \
  -e GOTRUE_API_HOST=127.0.0.1 -e GOTRUE_API_PORT=9999 \
  -e GOTRUE_DB_DRIVER=postgres -e GOTRUE_DB_DATABASE_URL=postgres://postgres@127.0.0.1/postgres?sslmode=disable \
  -e GOTRUE_DB_NAMESPACE=auth -e GOTRUE_SITE_URL=http://localhost -e API_EXTERNAL_URL=http://127.0.0.1:9999 \
  -e GOTRUE_JWT_SECRET="$jwt" -e GOTRUE_JWT_DEFAULT_GROUP_NAME=authenticated \
  -e GOTRUE_EXTERNAL_EMAIL_ENABLED=true -e GOTRUE_MAILER_AUTOCONFIRM=true supabase/gotrue:v2.177.0 >/dev/null
for _ in $(seq 1 50); do
  if docker exec "$db" wget -Y off -qO- http://127.0.0.1:9999/health >/dev/null 2>&1; then break; fi
  sleep 0.25
done
pg <<'SQL'
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
SELECT (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid
$$;
GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
SQL
pg --single-transaction -f - < supabase/schema.sql
for f in supabase/migrations/*.sql; do pg -f - < "$f"; done
docker run -d --rm --name ifpass73-rest --network "container:$db" \
  -e PGRST_DB_URI=postgres://authenticator@127.0.0.1/postgres?sslmode=disable \
  -e PGRST_DB_SCHEMAS=public -e PGRST_DB_ANON_ROLE=anon -e PGRST_JWT_SECRET="$jwt" \
  -e PGRST_SERVER_HOST=127.0.0.1 postgrest/postgrest:v13.0.4 >/dev/null

for _ in $(seq 1 40); do
  if docker exec "$db" wget -Y off -qO- http://127.0.0.1:3000/ >/dev/null; then break; fi
  sleep 0.25
done
python3 supabase/tests/etapa-7-3-api.py
