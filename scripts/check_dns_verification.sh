#!/bin/bash
# Script to check Firebase TXT DNS record for rbgconstruction.in
DOMAIN="rbgconstruction.in"
EXPECTED="hosting-site=accountancy-469917"

result=$(dig TXT $DOMAIN +short)

if echo "$result" | grep -q "$EXPECTED"; then
  echo "✅ TXT record found: $EXPECTED"
  exit 0
else
  echo "❌ TXT record not found. Current value: $result"
  exit 1
fi
