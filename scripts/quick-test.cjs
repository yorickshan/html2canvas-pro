/**
 * 快速功能测试
 * 使用 Puppeteer 自动验证重构后的功能
 */

const puppeteer = require('puppeteer');

async function runQuickTest() {
    console.log('🚀 启动自动化功能测试...\n');
    
    let browser;
    
    try {
        // 尝试使用系统Chrome
        const executablePath = process.platform === 'darwin' 
            ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
            : process.platform === 'linux'
            ? '/usr/bin/google-chrome'
            : 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
        
        browser = await puppeteer.launch({
            headless: true,
            executablePath,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        console.log('✅ 浏览器启动成功\n');
        
        const page = await browser.newPage();
        
        // 监听控制台消息
        const logs = [];
        const errors = [];
        
        page.on('console', msg => {
            const text = msg.text();
            logs.push(text);
            if (msg.type() === 'error') {
                // 忽略资源404错误（非关键）
                if (!text.includes('404') && !text.includes('File not found')) {
                    errors.push(text);
                }
            }
        });
        
        page.on('pageerror', error => {
            errors.push(error.message);
        });
        
        console.log('📄 加载测试页面...');
        await page.goto('http://localhost:8899/demo/refactoring-test.html', {
            waitUntil: 'networkidle0',
            timeout: 30000
        });
        
        console.log('✅ 页面加载完成\n');
        
        // 等待页面完全加载
        await page.waitForSelector('.button', { timeout: 5000 });
        
        console.log('🧪 运行所有测试...\n');
        
        // 点击运行所有测试按钮
        await page.click('button[onclick="runAllTests()"]');
        
        // 等待测试完成（最多60秒）
        await page.waitForFunction(
            () => {
                const status = document.querySelector('#status-panel .status');
                return status && status.textContent.includes('所有测试完成');
            },
            { timeout: 60000 }
        );
        
        console.log('⏳ 测试执行完成，收集结果...\n');
        
        // 等待额外2秒确保所有日志输出
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // 获取测试结果
        const results = await page.evaluate(() => {
            const statusEl = document.querySelector('#status-panel .status');
            const status = statusEl ? statusEl.textContent : '';
            const isPassed = statusEl && statusEl.classList.contains('pass');
            
            const logEntries = Array.from(document.querySelectorAll('.log-entry'))
                .map(el => ({
                    text: el.textContent,
                    isError: el.classList.contains('error'),
                    isSuccess: el.classList.contains('success')
                }));
            
            const canvases = document.querySelectorAll('#canvas-results canvas');
            
            return {
                status,
                isPassed,
                logCount: logEntries.length,
                errorCount: logEntries.filter(e => e.isError).length,
                successCount: logEntries.filter(e => e.isSuccess).length,
                canvasCount: canvases.length,
                logs: logEntries
            };
        });
        
        // 输出结果
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('  测试结果');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        
        console.log(`状态: ${results.status}`);
        console.log(`通过: ${results.isPassed ? '✅ 是' : '❌ 否'}`);
        console.log(`Canvas生成: ${results.canvasCount}个`);
        console.log(`日志条目: ${results.logCount}条`);
        console.log(`成功: ${results.successCount}条`);
        console.log(`错误: ${results.errorCount}条`);
        console.log(`JS错误: ${errors.length}条\n`);
        
        if (errors.length > 0) {
            console.log('❌ JavaScript错误:');
            errors.forEach(err => console.log(`   ${err}`));
            console.log('');
        }
        
        // 显示关键日志
        console.log('📝 关键测试日志:\n');
        const keyLogs = results.logs.filter(log => 
            log.isSuccess || log.isError || 
            log.text.includes('测试通过') || 
            log.text.includes('测试失败') ||
            log.text.includes('完成')
        );
        
        keyLogs.forEach(log => {
            const prefix = log.isError ? '❌' : log.isSuccess ? '✅' : '📌';
            console.log(`${prefix} ${log.text}`);
        });
        
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('  总结');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        
        if (results.isPassed && results.errorCount === 0 && errors.length === 0) {
            console.log('🎉 所有测试通过！');
            console.log('✅ 重构后功能正常');
            console.log('✅ 无JavaScript错误');
            console.log('✅ 所有渲染器工作正常');
            console.log('\n重构成功！可以准备发布！🚀\n');
            return { success: true, results };
        } else {
            console.log('⚠️  测试完成，但发现问题：');
            if (!results.isPassed) console.log('   - 测试状态未通过');
            if (results.errorCount > 0) console.log(`   - ${results.errorCount}个测试错误`);
            if (errors.length > 0) console.log(`   - ${errors.length}个JavaScript错误`);
            console.log('\n需要修复问题！\n');
            return { success: false, results, errors };
        }
        
    } catch (error) {
        console.error('\n❌ 测试执行失败:', error.message);
        console.error('\n可能的原因:');
        console.error('1. Chrome浏览器未安装');
        console.error('2. 测试服务器未运行 (http://localhost:8899)');
        console.error('3. 页面加载超时');
        console.error('\n建议: 手工打开浏览器测试');
        return { success: false, error: error.message };
    } finally {
        if (browser) {
            await browser.close();
            console.log('✅ 浏览器已关闭\n');
        }
    }
}

// 运行测试
runQuickTest()
    .then(result => {
        process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
