'use strict';

const puppeteer = require('puppeteer');
const { getTestcases, getResult } = require("./act");
const fs = require("fs");
(async () => {
    // Fetch the testcases from ACT
    let ruleTestInfo = await getTestcases();
    let earlResult = {
        "@context": "https://act-rules.github.io/earl-context.json",
        "@graph": []
    }
    
    // Setup the Puppeteer test environment
    let browser = await puppeteer.launch({ headless: true, ignoreHTTPSErrors: true });
    let pupPage = await browser.newPage();
    await pupPage.setRequestInterception(true);
    pupPage.on('request', request => {
        if (request.isNavigationRequest() && request.redirectChain().length)
            request.abort();
        else
            request.continue();
    });
    pupPage.on('console', message =>
        !message.text().includes("interest-cohort") && console.log(`${message.type().substr(0, 3).toUpperCase()} ${message.text()}`))
    await pupPage.setCacheEnabled(true);
    await pupPage.setViewport({ width: 1280, height: 1024 });

    // Work through the testcases
    for (const ruleId in ruleTestInfo) {
        console.group(`* ${ruleTestInfo[ruleId].label}`);
        for (const testcase of ruleTestInfo[ruleId].testcases) {
            let ext = testcase.url.substring(testcase.url.lastIndexOf("."));
            // if (testcase.testcaseId === "cbf6409b0df0b3b6437ab3409af341587b144969") {
                // Skip
            // } else 
            if (ext === ".html" || ext === ".xhtml") {
                try {
                    // First, load the page
                    if (ruleTestInfo[ruleId].aceRules.length > 0) {
                        // This rule has testcases, run the test
                        console.group(`+ ${testcase.testcaseTitle}: ${testcase.url}`);
                        // Special handling for meta refresh
                        if (testcase.ruleId === "bisz58" || testcase.ruleId === "bc659a") 
                        {
                        //     testcase.testcaseId === "cbf6409b0df0b3b6437ab3409af341587b144969"
                        //     || testcase.testcaseId === "beeaf6f49d37ef2d771effd40bcb3bfc9655fbf4"
                        //     || testcase.testcaseId === "d1bbcc895f6e11010b033578d073138e7c4fc57e"
                        //     || testcase.testcaseId === "d789ff3d0c087c77117a02527e71a646a343d4a3")
                        // {
                            let succeeded = false;
                            while (!succeeded) {
                                try {
                                    await pupPage.goto(testcase.url, { waitUntil: 'domcontentloaded' });
                                    await pupPage._client.send("Page.stopLoading");
                                    let win = await pupPage.evaluate("document");
                                    if (win) {
                                        succeeded = true;
                                    }
                                } catch (err) {
                                }
                            }
                        } else {
                            await pupPage.goto(testcase.url, { waitUntil: 'networkidle2' });
                        }
                    } else {
                        // If no tests, don't bother loading the testcase
                        console.group(`? ${testcase.testcaseTitle}: ${testcase.url}`);
                    }
                    let { assertions, result, issuesFail, issuesPass, issuesReview, issuesAll } = await getResult(pupPage, testcase.ruleId, testcase.testcaseId, ruleTestInfo[ruleId].aceRules);
                    earlResult["@graph"].push({
                        "@type": "TestSubject",
                        "source": `https://www.w3.org/WAI/content-assets/wcag-act-rules/testcases/${ruleId}/${testcase.testcaseId}.html`,
                        "assertions": assertions
                    });
                    if (result === "earl:cantTell" && (testcase.expected === "passed" || testcase.expected === "failed")) {
                        console.log("--Can't tell");
                    } else if (`earl:${testcase.expected}` !== result) {
                        if (result !== "earl:untested") {
                            console.log(`\x1b[31m--Expected ${testcase.expected}, but returned ${result}
Failures: ${JSON.stringify(issuesFail, null, 2)}
Review: ${JSON.stringify(issuesReview, null, 2)}
Pass: ${JSON.stringify(issuesPass, null, 2)}
All: ${JSON.stringify(issuesAll
                                .filter(result => result.value[1] !== "PASS")
                                .map(result => result.ruleId + ":" + result.reasonId + ":" + result.value[1]), null, 2)}\x1b[0m`);
                        }
                    }
                    console.groupEnd();
                } catch (err) {
                    console.error(err);
                }
            }
        }
        console.groupEnd();
    }
    fs.writeFileSync("./act-report-v2.json", JSON.stringify(earlResult, null, 2));
    await browser.close();
})();

