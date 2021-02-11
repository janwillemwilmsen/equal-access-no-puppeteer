'use strict';
import { Browser, Page, launch } from "puppeteer";
import { assertCompliance, getCompliance, stringifyResults } from "accessibility-checker";
import * as path from "path";
import { expect } from "chai";
import { before, after, describe, it } from "mocha";
import { ICheckerReport } from "accessibility-checker/lib/api/IChecker";

let browser: Browser;
let page: Page;

before(async () => {
    try {
        browser = await launch();
        page = await browser.newPage();  
    } catch (e) {
        console.log(e);
    }
    return Promise.resolve();
});

after(async() => {
    await browser.close();
    return Promise.resolve();
});

// Describe this Suite of testscases, describe is a test Suite and 'it' is a testcase.
describe("Hello World Basics", function () {
    it("HomePage", async () => {
        const sample = path.join(__dirname, "..", "sample", "Hello.html");
        await page.goto(`file://${sample}`);

        const result = await getCompliance(page, "HOME");
        const report = result!.report as ICheckerReport;
        expect(assertCompliance(report)).to.equal(0, stringifyResults(report));
    });

    it("Homepage, Show Card", async() => {
        await page.click("#clickMe");
        const result = await getCompliance(page, "HOME_CARD");
        const report = result!.report as ICheckerReport;
        expect(assertCompliance(report)).to.equal(0, stringifyResults(report));
    });
});
//# sourceMappingURL=basic.test.js.map