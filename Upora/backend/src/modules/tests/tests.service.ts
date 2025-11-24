import { Injectable, Logger } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs/promises';

const execAsync = promisify(exec);

@Injectable()
export class TestsService {
  private readonly logger = new Logger(TestsService.name);
  private readonly testResultsPath = path.join(process.cwd(), 'test-results.json');

  async runTests(): Promise<{ success: boolean; results: any[] }> {
    try {
      this.logger.log('Running tests...');
      
      // Run Jest tests with JSON output
      // Increase timeout for tests that might take longer
      const { stdout, stderr } = await execAsync(
        'npm test -- --json --outputFile=test-results.json --no-coverage --testTimeout=30000',
        {
          cwd: process.cwd(),
          maxBuffer: 10 * 1024 * 1024, // 10MB buffer
          timeout: 120000, // 120 second timeout for execAsync (all tests take longer)
        }
      );

      // Read the test results file
      let results: any = {};
      try {
        const resultsContent = await fs.readFile(this.testResultsPath, 'utf-8');
        results = JSON.parse(resultsContent);
      } catch (error) {
        this.logger.warn('Could not read test results file, parsing stdout');
        // Try to parse stdout if file doesn't exist
        try {
          results = JSON.parse(stdout);
        } catch (e) {
          this.logger.error('Failed to parse test results');
          return {
            success: false,
            results: [],
          };
        }
      }

      // Transform Jest results to our format
      const transformedResults = this.transformJestResults(results);

      return {
        success: results.numFailedTests === 0,
        results: transformedResults,
      };
    } catch (error: any) {
      this.logger.error(`Error running tests: ${error.message}`);
      return {
        success: false,
        results: [],
      };
    }
  }

  async runTestSuite(suiteName: string): Promise<{ success: boolean; results: any[] }> {
    try {
      this.logger.log(`Running test suite: ${suiteName}`);
      
      // Map suite names to test file patterns
      const suitePatterns: { [key: string]: string } = {
        'interaction-types-service': 'interaction-types.service.spec',
        'file-storage-service': 'file-storage.service.spec',
        'interaction-types-controller': 'interaction-types.controller.spec',
        'ai-assistant-iframe': 'ai-assistant-iframe.spec',
        'ai-assistant-service': 'ai-assistant.service.spec',
        'app-controller': 'app.controller.spec',
        'lesson-data-persistence': 'lesson-data-persistence.spec',
      };

      const pattern = suitePatterns[suiteName] || suiteName;
      
      // Run Jest tests for specific file pattern
      // Save to the main test-results.json file so Refresh Results works
      // Note: Jest uses --testPathPatterns (plural) as of newer versions
      // Increase timeout for tests that might take longer (e.g., AI Assistant Service tests)
      const { stdout, stderr } = await execAsync(
        `npm test -- --json --outputFile=test-results.json --no-coverage --testPathPatterns="${pattern}" --testTimeout=30000`,
        {
          cwd: process.cwd(),
          maxBuffer: 10 * 1024 * 1024, // 10MB buffer
          timeout: 90000, // 90 second timeout for execAsync to prevent hanging
        }
      );

      // Read the test results file
      let results: any = {};
      try {
        const resultsContent = await fs.readFile(this.testResultsPath, 'utf-8');
        results = JSON.parse(resultsContent);
        this.logger.log(`Read test results from ${this.testResultsPath}`);
      } catch (error) {
        this.logger.warn('Could not read test results file, parsing stdout');
        try {
          results = JSON.parse(stdout);
        } catch (e) {
          this.logger.error('Failed to parse test results');
          return {
            success: false,
            results: [],
          };
        }
      }

      // Transform Jest results to our format
      const transformedResults = this.transformJestResults(results);

      return {
        success: results.numFailedTests === 0,
        results: transformedResults,
      };
    } catch (error: any) {
      this.logger.error(`Error running test suite ${suiteName}: ${error.message}`);
      return {
        success: false,
        results: [],
      };
    }
  }

  async getTestResults(): Promise<{ success: boolean; results: any[] }> {
    try {
      this.logger.log(`Loading test results from ${this.testResultsPath}`);
      const resultsContent = await fs.readFile(this.testResultsPath, 'utf-8');
      const results = JSON.parse(resultsContent);
      const transformedResults = this.transformJestResults(results);

      this.logger.log(`Loaded ${transformedResults.length} test result files`);
      
      return {
        success: results.numFailedTests === 0,
        results: transformedResults,
      };
    } catch (error: any) {
      this.logger.warn(`Could not load test results: ${error.message}`);
      // Return empty results instead of failing completely
      return {
        success: false,
        results: [],
      };
    }
  }

  private transformJestResults(jestResults: any): any[] {
    if (!jestResults.testResults) {
      return [];
    }

    return jestResults.testResults.map((testFile: any) => ({
      name: path.basename(testFile.name, path.extname(testFile.name)),
      testFilePath: testFile.name,
      tests: testFile.assertionResults.map((test: any) => ({
        name: test.title,
        status: test.status,
        duration: test.duration,
        failureMessages: test.failureMessages || [],
        // Include full error message for better debugging
        message: test.failureMessages?.join('\n') || test.failureMessage || (test.status === 'failed' ? 'Test assertion failed' : undefined),
        error: test.failureMessages?.[0] || test.failureMessage || (test.status === 'failed' ? 'Test assertion failed' : undefined),
      })),
      status: testFile.status,
      numPassingTests: testFile.numPassingTests,
      numFailingTests: testFile.numFailingTests,
    }));
  }
}

