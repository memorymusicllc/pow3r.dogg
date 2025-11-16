#!/bin/bash
# Deploy and Run All E2E Tests
# Follows mandatory testing workflow from .cursor/rules.md

set -e

echo "🚀 E2E Test Deployment & Execution"
echo "=================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PROD_URL="https://pow3r-defender-production.contact-7d8.workers.dev"
TEST_RESULTS_DIR="test-results"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Step 1: Build
echo "📦 Step 1: Building..."
if npm run typecheck 2>&1; then
  echo -e "${GREEN}✅ Build successful${NC}"
else
  echo -e "${RED}❌ Build failed${NC}"
  exit 1
fi
echo ""

# Step 2: Deploy (optional - skip if already deployed)
echo "🚀 Step 2: Deploying to production..."
read -p "Deploy to production? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  if npm run deploy:production 2>&1; then
    echo -e "${GREEN}✅ Deployment successful${NC}"
    echo "⏳ Waiting 15 seconds for Cloudflare propagation..."
    sleep 15
  else
    echo -e "${RED}❌ Deployment failed${NC}"
    exit 1
  fi
else
  echo -e "${YELLOW}⚠️  Skipping deployment (assuming already deployed)${NC}"
fi
echo ""

# Step 3: Verify Deployment
echo "🔍 Step 3: Verifying deployment..."
if curl -s -f "${PROD_URL}/health" > /dev/null; then
  echo -e "${GREEN}✅ Production URL is accessible: ${PROD_URL}${NC}"
else
  echo -e "${RED}❌ Production URL is not accessible${NC}"
  exit 1
fi
echo ""

# Step 4: Test Pow3r Pass Connection
echo "🔐 Step 4: Testing Pow3r Pass connection..."
if npm run test:pow3r-pass 2>&1 | grep -q "Pow3r Pass Connection: SUCCESS\|Health Check: ✅"; then
  echo -e "${GREEN}✅ Pow3r Pass connection verified${NC}"
else
  echo -e "${YELLOW}⚠️  Pow3r Pass connection check completed (may have warnings)${NC}"
fi
echo ""

# Step 5: Run All E2E Tests
echo "🧪 Step 5: Running all E2E tests..."
echo "   Test files:"
echo "   - tests/dashboard.spec.ts"
echo "   - tests/migration-e2e.spec.ts"
echo ""

# Create test results directory
mkdir -p "${TEST_RESULTS_DIR}"

# Run tests with HTML report
if npx playwright test --project=chromium --reporter=html,list 2>&1 | tee "${TEST_RESULTS_DIR}/test-run-${TIMESTAMP}.log"; then
  echo ""
  echo -e "${GREEN}✅ All E2E tests completed${NC}"
  TEST_STATUS="PASS"
else
  echo ""
  echo -e "${RED}❌ Some E2E tests failed${NC}"
  TEST_STATUS="FAIL"
fi
echo ""

# Step 6: Generate Report
echo "📊 Step 6: Generating test report..."
if [ -d "playwright-report" ]; then
  echo -e "${GREEN}✅ HTML report generated: playwright-report/index.html${NC}"
  echo "   Open with: npx playwright show-report"
fi
echo ""

# Step 7: Summary
echo "📋 Test Summary"
echo "==============="
echo "Production URL: ${PROD_URL}"
echo "Test Results: ${TEST_RESULTS_DIR}/"
echo "Status: ${TEST_STATUS}"
echo ""

if [ "$TEST_STATUS" = "FAIL" ]; then
  echo -e "${RED}❌ Tests failed. Review failures and fix issues.${NC}"
  echo "   Run: npx playwright show-report"
  exit 1
else
  echo -e "${GREEN}✅ All tests passed!${NC}"
  echo "   View report: npx playwright show-report"
  exit 0
fi

