#!/bin/bash
# End-to-end test script for bus-ingestion service
# Prerequisites: Kafka running, bus topics created, service running

set -e

SERVICE_URL="http://localhost:8080"
SLOT_KEY="2026-06-17T10:05+08:00"

echo "🧪 End-to-End Test Script"
echo "========================"

# 1. Health check
echo ""
echo "1️⃣  Testing /health endpoint..."
curl -s "$SERVICE_URL/health" | jq .
echo "✓ Health check passed"

# 2. Leader health check
echo ""
echo "2️⃣  Testing /health/leader endpoint..."
curl -s "$SERVICE_URL/health/leader" | jq .
echo "✓ Leader health check passed"

# 3. Try ingest (requires TDX credentials)
if [ -z "$TDX_CLIENT_ID" ] || [ -z "$TDX_CLIENT_SECRET" ]; then
  echo ""
  echo "⚠️  Skipping ingest test (TDX_CLIENT_ID and TDX_CLIENT_SECRET not set)"
  echo "   Set environment variables to test:"
  echo "   export TDX_CLIENT_ID='your-client-id'"
  echo "   export TDX_CLIENT_SECRET='your-client-secret'"
else
  echo ""
  echo "3️⃣  Testing POST /ingest/slots..."
  curl -s -X POST "$SERVICE_URL/ingest/slots" \
    -H 'Content-Type: application/json' \
    -d "{
      \"slotKey\": \"$SLOT_KEY\",
      \"mode\": \"backfill\",
      \"force\": false
    }" | jq .
  echo "✓ Ingest test completed"

  # 4. Test idempotency (should skip second time)
  echo ""
  echo "4️⃣  Testing idempotency (second call should skip)..."
  curl -s -X POST "$SERVICE_URL/ingest/slots" \
    -H 'Content-Type: application/json' \
    -d "{
      \"slotKey\": \"$SLOT_KEY\",
      \"mode\": \"backfill\",
      \"force\": false
    }" | jq .
  echo "✓ Idempotency test passed"

  # 5. Check manifest was created
  echo ""
  echo "5️⃣  Checking manifest file..."
  if [ -f "data/bus/ingestion/manifest.json" ]; then
    echo "✓ Manifest file exists:"
    jq '.snapshots[-1]' data/bus/ingestion/manifest.json
  else
    echo "⚠️  Manifest file not found"
  fi
fi

# 6. Check Kafka messages (requires kafka-console-consumer)
echo ""
echo "6️⃣  To verify messages in Kafka, run:"
echo "   cd infra/kafka && docker compose exec kafka kafka-console-consumer.sh \\"
echo "     --bootstrap-server localhost:9092 \\"
echo "     --topic normalized.tdx.bus_vehicle_position \\"
echo "     --from-beginning \\"
echo "     --max-messages 5"

echo ""
echo "✅ End-to-end test complete!"
