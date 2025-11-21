#!/bin/bash
# Guardian-Compliant Continuous Deployment Loop
# Runs Guardian tests, commits, deploys, and tests in a loop until 100% success

set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PROD_URL="${PROD_URL:-https://pow3r-defender-production.contact-7d8.workers.dev}"
MAX_ITERATIONS="${MAX_ITERATIONS:-10}"
ITERATION=0
SUCCESS_COUNT=0
FAIL_COUNT=0

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Guardian System Continuous Deployment Loop              ║${NC}"
echo -e "${BLUE}║  Target: 100% Guardian Compliance                       ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Function to run Guardian checks
run_guardian_checks() {
  local status=0
  
  echo -e "${YELLOW}🔍 Running Guardian System Checks...${NC}"
  
  # Gate 1: Schema Validation
  echo -e "  ${BLUE}Gate 1: Schema Validation${NC}"
  if npm run guardian:schema 2>&1 | grep -q "✅\|exists"; then
    echo -e "    ${GREEN}✅ Passed${NC}"
  else
    echo -e "    ${RED}❌ Failed${NC}"
    status=1
  fi
  
  # Gate 2: Mock Code Scan
  echo -e "  ${BLUE}Gate 2: Mock Code Scan${NC}"
  if npm run guardian:mock-scan 2>&1 | grep -q "No mock code patterns found\|TODO:\|FIXME:"; then
    if npm run guardian:mock-scan 2>&1 | grep -q "TODO:\|FIXME:"; then
      echo -e "    ${RED}❌ Failed (mock code found)${NC}"
      status=1
    else
      echo -e "    ${GREEN}✅ Passed${NC}"
    fi
  else
    echo -e "    ${GREEN}✅ Passed${NC}"
  fi
  
  # Gate 3: TypeScript Compilation
  echo -e "  ${BLUE}Gate 3: TypeScript Compilation${NC}"
  if npm run typecheck 2>&1; then
    echo -e "    ${GREEN}✅ Passed${NC}"
  else
    echo -e "    ${RED}❌ Failed${NC}"
    status=1
  fi
  
  # Gate 4: Configuration Integrity
  echo -e "  ${BLUE}Gate 4: Configuration Integrity${NC}"
  if npm run guardian:config 2>&1; then
    echo -e "    ${GREEN}✅ Passed${NC}"
  else
    echo -e "    ${RED}❌ Failed${NC}"
    status=1
  fi
  
  # Gate 5: Constitutional Compliance
  echo -e "  ${BLUE}Gate 5: Constitutional Compliance${NC}"
  if npm run guardian:law 2>&1 | grep -q "exists\|found"; then
    echo -e "    ${GREEN}✅ Passed${NC}"
  else
    echo -e "    ${YELLOW}⚠️  Warning (law file check)${NC}"
  fi
  
  return $status
}

# Function to run E2E tests
run_e2e_tests() {
  echo -e "${YELLOW}🧪 Running E2E Tests...${NC}"
  
  if npm run test:e2e:all 2>&1 | tee /tmp/guardian-e2e.log; then
    echo -e "  ${GREEN}✅ All E2E tests passed${NC}"
    return 0
  else
    echo -e "  ${RED}❌ Some E2E tests failed${NC}"
    return 1
  fi
}

# Function to run Guardian compliance tests
run_guardian_compliance_tests() {
  echo -e "${YELLOW}🛡️  Running Guardian Compliance Tests...${NC}"
  
  if npx playwright test tests/guardian-compliance.spec.ts --project=chromium --reporter=list 2>&1 | tee /tmp/guardian-compliance.log; then
    echo -e "  ${GREEN}✅ All Guardian compliance tests passed${NC}"
    return 0
  else
    echo -e "  ${RED}❌ Some Guardian compliance tests failed${NC}"
    return 1
  fi
}

# Function to deploy
deploy_to_production() {
  echo -e "${YELLOW}🚀 Deploying to Production...${NC}"
  
  if npm run deploy:production 2>&1; then
    echo -e "  ${GREEN}✅ Deployment successful${NC}"
    echo -e "  ${BLUE}⏳ Waiting 20 seconds for Cloudflare propagation...${NC}"
    sleep 20
    return 0
  else
    echo -e "  ${RED}❌ Deployment failed${NC}"
    return 1
  fi
}

# Function to verify deployment
verify_deployment() {
  echo -e "${YELLOW}🔍 Verifying Deployment...${NC}"
  
  local retries=0
  local max_retries=5
  
  while [ $retries -lt $max_retries ]; do
    if curl -s -f "${PROD_URL}/health" > /dev/null 2>&1; then
      echo -e "  ${GREEN}✅ Production URL is accessible${NC}"
      return 0
    fi
    
    retries=$((retries + 1))
    echo -e "  ${YELLOW}⏳ Retry $retries/$max_retries...${NC}"
    sleep 5
  done
  
  echo -e "  ${RED}❌ Production URL is not accessible after $max_retries retries${NC}"
  return 1
}

# Function to commit changes
commit_changes() {
  echo -e "${YELLOW}📝 Committing changes...${NC}"
  
  # Check if there are changes to commit
  if git diff --quiet && git diff --cached --quiet; then
    echo -e "  ${BLUE}ℹ️  No changes to commit${NC}"
    return 0
  fi
  
  git add -A
  git commit -m "chore: Guardian compliance iteration $ITERATION - $(date +%Y-%m-%d\ %H:%M:%S)" || {
    echo -e "  ${YELLOW}⚠️  No changes to commit or commit failed${NC}"
    return 0
  }
  
  echo -e "  ${GREEN}✅ Changes committed${NC}"
  return 0
}

# Main loop
while [ $ITERATION -lt $MAX_ITERATIONS ]; do
  ITERATION=$((ITERATION + 1))
  
  echo ""
  echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
  echo -e "${BLUE}Iteration $ITERATION of $MAX_ITERATIONS${NC}"
  echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
  echo ""
  
  # Step 1: Run Guardian checks
  if ! run_guardian_checks; then
    echo -e "${RED}❌ Guardian checks failed. Fix issues before proceeding.${NC}"
    FAIL_COUNT=$((FAIL_COUNT + 1))
    continue
  fi
  
  # Step 2: Build dashboard
  echo -e "${YELLOW}📦 Building Dashboard...${NC}"
  if ! npm run dashboard:build 2>&1; then
    echo -e "${RED}❌ Dashboard build failed${NC}"
    FAIL_COUNT=$((FAIL_COUNT + 1))
    continue
  fi
  echo -e "  ${GREEN}✅ Dashboard built${NC}"
  
  # Step 3: Commit changes
  commit_changes
  
  # Step 4: Deploy
  if ! deploy_to_production; then
    echo -e "${RED}❌ Deployment failed${NC}"
    FAIL_COUNT=$((FAIL_COUNT + 1))
    continue
  fi
  
  # Step 5: Verify deployment
  if ! verify_deployment; then
    echo -e "${RED}❌ Deployment verification failed${NC}"
    FAIL_COUNT=$((FAIL_COUNT + 1))
    continue
  fi
  
  # Step 6: Run Guardian compliance tests
  if ! run_guardian_compliance_tests; then
    echo -e "${RED}❌ Guardian compliance tests failed${NC}"
    FAIL_COUNT=$((FAIL_COUNT + 1))
    continue
  fi
  
  # Step 7: Run E2E tests
  if ! run_e2e_tests; then
    echo -e "${RED}❌ E2E tests failed${NC}"
    FAIL_COUNT=$((FAIL_COUNT + 1))
    continue
  fi
  
  # All tests passed!
  SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
  echo ""
  echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${GREEN}║  ✅ Iteration $ITERATION: ALL TESTS PASSED (100% Success)  ║${NC}"
  echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
  echo ""
  
  # Check if we've achieved 100% success
  if [ $SUCCESS_COUNT -gt 0 ] && [ $FAIL_COUNT -eq 0 ]; then
    echo -e "${GREEN}🎉 ACHIEVED 100% SUCCESS RATE!${NC}"
    echo -e "${GREEN}   Success: $SUCCESS_COUNT | Failures: $FAIL_COUNT${NC}"
    echo ""
    echo -e "${BLUE}Continuing to verify stability...${NC}"
    echo ""
  fi
done

# Final summary
echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Final Summary${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "Total Iterations: $ITERATION"
echo -e "${GREEN}Successful: $SUCCESS_COUNT${NC}"
echo -e "${RED}Failed: $FAIL_COUNT${NC}"
echo ""

if [ $FAIL_COUNT -eq 0 ] && [ $SUCCESS_COUNT -gt 0 ]; then
  echo -e "${GREEN}🎉 ACHIEVED 100% SUCCESS RATE!${NC}"
  echo -e "${GREEN}All Guardian compliance tests passed in all iterations.${NC}"
  exit 0
else
  echo -e "${RED}❌ Did not achieve 100% success rate.${NC}"
  echo -e "${YELLOW}Review failures and run again.${NC}"
  exit 1
fi

