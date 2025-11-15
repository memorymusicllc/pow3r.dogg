# Pow3r Guardian System

> **Constitutional Compliance Enforcement through Automated Validation**

## Overview

The Pow3r Guardian is an automated validation system that enforces constitutional compliance and code quality standards across all Pow3r ecosystem repositories. It operates as a GitHub Actions workflow that runs on every pull request and push to main branches.

## Core Principles

1. **No Mock Code**: All code must be production-ready. No placeholders, fake data, or theatrical implementations.
2. **Schema Compliance**: All configuration files must validate against their respective schemas.
3. **Full Test Coverage**: All features must have comprehensive E2E tests that prove functionality.
4. **Constitutional Adherence**: All changes must comply with the Pow3r Constitution (`laws/pow3r.v3.law.md`).

## Guardian Gates

The Guardian enforces five gates that must all pass before code can be merged:

### Gate 1: Schema Validation
**Purpose**: Ensures all configuration files conform to the defined schema.

**What it checks**:
- `configs/pow3r.v3.config.json`
- `configs/pow3r.v3.status.json`
- `data/pow3r.v3.data.json`

**Validation tool**: AJV (Another JSON Validator) CLI

**Failure conditions**:
- Missing required fields
- Type mismatches
- Schema violations
- Invalid JSON syntax

### Gate 2: Mock Code Scan
**Purpose**: Prevents placeholder or theatrical code from being merged.

**Prohibited patterns**:
- `TODO:`
- `FIXME:`
- `placeholder`
- `fakeData`
- `mockData`
- `fake-`
- `mock-`
- `test-only`

**Scope**: `./src/` directory

**Failure conditions**:
- Any prohibited pattern found in source code

### Gate 3: Regression & Feature Tests
**Purpose**: Ensures all functionality works as expected.

**What it runs**: Complete Playwright E2E test suite across all projects:
- Chromium
- Firefox
- WebKit
- iPad Mini
- iPad Pro

**Test command**: `npm run test:e2e:all`

**Failure conditions**:
- Any test failure
- Test timeout
- Missing test coverage for new features

### Gate 4: Configuration Integrity
**Purpose**: Verifies all required configuration files exist and are valid.

**Required files**:
- `configs/pow3r.v3.config.json`
- `configs/pow3r.v3.schema.json`
- `configs/pow3r.v3.status.json`
- `data/pow3r.v3.data.json`

**Checks**:
- File existence
- Valid JSON syntax
- Non-empty files

### Gate 5: Constitutional Compliance
**Purpose**: Ensures the Pow3r Constitution is present and enforced.

**What it checks**:
- `laws/pow3r.v3.law.md` exists
- Constitutional law file is not empty
- Law version matches ecosystem version

## Repository-Specific Gates

### For `pow3r.writer`: Media Validation
**Purpose**: Proves that media generation (images, videos, audio) actually works and produces real assets.

**Implementation**: Custom validation script at `scripts/validate-media-generation.js`

**What it must do**:
1. Trigger actual media generation through the API
2. Verify the returned asset is real (not a placeholder URL)
3. Download and validate the file:
   - Check file size > 0
   - Verify MIME type matches expected format
   - Validate file headers
   - Check image dimensions (if applicable)
   - Verify video/audio duration (if applicable)

**Failure conditions**:
- Placeholder URLs returned
- Zero-byte files
- Invalid file formats
- Mock or fake media

## Implementation Guide

### For All Repositories

1. **Copy the Guardian workflow**:
```bash
mkdir -p .github/workflows
cp path/to/guardian.yml .github/workflows/
```

2. **Ensure required files exist**:
   - Schema files in `configs/`
   - Constitutional law in `laws/`
   - Test suite configured

3. **Update package.json**:
```json
{
  "scripts": {
    "test:e2e:all": "playwright test"
  }
}
```

4. **Configure branch protection**:
   - Require Guardian checks to pass
   - Prevent force pushes
   - Require pull request reviews

### For `pow3r.writer` Specifically

Create `scripts/validate-media-generation.js`:

```javascript
#!/usr/bin/env node
/**
 * Media Validation Script - The "Shock Collar"
 * Proves that media generation actually works
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync, statSync } from 'fs';
import { basename } from 'path';

async function validateMediaGeneration() {
  console.log('🎬 Starting media validation...');
  
  // 1. Generate a test image
  console.log('📸 Generating test image...');
  const imageResponse = await fetch('http://localhost:8787/api/generate-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: 'A red circle',
      model: 'flux-schnell'
    })
  });
  
  if (!imageResponse.ok) {
    throw new Error(`Image generation failed: ${imageResponse.status}`);
  }
  
  const imageData = await imageResponse.json();
  
  // 2. Verify it's not a placeholder
  const prohibitedPatterns = [
    'placeholder',
    'example.com',
    'fake',
    'mock',
    'test-url',
    'dummy'
  ];
  
  for (const pattern of prohibitedPatterns) {
    if (imageData.url && imageData.url.includes(pattern)) {
      throw new Error(`Prohibited pattern "${pattern}" found in URL: ${imageData.url}`);
    }
  }
  
  // 3. Download and validate the actual file
  console.log('⬇️  Downloading generated media...');
  const fileResponse = await fetch(imageData.url);
  const fileBuffer = await fileResponse.arrayBuffer();
  
  if (fileBuffer.byteLength === 0) {
    throw new Error('Generated file is empty (0 bytes)');
  }
  
  if (fileBuffer.byteLength < 1000) {
    throw new Error(`Generated file suspiciously small: ${fileBuffer.byteLength} bytes`);
  }
  
  // 4. Verify file headers (PNG signature)
  const uint8Array = new Uint8Array(fileBuffer);
  const pngSignature = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
  const jpegSignature = [0xFF, 0xD8, 0xFF];
  
  const isPNG = pngSignature.every((byte, i) => uint8Array[i] === byte);
  const isJPEG = jpegSignature.every((byte, i) => uint8Array[i] === byte);
  
  if (!isPNG && !isJPEG) {
    throw new Error('Generated file is not a valid PNG or JPEG');
  }
  
  console.log('✅ Media validation PASSED');
  console.log(`   - File size: ${fileBuffer.byteLength} bytes`);
  console.log(`   - Format: ${isPNG ? 'PNG' : 'JPEG'}`);
  console.log(`   - URL: ${imageData.url}`);
  
  return true;
}

// Run validation
validateMediaGeneration()
  .then(() => {
    console.log('🎉 All media validation checks passed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Media validation FAILED:');
    console.error(error.message);
    process.exit(1);
  });
```

## CI/CD Integration

### GitHub Branch Protection Rules

Configure these settings for `main` branch:

1. **Require status checks to pass**:
   - `validate / Gate 1: Validate Configuration Files Against Schema`
   - `validate / Gate 2: Scan for Mock/Placeholder Code`
   - `validate / Gate 3: Run Full Playwright Test Suite`
   - `validate / Gate 4: Verify Configuration Integrity`
   - `validate / Gate 5: Verify Constitutional Compliance`

2. **Require branches to be up to date**: ✅ Enabled

3. **Require pull request reviews**: 
   - Minimum: 1 reviewer
   - Dismiss stale reviews: ✅ Enabled

4. **Restrictions**:
   - Restrict pushes to specific users/teams
   - No force pushes
   - No deletions

## Local Development

Run Guardian checks locally before pushing:

```bash
# Run all checks
npm run guardian:check

# Run individual gates
npm run guardian:schema
npm run guardian:mock-scan
npm run guardian:test
npm run guardian:config
npm run guardian:law
```

Add to `package.json`:

```json
{
  "scripts": {
    "guardian:check": "npm run guardian:schema && npm run guardian:mock-scan && npm run guardian:test && npm run guardian:config && npm run guardian:law",
    "guardian:schema": "ajv validate -s ./configs/pow3r.v3.schema.json -d ./configs/*.json",
    "guardian:mock-scan": "! grep -rE 'TODO:|placeholder|fakeData|mockData' ./src/",
    "guardian:test": "npm run test:e2e:all",
    "guardian:config": "test -f configs/pow3r.v3.config.json && test -f configs/pow3r.v3.schema.json",
    "guardian:law": "test -s laws/pow3r.v3.law.md"
  }
}
```

## Troubleshooting

### Gate 1 Failures: Schema Validation

**Problem**: Configuration files don't match schema.

**Solution**:
1. Check error message for specific field
2. Review schema at `configs/pow3r.v3.schema.json`
3. Update configuration to match required structure
4. Use JSON Schema validators for IDE support

### Gate 2 Failures: Mock Code Detected

**Problem**: Prohibited patterns found in source code.

**Solution**:
1. Review flagged files
2. Replace placeholders with real implementations
3. Remove TODO comments (create GitHub Issues instead)
4. Implement proper error handling instead of fake data

### Gate 3 Failures: Tests Failing

**Problem**: E2E tests not passing.

**Solution**:
1. Run tests locally: `npm run test:e2e:ui`
2. Review test output and screenshots
3. Fix implementation bugs
4. Update tests if requirements changed
5. Never disable or skip failing tests

### Gate 4 Failures: Configuration Integrity

**Problem**: Required files missing or invalid.

**Solution**:
1. Ensure all required config files exist
2. Validate JSON syntax with `jq`
3. Check file permissions
4. Verify files are not empty

### Gate 5 Failures: Constitutional Compliance

**Problem**: Law files missing or incomplete.

**Solution**:
1. Ensure `laws/pow3r.v3.law.md` exists
2. Verify constitution is not empty
3. Review constitution for version mismatches
4. Update law files if ecosystem evolved

## Security Considerations

1. **Secret Management**: Guardian workflow does not have access to secrets by default
2. **Token Permissions**: Use minimal GitHub token permissions
3. **Dependency Security**: Regularly update action versions
4. **Audit Logs**: All Guardian runs are logged and auditable

## Future Enhancements

- [ ] Performance benchmarking gate
- [ ] Security vulnerability scanning
- [ ] Dependency license compliance
- [ ] Code coverage thresholds
- [ ] Accessibility testing
- [ ] API contract validation
- [ ] Infrastructure-as-code validation

## Related Documentation

- [Constitutional Law](../laws/pow3r.v3.law.md)
- [Schema Definition](../configs/pow3r.v3.schema.json)
- [Testing Guide](./TESTING.md)
- [Deployment Status](./legacy/DEPLOYMENT_STATUS.md)

---

**Guardian Protocol Version**: 1.0.0  
**Last Updated**: 2025-11-12  
**Maintained By**: Pow3r Core Team

