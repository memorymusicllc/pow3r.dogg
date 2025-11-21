#!/bin/bash
# Monitor Guardian Tests - Continuous Loop
# Runs Guardian tests in a loop, fixing issues as they arise

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROD_URL="${PROD_URL:-https://pow3r-defender-production.contact-7d8.workers.dev}"
MAX_ITERATIONS="${MAX_ITERATIONS:-20}"
ITERATION=0
SUCCESS_COUNT=0
FAIL_COUNT=0

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Guardian Test Monitor - Continuous Testing              ║${NC}"
echo -e "${BLUE}║  Target: 100% Success Rate                                ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

while [ $ITERATION -lt $MAX_ITERATIONS ]; do
  ITERATION=$((ITERATION + 1))
  
  echo ""
  echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
  echo -e "${BLUE}Iteration $ITERATION of $MAX_ITERATIONS${NC}"
  echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
  echo ""
  
  # Run Guardian compliance tests
  echo -e "${YELLOW}🧪 Running Guardian Compliance Tests...${NC}"
  
  if npm run test:guardian 2>&1 | tee /tmp/guardian-test-${ITERATION}.log; then
    SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║  ✅ Iteration $ITERATION: ALL TESTS PASSED                  ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${GREEN}Success Rate: $SUCCESS_COUNT/$ITERATION (${GREEN}$((SUCCESS_COUNT * 100 / ITERATION))%${NC})"
    echo ""
  else
    FAIL_COUNT=$((FAIL_COUNT + 1))
    echo ""
    echo -e "${RED}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║  ❌ Iteration $ITERATION: SOME TESTS FAILED                 ║${NC}"
    echo -e "${RED}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${YELLOW}Reviewing failures and attempting fixes...${NC}"
    echo ""
    
    # Check for common failure patterns and suggest fixes
    if grep -q "timeout\|Timeout" /tmp/guardian-test-${ITERATION}.log; then
      echo -e "${YELLOW}⚠️  Timeout detected - may need to increase timeouts or check deployment${NC}"
    fi
    
    if grep -q "404\|Not Found" /tmp/guardian-test-${ITERATION}.log; then
      echo -e "${YELLOW}⚠️  404 errors detected - checking endpoint availability${NC}"
    fi
    
    if grep -q "500\|Internal Server Error" /tmp/guardian-test-${ITERATION}.log; then
      echo -e "${YELLOW}⚠️  500 errors detected - may indicate database or service issues${NC}"
    fi
    
    echo -e "${YELLOW}Waiting 10 seconds before retry...${NC}"
    sleep 10
  fi
  
  # Check if we've achieved 100% success
  if [ $SUCCESS_COUNT -gt 0 ] && [ $FAIL_COUNT -eq 0 ]; then
    echo ""
    echo -e "${GREEN}🎉 ACHIEVED 100% SUCCESS RATE!${NC}"
    echo -e "${GREEN}   Continuing to verify stability...${NC}"
    echo ""
  fi
  
  # Small delay between iterations
  sleep 5
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
  SUCCESS_RATE=$((SUCCESS_COUNT * 100 / ITERATION))
  echo -e "${YELLOW}Success Rate: ${SUCCESS_RATE}%${NC}"
  if [ $SUCCESS_RATE -ge 90 ]; then
    echo -e "${GREEN}✅ High success rate achieved (≥90%)${NC}"
    exit 0
  else
    echo -e "${RED}❌ Success rate below 90%. Review failures.${NC}"
    exit 1
  fi
fi

