#!/bin/bash

echo "🔒 Testing Rate Limiting"
echo "======================="

BASE_URL="http://localhost:3000"

# Generate unique timestamp for emails
TIMESTAMP=$(date +%s)

echo "Testing Rate Limiting (Strict Limiter - 5 requests per 15 min):"
echo "----------------------------------------------------------------"

for i in {1..7}; do
  echo "Request $i:"
  
  # Use unique email with timestamp to avoid conflicts
  response=$(curl -s -X POST $BASE_URL/api/users \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"RateTest\",\"email\":\"rate${i}_${TIMESTAMP}@test.com\",\"phone\":\"+972501234567\",\"address\":\"123 Main St\",\"city\":\"Tel Aviv\",\"country\":\"Israel\"}")
  
  if [[ $response == *"Too many"* ]]; then
    echo "✅ Rate limit triggered: $response"
    break
  elif [[ $response == *"success"* ]]; then
    echo "✅ Request $i successful"
  elif [[ $response == *"Email already exists"* ]]; then
    echo "⚠️  Email conflict (expected): $response"
  else
    echo "❌ Unexpected response: $response"
    # Let's also check what the actual validation error is
    echo "   Raw response: $response"
  fi
  
  # Small delay to avoid overwhelming the server
  sleep 0.1
done

echo
echo "Rate limiting test complete!"