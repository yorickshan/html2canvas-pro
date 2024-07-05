const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs/promises');
const express = require('express');
const reftests = require('../tests/reftests');

const app = express();
app.use('/', express.static(path.resolve(__dirname, '../')));

const listener = app.listen(0, async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    page.setViewport({ width: 800, height: 600 }); // Set a desired viewport size

    const tests = Object.keys(reftests.testList);
    for (const filename of tests) {
        const url = `http://localhost:${listener.address().port}/${filename}?reftest&run=false`;
        try {
            await page.goto(url);
            // Wait for page to load (adjust wait strategy as needed)
            await page.waitForSelector('body'); // Example wait strategy

            const screenshot = await page.screenshot({ fullPage: true });
            await fs.writeFile(path.resolve(__dirname, `..${filename.replace(/\.html$/i, '.png')}`), screenshot);
        } catch (error) {
            console.error(`Error processing ${filename}:`, error);
            // Handle errors appropriately (e.g., log, retry)
        }
    }

    await browser.close();
    process.exit(0);
});
