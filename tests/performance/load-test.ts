import { performance } from 'perf_hooks';

interface PerformanceResult {
  operation: string;
  averageTime: number;
  minTime: number;
  maxTime: number;
  iterations: number;
  opsPerSecond: number;
}

export class PerformanceTester {
  private results: PerformanceResult[] = [];

  async benchmark(
    name: string,
    operation: () => Promise<any> | any,
    iterations: number = 100
  ): Promise<PerformanceResult> {
    const times: number[] = [];
    
    console.log(`🔄 Running benchmark: ${name} (${iterations} iterations)`);
    
    // Warm up
    for (let i = 0; i < 5; i++) {
      await operation();
    }
    
    // Actual benchmark
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await operation();
      const end = performance.now();
      times.push(end - start);
    }
    
    const averageTime = times.reduce((a, b) => a + b, 0) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const opsPerSecond = 1000 / averageTime;
    
    const result: PerformanceResult = {
      operation: name,
      averageTime: Math.round(averageTime * 100) / 100,
      minTime: Math.round(minTime * 100) / 100,
      maxTime: Math.round(maxTime * 100) / 100,
      iterations,
      opsPerSecond: Math.round(opsPerSecond)
    };
    
    this.results.push(result);
    
    console.log(`✅ ${name}:`);
    console.log(`   Average: ${result.averageTime}ms`);
    console.log(`   Min/Max: ${result.minTime}ms / ${result.maxTime}ms`);
    console.log(`   Ops/sec: ${result.opsPerSecond}`);
    
    return result;
  }

  async benchmarkValidation() {
    const { validateFormData, communitySignupSchema } = await import('~/lib/validation.server');
    
    await this.benchmark('Form validation (valid data)', () => {
      const formData = new FormData();
      formData.append('email', 'test@example.com');
      formData.append('name', 'John Doe');
      formData.append('experienceLevel', '75');
      return validateFormData(communitySignupSchema, formData);
    }, 1000);

    await this.benchmark('Form validation (invalid data)', () => {
      const formData = new FormData();
      formData.append('email', 'invalid');
      formData.append('name', 'John123');
      return validateFormData(communitySignupSchema, formData);
    }, 1000);
  }

  async benchmarkDirectusOperations() {
    // Mock Directus operations for performance testing
    await this.benchmark('Mock Directus query', async () => {
      // Simulate database query time
      await new Promise(resolve => setTimeout(resolve, Math.random() * 10));
      return { id: 1, email: 'test@example.com' };
    }, 100);
  }

  async benchmarkEmailOperations() {
    // Mock email operations for performance testing
    await this.benchmark('Mock email send', async () => {
      // Simulate email send time
      await new Promise(resolve => setTimeout(resolve, Math.random() * 50));
      return { messageId: 'test-123' };
    }, 50);
  }

  getResults(): PerformanceResult[] {
    return this.results;
  }

  generateReport(): string {
    let report = '\n📊 Performance Test Report\n';
    report += '=' .repeat(50) + '\n\n';
    
    this.results.forEach(result => {
      report += `${result.operation}:\n`;
      report += `  Average Time: ${result.averageTime}ms\n`;
      report += `  Min/Max: ${result.minTime}ms / ${result.maxTime}ms\n`;
      report += `  Operations/sec: ${result.opsPerSecond}\n`;
      
      // Add performance warnings
      if (result.averageTime > 100) {
        report += `  ⚠️  WARNING: Average time exceeds 100ms threshold\n`;
      }
      if (result.maxTime > 500) {
        report += `  🚨 CRITICAL: Max time exceeds 500ms threshold\n`;
      }
      
      report += '\n';
    });
    
    return report;
  }
}

// Quick performance check function
export async function quickPerformanceCheck(): Promise<void> {
  const tester = new PerformanceTester();
  
  console.log('🚀 Starting quick performance check...\n');
  
  await tester.benchmarkValidation();
  await tester.benchmarkDirectusOperations();
  await tester.benchmarkEmailOperations();
  
  console.log(tester.generateReport());
}

// Export for use in tests
export default PerformanceTester; 