# Cusor Project Rules

Run until compliant + complete.

## Definition of Done
A task is considered finished/done/complete only when verified and all of the following criteria are met:
*   All code has been written and is compliant with the `pow3r.v3.law.md`.
*   All new and existing tests pass in a deployed environment.
*   There are no regressions in existing functionality.
*   The code has been deployed to production.
*   Responded with the compliance score and test results has been provided to the user.
*   User says it is done.

Assume that any .md document, summary, and report in the repo that says a feature is done or complete is WRONG. 

## Repo Organization and Documentation
1. 2. Clean and organize the repo documentation updating and consolidating guidelines
2. Update inline documentation and comments
3. Remove out of date documentation
4. Remove all unnecessary summaries and reports
5. Use concise and specific language optimized for AI agents and MCP
6. When writing reports, documents, summaries, and .md files, DO NOT say an item is done, complete, or finished. 7. ONLY humans/users can document and item, task, or job is "complete". 

## Tests Results
1. When writing test results only use quantitative values and evidence-based information, ex. errors, warnings, messages, tests passed, metrics, and performance analytics. 
2. Do not assume passing a test means the test was conclusive.

## Workflow

1.  **Understand:** Use the `PROMPT: UNDERSTAND_TASK` to confirm your understanding of the user's request.
2.  **Plan:** Use the `PROMPT: CREATE_PLAN` to create a detailed, step-by-step plan.
3.  **Test:** Use the `PROMPT: WRITE_TESTS` to write comprehensive tests for the new feature or bug fix.
4.  **Implement:** Use the `PROMPT: IMPLEMENT_CODE` to implement the code.
5.  **Verify & Deploy:** Use the `PROMPT: VERIFY_AND_DEPLOY` to verify the changes, run the tests, and deploy the code.

If the user referenced this document more than 1 time in a chat, fix the compliance issue to improve adherence in addition.

## Step 1
read `pow3r.v3.law.md`

## Step 2 
### MANDATORY Testing Workflow - AUTOMATIC COMPLIANCE REQUIRED

**CRITICAL: This workflow MUST be followed automatically for every task. No exceptions. No reminders needed.**

#### Complete Deployment & Testing Cycle (MUST REPEAT UNTIL 100% PASS):

1. **Build** → `npm run build:v3` (verify success)
2. **Deploy** → `npm run deploy` (deploy to Cloudflare Pages project `storywriter`)
3. **Verify Deployment** → Confirm PROD URL https://writer.superbots.link is updated and accessible
4. **Commit & Push** → `git add -A && git commit -m "..." && git push origin main` 
5. **Wait for Propagation** → Wait 10-15 seconds for Cloudflare to propagate
6. **Run Tests on PROD** → `npx playwright test --project=chromium` (MUST test on https://writer.superbots.link)
7. **If ANY test fails** → STOP, fix the issue, rebuild, redeploy, retest (repeat cycle)
8. **If all tests pass** → Provide final report with screenshots

**This cycle continues until:**
- All tests pass (100% success rate)
- Code is deployed to production
- Screenshots provided
- Final report submitted

#### Testing Rules (MANDATORY):

1. **Tests MUST run on deployed PROD** - Never trust local results. Always test on https://writer.superbots.link
2. **Never trust AI claims** - Always verify with real PROD tests. Assume false positives until PROD verified.
3. **Tests MUST use UI interactions** - Click buttons, fill forms, navigate pages - real user actions only
4. **Full test coverage** - Include ALL UI controls, features, and user journeys (CUJs)
5. **Organize tests** - Keep in `tests/` dir, results in `test-results/`
6. **Extend existing tests** - Before running, update relevant tests to cover new features/fixes
7. **Screenshots required** - MUST include screenshot of primary action being tested (e.g., generated content)
8. **Chromium only** - `--project=chromium` flag required
9. **Stop on failure** - If ANY test fails, STOP immediately. Fix issue, then resume cycle.
10. **Resolution sequence**:
	- First: iPad mini (768x1024) - REQUIRED starting point
	- Second: Pixel 7 (only after all iPad tests pass)
	- Never exceed 1116px width
11. **Write compliant tests** - All new tests must follow these rules
12. **100% pass required** - Fix all issues and retest until EVERY test passes on PROD
13. Test all:
	1. All must comply to `pow3r.law.md` policies
	2. Deployed site
	3. APIs
	4. MCP
	5. Abacus.ai Platform
	6. Config Compliance
		1. App
		2. Components
		3. Data services
		4. API
		5. Workflow
		6. Knowledge Graph
		7. Vector Base
	7. Deployment process
		1. Make sure build succeeded
		2. Ensure custom domains set
	8. Confirm merged to Github
		1. No Branches and PRs left open
	9. Chrome Extension
14. Do NOT create summary, complete, issue, or fix reports. 
15. Do not create your own report template extension.
16. Be useful and proactive in finding out why there are issues and how to resolve.
    1.  If you think a feature that has UI isn't implemented look into it first.
    3.  If you have ACL/Auth/API-Key issues be diligent. Check in 
        1.  `.cursor/` dir, 
        2.  Cursor Secret Store, 
        3.  GitHub Secret store, 
        4.  Cursor Apps Integrations, 
        5.  CloudFlare Secret store, 
        6.  Abacus Secret store,
        7.  local env
        8.  terminal
17. **MANDATORY FINAL RESPONSE** - After completing deployment and achieving 100% test pass rate, provide the following template filled out with REAL validated data:
```response_template
**Understanding:**
[Agent's summary of the user's request]

**Plan:**
[Agent's step-by-step plan for completing the task]

**Risks & Mitigations:**
[Any potential risks the agent has identified and how it plans to mitigate them]

**Compliance score:** {num}%

**CloudFlare**
	DEV url: {}.pages.dev // Link
	PROD Custom url: {}.superbots.link // Link
**Screenshot:** {path/file} // Link
**Image reviewed:** {yes/no==FAIL}

**Deployment confirmed:** {yes/no}
**Pushed to Github:** {yes/no}

**Intent of user request (from last input in chat):**
Project goal:  
Current job goal: 
Chat goal: 

**Success:** {num}%
**Confidence:** {num}%
**Number Tests Created/Modified:** {num}
**Number Tests In the Suite Ran:** {num}/{total_in_suite}
**Number Passed:** {num}
**Number Failed:** {num}
**Number Failed that you fixed:** {num}
**Total Failed tests remaining:** {0/num==FAILED}
  If FAILED, why failed to comply to policies: {the_ai_compliance_enforcement_issue} + {solution} + {ACL_or _conflicting_rule_that_prevents_you_from_implementing_solution}
**Did you comply to `.cursor/` docs:** {no/yes==FAILED}
**Did you try to give the user something you could do?** {no/yes==FAILED}

**Workflow diagrams of user journey the Playwright tests ran to test and validate {features/fixes/your-work} with UI interactions:** 

```

## Formatting
1. Do NOT use emojis in your responses and documentation EXCEPT the following, and only when it improves communication and legibility: Done/Not-done: ☑,❌ (solution required *DONE IS NOT PERMITTED IN DOCUMENTS, ONLY CHATS). Status only: 🔴 Blocked (ACL? Why!?), 🟡 In-progress (rare due to full auto, ex. running in background), 🟣 Not-started (rare due to full auto, ex. Recommendation that needs decision), ⚪️ Complete (and tested).
2.  Do not use emojis outside of policies.
 
## Style
1. Do NOT use emojis in the application, EVER. Use Icons.
