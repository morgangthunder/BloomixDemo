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
      const { stdout, stderr } = await execAsync(
        'npm test -- --json --outputFile=test-results.json --no-coverage',
        {
          cwd: process.cwd(),
          maxBuffer: 10 * 1024 * 1024, // 10MB buffer
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

  async getTestResults(): Promise<{ success: boolean; results: any[] }> {
    try {
      const resultsContent = await fs.readFile(this.testResultsPath, 'utf-8');
      const results = JSON.parse(resultsContent);
      const transformedResults = this.transformJestResults(results);

      return {
        success: results.numFailedTests === 0,
        results: transformedResults,
      };
    } catch (error: any) {
      this.logger.warn(`Could not load test results: ${error.message}`);
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
        failureMessages: test.failureMessages,
        message: test.failureMessages?.join('\n'),
      })),
      status: testFile.status,
      numPassingTests: testFile.numPassingTests,
      numFailingTests: testFile.numFailingTests,
    }));
  }
}

