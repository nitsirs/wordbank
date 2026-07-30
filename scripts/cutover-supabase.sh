#!/usr/bin/env bash
# Cutover: switch arnork.com from Firebase to Supabase. Run on a terminal that has
# the wordbank repo + SSH access to the Mac mini (creds). One command, confirm-gated.
# Repo: ~/Desktop/kru-kan/wordbank (ThinkPad). Creds: ~/.config/wordbank/env on the mini.
set -euo pipefail

REPO="$HOME/Desktop/kru-kan/wordbank"
MINI="nitsirs@100.122.205.30"
VERCEL_PID="prj_BCY73xgNsQm0nTynV9Ox5QyU0UkE"
SUPA_REF="vmltwkemcwdjblxgjrnb"
SUPA_URL="https://${SUPA_REF}.supabase.co"
BRANCH="feat/supabase-migration"

echo "▶ 1/6  Fetching creds from the mini…"
SKEY=$(ssh -o ConnectTimeout=15 "$MINI" 'grep "^SUPABASE_SERVICE_ROLE_KEY=" ~/.config/wordbank/env | cut -d= -f2-')
ANON=$(ssh -o ConnectTimeout=15 "$MINI" 'grep "^SUPABASE_ANON_KEY=" ~/.config/wordbank/env | cut -d= -f2-')
VTOK=$(ssh -o ConnectTimeout=15 "$MINI" 'grep "^VERCEL_TOKEN=" ~/.config/wordbank/env | cut -d= -f2-')
[ -n "$SKEY" ] && [ -n "$ANON" ] && [ -n "$VTOK" ] || { echo "✗ missing creds on mini"; exit 1; }
echo "    ✓ creds fetched"

echo "▶ 2/6  Fresh data port (idempotent)…"
cd "$REPO"
SUPABASE_URL="$SUPA_URL" SUPABASE_SERVICE_ROLE_KEY="$SKEY" node scripts/migrate_firebase_to_supabase.mjs --students

echo "▶ 3/6  Setting Vercel env vars (NEXT_PUBLIC_SUPABASE_*)…"
set_env () {
  local key="$1" val="$2"
  local eid
  eid=$(curl -s "https://api.vercel.com/v9/projects/${VERCEL_PID}/env" -H "Authorization: Bearer ${VTOK}" \
    | python3 -c "import sys,json;d=json.load(sys.stdin);print(next((e['id'] for e in d.get('envs',[]) if e['key']=='$key'),''))" 2>/dev/null || echo "")
  local body="{\"value\":\"$val\",\"type\":\"encrypted\",\"target\":[\"production\",\"preview\",\"development\"]}"
  if [ -n "$eid" ]; then
    curl -s -X PATCH "https://api.vercel.com/v9/projects/${VERCEL_PID}/env/${eid}" -H "Authorization: Bearer ${VTOK}" -H "Content-Type: application/json" -d "$body" -o /dev/null
    echo "    ✓ updated $key"
  else
    curl -s -X POST "https://api.vercel.com/v10/projects/${VERCEL_PID}/env" -H "Authorization: Bearer ${VTOK}" -H "Content-Type: application/json" -d "{\"key\":\"$key\",$body}" -o /dev/null
    echo "    ✓ created $key"
  fi
}
set_env "NEXT_PUBLIC_SUPABASE_URL" "$SUPA_URL"
set_env "NEXT_PUBLIC_SUPABASE_ANON_KEY" "$ANON"

echo "▶ 4/6  Merge ${BRANCH} -> main…"
git checkout main
git pull --ff-only origin main || true
git merge --no-ff "$BRANCH" -m "merge: Supabase migration cutover (Firebase -> Supabase, anon auth + RLS)"

echo "▶ 5/6  CONFIRM — push to main deploys to arnork.com (live, 180 students)."
read -r -p "Type 'cutover' to push, anything else to abort: " yn
[ "$yn" = "cutover" ] || { echo "aborted (main not pushed; branch + env still ready)"; exit 1; }
git push origin main

echo "▶ 6/6  Waiting for Vercel build…"
for i in $(seq 1 30); do
  st=$(curl -s "https://api.vercel.com/v6/deployments?projectId=${VERCEL_PID}&limit=1&target=production" -H "Authorization: Bearer ${VTOK}" \
    | python3 -c "import sys,json;d=json.load(sys.stdin);print(d['deployments'][0]['readyState'])" 2>/dev/null || echo "?")
  echo "   build: $st"
  case "$st" in READY|ERROR|CANCELED) break ;; esac
  sleep 15
done

echo "▶ Verify arnork.com…"
curl -s -o /dev/null -m 20 -w "   arnork.com -> HTTP %{http_code}\n" https://arnork.com/
curl -s -o /dev/null -m 20 -w "   arnork.com/quiz -> HTTP %{http_code}\n" https://arnork.com/quiz
echo
echo "✅ CUTOVER DONE. Open https://arnork.com, log in with an existing nickname to confirm"
echo "   progress carried over (adopt_legacy), and check /dashboardteacher."
echo "   Firebase stays as a read-only backup for ~2 weeks."
