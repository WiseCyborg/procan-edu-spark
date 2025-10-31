#!/bin/bash
# Quick Resend API sanity check

echo "🔬 Testing Resend API directly..."

RESEND_API_KEY="${RESEND_API_KEY:-YOUR_KEY_HERE}"
TEST_EMAIL="${TEST_EMAIL:-ops@procannedu.com}"

response=$(curl -s -w "\n%{http_code}" https://api.resend.com/emails \
  -H "Authorization: Bearer $RESEND_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"from\": \"ProCann Edu <noreply@procannedu.com>\",
    \"to\": [\"$TEST_EMAIL\"],
    \"subject\": \"🔬 Resend Direct Test\",
    \"html\": \"<p>If you see this, Resend API is working!</p>\"
  }")

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" = "200" ]; then
  echo "✅ SUCCESS: Resend API working"
  echo "$body" | jq
else
  echo "❌ FAILED: Status $http_code"
  echo "$body" | jq
  exit 1
fi
