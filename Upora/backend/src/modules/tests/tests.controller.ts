import { Controller, Get, Post } from '@nestjs/common';
import { TestsService } from './tests.service';

@Controller('tests')
export class TestsController {
  constructor(private readonly testsService: TestsService) {}

  @Post('run')
  async runTests() {
    return this.testsService.runTests();
  }

  @Get('results')
  async getTestResults() {
    return this.testsService.getTestResults();
  }
}

