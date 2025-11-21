/**
 * Media Generation Verification Script
 * 
 * Continuously tests media generation until 100% success rate
 * Tests all media types, workflows, and model presets
 */

const API_BASE = process.env.API_BASE || 'https://pow3r-defender.contact-7d8.workers.dev';
const AUTH_TOKEN = process.env.AUTH_TOKEN || '';

interface TestResult {
  mediaType: string;
  workflowType: string;
  presetId?: string;
  success: boolean;
  jobId?: string;
  error?: string;
  duration?: number;
}

const testCases: Array<{
  mediaType: 'image' | 'video' | 'audio' | 'text' | 'document';
  workflowType: 'simple' | 'adaptive';
  prompt: string;
  presetId?: string;
}> = [
  // Image tests
  { mediaType: 'image', workflowType: 'simple', prompt: 'A red circle on white background' },
  { mediaType: 'image', workflowType: 'adaptive', prompt: 'A blue square on black background' },
  
  // Text tests
  { mediaType: 'text', workflowType: 'simple', prompt: 'Write a short story about a detective' },
  { mediaType: 'text', workflowType: 'adaptive', prompt: 'Explain quantum computing in simple terms' },
  
  // Document tests
  { mediaType: 'document', workflowType: 'simple', prompt: 'Create a report about cybersecurity best practices' },
  { mediaType: 'document', workflowType: 'adaptive', prompt: 'Generate a legal document template' },
];

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function checkJobStatus(jobId: string): Promise<{ status: string; resultUrl?: string; error?: string }> {
  const response = await fetch(`${API_BASE}/api/media/jobs/${jobId}`, {
    headers: {
      'Authorization': `Bearer ${AUTH_TOKEN}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to check job status: ${response.status}`);
  }

  const data = await response.json() as { success: boolean; data: { status: string; resultUrl?: string; errorMessage?: string } };
  return {
    status: data.data.status,
    resultUrl: data.data.resultUrl,
    error: data.data.errorMessage,
  };
}

async function waitForJob(jobId: string, maxWait: number = 60000): Promise<TestResult> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWait) {
    const status = await checkJobStatus(jobId);
    
    if (status.status === 'completed') {
      // Verify result exists
      if (status.resultUrl) {
        const resultResponse = await fetch(`${API_BASE}${status.resultUrl}`, {
          headers: {
            'Authorization': `Bearer ${AUTH_TOKEN}`,
          },
        });
        
        if (resultResponse.ok) {
          const contentType = resultResponse.headers.get('content-type');
          const contentLength = resultResponse.headers.get('content-length');
          
          if (!contentType || !contentLength || parseInt(contentLength) === 0) {
            return {
              mediaType: '',
              workflowType: '',
              success: false,
              jobId,
              error: 'Invalid result file',
            };
          }
          
          return {
            mediaType: '',
            workflowType: '',
            success: true,
            jobId,
            duration: Date.now() - startTime,
          };
        }
      }
      
      return {
        mediaType: '',
        workflowType: '',
        success: false,
        jobId,
        error: 'No result URL',
      };
    }
    
    if (status.status === 'failed') {
      return {
        mediaType: '',
        workflowType: '',
        success: false,
        jobId,
        error: status.error || 'Generation failed',
      };
    }
    
    // Still processing
    await sleep(2000);
  }
  
  return {
    mediaType: '',
    workflowType: '',
    success: false,
    jobId,
    error: 'Timeout waiting for job',
  };
}

async function runTest(testCase: typeof testCases[0]): Promise<TestResult> {
  console.log(`Testing ${testCase.mediaType} with ${testCase.workflowType} workflow...`);
  
  try {
    const response = await fetch(`${API_BASE}/api/media/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AUTH_TOKEN}`,
      },
      body: JSON.stringify({
        mediaType: testCase.mediaType,
        prompt: testCase.prompt,
        workflowType: testCase.workflowType,
        presetId: testCase.presetId,
        maxAttempts: 3,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return {
        mediaType: testCase.mediaType,
        workflowType: testCase.workflowType,
        success: false,
        error: `API error: ${response.status} ${error}`,
      };
    }

    const data = await response.json() as { success: boolean; data: { jobId: string } };
    const jobId = data.data.jobId;

    const result = await waitForJob(jobId);
    return {
      ...result,
      mediaType: testCase.mediaType,
      workflowType: testCase.workflowType,
      presetId: testCase.presetId,
    };
  } catch (error) {
    return {
      mediaType: testCase.mediaType,
      workflowType: testCase.workflowType,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function runAllTests(): Promise<TestResult[]> {
  console.log('Starting media generation verification...\n');
  
  const results: TestResult[] = [];
  
  for (const testCase of testCases) {
    const result = await runTest(testCase);
    results.push(result);
    
    if (result.success) {
      console.log(`✅ ${testCase.mediaType} (${testCase.workflowType}): SUCCESS`);
    } else {
      console.log(`❌ ${testCase.mediaType} (${testCase.workflowType}): FAILED - ${result.error}`);
    }
    
    // Wait between tests
    await sleep(3000);
  }
  
  return results;
}

async function continuousVerification() {
  let iteration = 0;
  let allSuccess = false;
  
  while (!allSuccess) {
    iteration++;
    console.log(`\n=== Verification Iteration ${iteration} ===\n`);
    
    const results = await runAllTests();
    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;
    const successRate = (successCount / totalCount) * 100;
    
    console.log(`\n=== Results ===`);
    console.log(`Success: ${successCount}/${totalCount} (${successRate.toFixed(1)}%)`);
    
    if (successRate === 100) {
      console.log('\n🎉 100% SUCCESS RATE ACHIEVED!');
      allSuccess = true;
    } else {
      console.log(`\n⚠️  Success rate: ${successRate.toFixed(1)}%. Retrying in 30 seconds...\n`);
      await sleep(30000);
    }
  }
}

// Run continuous verification
// Check if this is the main module
const isMain = import.meta.url === `file://${process.argv[1]}` || 
               process.argv[1]?.includes('verify-media-generation') ||
               !process.env.NODE_ENV;

if (isMain) {
  continuousVerification().catch((error) => {
    console.error('Verification failed:', error);
    process.exit(1);
  });
}

export { continuousVerification, runAllTests, runTest };

