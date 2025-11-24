import { Controller, Get, Post, Param } from '@nestjs/common';
import { TestsService } from './tests.service';

@Controller('tests')
export class TestsController {
  constructor(private readonly testsService: TestsService) {}

  // IMPORTANT: More specific routes (with parameters) must come BEFORE less specific routes
  // Otherwise NestJS will match 'run' first and never reach 'run/:suite'
  @Post('run/:suite')
  async runTestSuite(@Param('suite') suite: string) {
    return this.testsService.runTestSuite(suite);
  }

  @Post('run')
  async runTests() {
    return this.testsService.runTests();
  }

  @Get('results')
  async getTestResults() {
    return this.testsService.getTestResults();
  }
}

