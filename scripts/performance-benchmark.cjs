/**
 * html2canvas-pro 性能基准测试
 * 
 * 用途: 验证重构后没有性能回归
 * 运行: node scripts/performance-benchmark.js
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// 性能基准配置
const BENCHMARK_CONFIG = {
    iterations: 5,  // 每个测试运行5次
    warmup: 2,      // 预热2次
    timeout: 30000  // 30秒超时
};

// 测试场景
const TEST_SCENARIOS = [
    {
        name: '简单元素',
        selector: '.header',
        expected: 500  // 预期 < 500ms
    },
    {
        name: '背景渲染',
        selector: '#bg-test',
        expected: 800
    },
    {
        name: '边框渲染',
        selector: '#border-test',
        expected: 800
    },
    {
        name: '文本渲染',
        selector: '#text-test',
        expected: 1000
    },
    {
        name: '效果渲染',
        selector: '#effects-test',
        expected: 800
    },
    {
        name: '复合功能',
        selector: '.complex-box',
        expected: 1500
    }
];

class PerformanceBenchmark {
    constructor() {
        this.results = [];
        this.browser = null;
        this.page = null;
    }

    async init() {
        console.log('🚀 启动性能基准测试...\n');
        
        this.browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        this.page = await this.browser.newPage();
        await this.page.goto('http://localhost:8899/demo/refactoring-test.html', {
            waitUntil: 'networkidle0',
            timeout: BENCHMARK_CONFIG.timeout
        });
        
        console.log('✅ 测试页面加载完成\n');
    }

    async runTest(scenario) {
        console.log(`📊 测试: ${scenario.name}`);
        console.log(`   选择器: ${scenario.selector}`);
        console.log(`   预期: < ${scenario.expected}ms`);
        
        const times = [];
        const perfData = [];
        
        // 预热
        console.log(`   预热中...`);
        for (let i = 0; i < BENCHMARK_CONFIG.warmup; i++) {
            await this.page.evaluate((selector) => {
                const element = document.querySelector(selector);
                return html2canvas(element, { logging: false });
            }, scenario.selector);
        }
        
        // 正式测试
        console.log(`   正式测试中 (${BENCHMARK_CONFIG.iterations}次)...`);
        for (let i = 0; i < BENCHMARK_CONFIG.iterations; i++) {
            const result = await this.page.evaluate((selector) => {
                return new Promise(async (resolve) => {
                    const element = document.querySelector(selector);
                    const startTime = performance.now();
                    
                    await html2canvas(element, {
                        logging: false,
                        enablePerformanceMonitoring: true
                    });
                    
                    const endTime = performance.now();
                    const duration = endTime - startTime;
                    
                    resolve({
                        duration,
                        timestamp: Date.now()
                    });
                });
            }, scenario.selector);
            
            times.push(result.duration);
            perfData.push(result);
            
            process.stdout.write(`     #${i + 1}: ${result.duration.toFixed(2)}ms\n`);
        }
        
        // 统计分析
        const stats = this.calculateStats(times);
        const passed = stats.avg < scenario.expected;
        
        console.log(`\n   结果:`);
        console.log(`     平均: ${stats.avg.toFixed(2)}ms`);
        console.log(`     中位数: ${stats.median.toFixed(2)}ms`);
        console.log(`     最小: ${stats.min.toFixed(2)}ms`);
        console.log(`     最大: ${stats.max.toFixed(2)}ms`);
        console.log(`     标准差: ${stats.stdDev.toFixed(2)}ms`);
        console.log(`     ${passed ? '✅ 通过' : '❌ 失败'} (预期 < ${scenario.expected}ms)\n`);
        
        return {
            scenario: scenario.name,
            selector: scenario.selector,
            expected: scenario.expected,
            stats,
            passed,
            rawData: perfData
        };
    }

    calculateStats(times) {
        const sorted = times.slice().sort((a, b) => a - b);
        const sum = times.reduce((a, b) => a + b, 0);
        const avg = sum / times.length;
        const median = sorted[Math.floor(times.length / 2)];
        const min = sorted[0];
        const max = sorted[times.length - 1];
        
        // 标准差
        const variance = times.reduce((acc, val) => acc + Math.pow(val - avg, 2), 0) / times.length;
        const stdDev = Math.sqrt(variance);
        
        return { avg, median, min, max, stdDev };
    }

    async runAll() {
        await this.init();
        
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('  性能基准测试开始');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        
        for (const scenario of TEST_SCENARIOS) {
            const result = await this.runTest(scenario);
            this.results.push(result);
        }
        
        await this.generateReport();
        await this.cleanup();
    }

    async generateReport() {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('  性能测试总结');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        
        const passed = this.results.filter(r => r.passed).length;
        const total = this.results.length;
        const passRate = (passed / total * 100).toFixed(1);
        
        console.log('测试结果:');
        console.log(`  通过: ${passed}/${total} (${passRate}%)`);
        console.log(`  失败: ${total - passed}/${total}\n`);
        
        console.log('详细结果:');
        console.log('┌────────────────┬──────────┬──────────┬────────┐');
        console.log('│ 测试场景       │ 平均耗时 │ 预期     │ 状态   │');
        console.log('├────────────────┼──────────┼──────────┼────────┤');
        
        this.results.forEach(result => {
            const name = result.scenario.padEnd(14);
            const avg = `${result.stats.avg.toFixed(0)}ms`.padEnd(8);
            const exp = `<${result.expected}ms`.padEnd(8);
            const status = result.passed ? '✅ 通过' : '❌ 失败';
            console.log(`│ ${name} │ ${avg} │ ${exp} │ ${status} │`);
        });
        
        console.log('└────────────────┴──────────┴──────────┴────────┘\n');
        
        // 保存JSON报告
        const reportPath = path.join(__dirname, '../performance-report.json');
        const report = {
            timestamp: new Date().toISOString(),
            config: BENCHMARK_CONFIG,
            results: this.results,
            summary: {
                total,
                passed,
                failed: total - passed,
                passRate: parseFloat(passRate)
            }
        };
        
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        console.log(`📄 详细报告已保存: ${reportPath}\n`);
        
        // 生成Markdown报告
        await this.generateMarkdownReport(report);
        
        // 总结
        if (passed === total) {
            console.log('🎉 所有性能测试通过！');
        } else {
            console.log('⚠️  部分性能测试未通过，请检查详细报告');
        }
    }

    async generateMarkdownReport(report) {
        const md = `# 性能基准测试报告

**测试时间**: ${new Date(report.timestamp).toLocaleString('zh-CN')}  
**测试配置**: ${report.config.iterations}次迭代, ${report.config.warmup}次预热  
**总体结果**: ${report.summary.passed}/${report.summary.total} 通过 (${report.summary.passRate}%)

---

## 测试结果

| 测试场景 | 平均耗时 | 中位数 | 最小 | 最大 | 预期 | 状态 |
|---------|---------|--------|------|------|------|------|
${report.results.map(r => {
    const status = r.passed ? '✅ 通过' : '❌ 失败';
    return `| ${r.scenario} | ${r.stats.avg.toFixed(2)}ms | ${r.stats.median.toFixed(2)}ms | ${r.stats.min.toFixed(2)}ms | ${r.stats.max.toFixed(2)}ms | <${r.expected}ms | ${status} |`;
}).join('\n')}

---

## 性能分析

### 最快的操作
${(() => {
    const fastest = report.results.reduce((min, r) => r.stats.avg < min.stats.avg ? r : min);
    return `**${fastest.scenario}**: ${fastest.stats.avg.toFixed(2)}ms`;
})()}

### 最慢的操作
${(() => {
    const slowest = report.results.reduce((max, r) => r.stats.avg > max.stats.avg ? r : max);
    return `**${slowest.scenario}**: ${slowest.stats.avg.toFixed(2)}ms`;
})()}

### 性能稳定性
${report.results.map(r => {
    const cv = (r.stats.stdDev / r.stats.avg * 100).toFixed(1);
    const stability = cv < 10 ? '优秀' : cv < 20 ? '良好' : '一般';
    return `- **${r.scenario}**: 变异系数 ${cv}% (${stability})`;
}).join('\n')}

---

## 结论

${report.summary.passed === report.summary.total 
    ? '✅ 所有性能测试通过，重构没有引入性能回归。' 
    : `⚠️  ${report.summary.failed}个测试未达到预期性能目标，需要优化。`}

---

**生成时间**: ${new Date().toLocaleString('zh-CN')}
`;
        
        const mdPath = path.join(__dirname, '../PERFORMANCE_REPORT.md');
        fs.writeFileSync(mdPath, md);
        console.log(`📄 Markdown报告已保存: ${mdPath}\n`);
    }

    async cleanup() {
        if (this.browser) {
            await this.browser.close();
        }
        console.log('✅ 测试完成，资源已清理\n');
    }
}

// 主函数
async function main() {
    const benchmark = new PerformanceBenchmark();
    
    try {
        await benchmark.runAll();
        process.exit(0);
    } catch (error) {
        console.error('❌ 测试失败:', error);
        await benchmark.cleanup();
        process.exit(1);
    }
}

// 运行
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { PerformanceBenchmark };
