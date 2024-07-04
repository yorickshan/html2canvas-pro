const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs/promises'); // Using promises for cleaner async/await syntax
const express = require('express');
const reftests = require('../tests/reftests');

const app = express();
app.use('/', express.static(path.resolve(__dirname, '../')));

const listener = app.listen(0, async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    const tests = Object.keys(reftests.testList);
    for (const filename of tests) {
        const url = `http://localhost:${listener.address().port}/${filename}?reftest&run=false`;
        await page.goto(url);

        // Capture the full page screenshot (adjust clipping as needed)
        const screenshot = await page.screenshot({ fullPage: true });

        // Save screenshot with modified filename
        await fs.writeFile(path.resolve(__dirname, `..${filename.replace(/\.html$/i, '.png')}`), screenshot);
    }

    await browser.close();
    process.exit(0);
});
