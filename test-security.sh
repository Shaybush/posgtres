#!/bin/bash

echo "🔒 Testing Security Features"
echo "=========================="

BASE_URL="http://localhost:3000"

echo
echo "1. Testing XSS Protection:"
echo "-------------------------"
response=$(curl -s -X POST $BASE_URL/api/users \
  -H "Content-Type: application/json" \
  -d '{"name":"<script>alert(\"XSS\")</script>TestUser","email":"xss@test.com","phone":"+972501234567","address":"123 Main St","city":"Tel Aviv","country":"Israel"}')
echo "Response: $response"

echo
echo "2. Testing SQL Injection Protection:"
echo "-----------------------------------"
response=$(curl -s -X POST $BASE_URL/api/users \
  -H "Content-Type: application/json" \
  -d '{"name":"John; DELETE FROM users; --","email":"sql@test.com","phone":"+972501234567","address":"123 Main St","city":"Tel Aviv","country":"Israel"}')
echo "Response: $response"

echo
echo "3. Testing Rate Limiting (Strict Limiter - 5 requests per 15 min):"
echo "------------------------------------------------------------------"
for i in {1..7}; do
  echo "Request $i:"
  response=$(curl -s -X POST $BASE_URL/api/users \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"RateTest\",\"email\":\"rate$i@test.com\",\"phone\":\"+972501234567\",\"address\":\"123 Main St\",\"city\":\"Tel Aviv\",\"country\":\"Israel\"}")
  
  if [[ $response == *"Too many"* ]]; then
    echo "✅ Rate limit triggered: $response"
    break
  elif [[ $response == *"success"* ]]; then
    echo "✅ Request $i successful"
  else
    echo "❌ Unexpected response: $response"
  fi
done

echo
echo "4. Testing Parameter Pollution Protection:"
echo "----------------------------------------"
response=$(curl -s "$BASE_URL/api/users?id=1&id=2&id=3")
echo "Response: $response"

echo
echo "5. Testing Invalid Characters in Name:"
echo "------------------------------------"
response=$(curl -s -X POST $BASE_URL/api/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Test123@#$","email":"invalid@test.com","phone":"+972501234567","address":"123 Main St","city":"Tel Aviv","country":"Israel"}')
echo "Response: $response"

echo
echo "6. Testing Email with Suspicious Content:"
echo "----------------------------------------"
response=$(curl -s -X POST $BASE_URL/api/users \
  -H "Content-Type: application/json" \
  -d '{"name":"TestUser","email":"test+script@evil.com","phone":"+972501234567","address":"123 Main St","city":"Tel Aviv","country":"Israel"}')
echo "Response: $response"

echo
echo "7. Testing Health Endpoint (No Rate Limiting):"
echo "---------------------------------------------"
response=$(curl -s $BASE_URL/health)
echo "Response: $response"

echo
echo "🎉 Security Testing Complete!" 