const puppeteer = require('puppeteer');
const express = require('express');
const path = require('path');

const app = express();
app.use(express.static(path.join(__dirname, '..')));

const server = app.listen(3000, async () => {
  try {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    
    await page.goto('http://localhost:3000/test-browser.html');
    await new Promise(r => setTimeout(r, 2000));
    
    const bodyText = await page.evaluate(() => document.body.innerHTML);
    console.log('BODY:', bodyText);
    
    await browser.close();
  } catch (e) {
    console.error(e);
  } finally {
    server.close();
  }
});
