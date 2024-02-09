window.addEventListener("load", domLoaded);

function domLoaded() {
    document.getElementById("ticker").addEventListener("input", tickerInput);
    document.getElementById("assump-tax").addEventListener("input", assumptionsTaxInput);
    document.getElementById("getDataBtn").addEventListener("click", getHistoricalData);

    // Add event listeners to current-year inputs in valuation table
    const year0InputsList = document.getElementsByClassName("year0-inputs");
    for (let item of year0InputsList) {
        item.addEventListener("input", generateForecast);
    }
}

// Show error message for empty and incorrect assumptions inputs
function assumptionsTaxInput(e) {
    // Get input value from the field that triggered the callback
    const inputId = e.target.id;
    const input = document.getElementById(inputId).value.trim();

    if (isInvalid(input)) {
        showElement("error-tax-rate");
    }
    else {
        hideElement("error-tax-rate");
    }
}

function tickerInput(e) {
    // Extract the text from ticker input that triggered the callback
    const tickerId = e.target.id;
    const ticker = document.getElementById(tickerId).value.trim();

    // Display error message if no ticker is entered
    if (ticker.length === 0) {
        showElement("error-ticker");
    }
    else {
        hideElement("error-ticker");
    }
}

function getHistoricalData() {
    // Get ticker input value
    const ticker = document.getElementById("ticker").value.trim().toUpperCase();
    const taxRateInput = document.getElementById("assump-tax").value.trim();

    // Show error message if ticker field left blank
    if (ticker.length === 0) {
        showElement("error-ticker");
    }
    else if (isInvalid(taxRateInput)) {
        showElement("error-tax-rate");
    }
    else {
        getStockFinancials(ticker);     // Fetch stock data
        hideElement("error-tax-rate");
    }

}

async function getStockFinancials(ticker) {
    // Create URL to access the web API
    const endpoint = "https://www.alphavantage.co/query";
    const apiKey = "ZMU4WUWQX0PWD2YJ";    // back-up apiKey=HWCZ8MM4K05A2PXH
    const queryStringIncome = `function=INCOME_STATEMENT&symbol=${encodeURI(ticker)}&apikey=${apiKey}`;
    const urlIncome = `${endpoint}?${queryStringIncome}`;
    const queryStringBalSheet = `function=BALANCE_SHEET&symbol=${encodeURI(ticker)}&apikey=${apiKey}`;
    const urlBalSheet = `${endpoint}?${queryStringBalSheet}`;
   
    // Send HTTP request to web API for income statement 
    const incomeStatementResponse = await fetch(urlIncome);

    // Send HTTP request to web API for balance sheet
    const balanceSheetResponse = await fetch(urlBalSheet);
    
    // Hide error msg
    hideElement("error-msg-loading"); 

    // API request/response successful
    if (incomeStatementResponse.ok && balanceSheetResponse.ok) {
        const incomeJsonResult = await incomeStatementResponse.json();
        const balSheetJsonResult = await balanceSheetResponse.json();
        responseReceived(ticker, incomeJsonResult, balSheetJsonResult);
    }
    else {
        showElement("error-msg-loading");
        document.getElementById("error-msg-loading").textContent = "Error with API request!";
    }

}

function responseReceived(ticker, incomeJsonResult, balSheetJsonResult) {

    const symbol = balSheetJsonResult["symbol"];    // Get company symbol from financial data

    if (ticker === symbol) {

        // Disable button
        let tickerButton = document.getElementById("getDataBtn");
        tickerButton.disabled = true;

        // Get tax input value
        const taxRate = parseFloat(document.getElementById("assump-tax").value.trim() / 100);

        // Get historical financial statements
        const incomeStatement1 = incomeJsonResult["annualReports"][0];
        const incomeStatement2 = incomeJsonResult["annualReports"][1];
        const incomeStatement3 = incomeJsonResult["annualReports"][2];
        const balanceSheet1 = balSheetJsonResult["annualReports"][0];
        const balanceSheet2 = balSheetJsonResult["annualReports"][1];
        const balanceSheet3 = balSheetJsonResult["annualReports"][2];
        const balanceSheet4 = balSheetJsonResult["annualReports"][3];

        // Replace "company" with ticker symbol in table caption
        showText("company", symbol);

        // Populate historical financial data for the previous 3 years
        generateHistory(incomeStatement1, balanceSheet1, balanceSheet2, taxRate, 1);
        generateHistory(incomeStatement2, balanceSheet2, balanceSheet3, taxRate, 2);
        generateHistory(incomeStatement3, balanceSheet3, balanceSheet4, taxRate, 3);

        // Calculate the average CAPEX to EBITDA ratio and show it in the Assumptions section
        const capex1 = (parseInt(balanceSheet2["propertyPlantEquipment"]) - parseInt(balanceSheet1["propertyPlantEquipment"])) + parseInt(incomeStatement1["depreciation"]);
        const capex2 = (parseInt(balanceSheet3["propertyPlantEquipment"]) - parseInt(balanceSheet2["propertyPlantEquipment"])) + parseInt(incomeStatement2["depreciation"]);
        const capex3 = (parseInt(balanceSheet4["propertyPlantEquipment"]) - parseInt(balanceSheet3["propertyPlantEquipment"])) + parseInt(incomeStatement3["depreciation"]);
        const ebitda1 = parseFloat(incomeStatement1["ebitda"]);
        const ebitda2 = parseFloat(incomeStatement2["ebitda"]);
        const ebitda3 = parseFloat(incomeStatement3["ebitda"]);
        let capexRatioAvg = ( (capex1 / ebitda1) + (capex2 / ebitda2) + (capex3 / ebitda3) ) / 3;
        capexRatioAvg = Math.round(capexRatioAvg * 100);
        const capexInputElem = document.getElementById("capex-avg");
        capexInputElem.removeAttribute("disabled");
        capexInputElem.value = capexRatioAvg;

        // Get total debt, cash, and total outstanding shares from most-recent balance sheet and display in table
        const totalDebt = parseInt(balanceSheet1["shortLongTermDebtTotal"]);
        const totalCash = parseInt(balanceSheet1["cashAndShortTermInvestments"]);
        const totalShares = parseInt(balanceSheet1["commonStockSharesOutstanding"]);
        showText("debt", Math.round(totalDebt / 1000000));
        showText("cash", Math.round(totalCash / 1000000));
        showText("total-shares", Math.round(totalShares / 1000000));
    }
    else {
        showElement("error-msg-loading");
        document.getElementById("error-msg-loading").textContent = `Error loading data for ${ticker}. Check ticker entry!`;
    }
}

// Populate future data based on assumptions and current year inputs
function generateForecast(e) {
    const cellInputId = e.target.id;
    const cellInputVal = parseInt(document.getElementById(cellInputId).value.trim()); // Get cell input value (in $ Millions)
    const cellNameGeneric = cellInputId.substring(0, cellInputId.length-1);

    const ebitGrowthRate = document.getElementById("assump-ebit").value.trim();
    const taxRate = document.getElementById("assump-tax").value.trim();
    const workingCapPct = document.getElementById("assump-working-cap").value.trim();
    const discountRate = document.getElementById("assump-discount-rate").value.trim();
    const terminalRate = document.getElementById("assump-terminal-rate").value.trim();
    const tableCompanyName = document.getElementById("company").textContent;     // Used to check if historical data was already searched

    // Assumption inputs are missing or incorrect format
    if (  isInvalid(ebitGrowthRate) || isInvalid(taxRate) || isInvalid(workingCapPct) || isInvalid(discountRate) || isInvalid(terminalRate) ) {
        alert("Assumptions incomplete!");
    }
    // Company data has not been requested/API call has not been made
    else if (tableCompanyName == "Company") {
        showElement("error-msg-loading");
        document.getElementById("error-msg-loading").textContent = "Retrieve company financial data!"
    }
    // Compute arithmetic based on input figures and generate forecast data
    else {
        hideElement("error-msg-loading");
        const ebitGrowthRateDecimal = parseFloat(ebitGrowthRate) / 100;
        const taxRateDecimal = parseFloat(taxRate) / 100;
        const workingCapDecimal = parseFloat(workingCapPct) / 100;

        // Output ebit, taxes, and ebiat forecast numbers for years[0-5]
        if (cellNameGeneric === "ebit") {
            // Compute and output taxes and ebiat for current year
            let ebitYearX = cellInputVal;
            let taxesYearX = ebitYearX * taxRateDecimal;
            let ebiatYearX = ebitYearX - taxesYearX;
            showText("taxes0", Math.round(taxesYearX));
            showText("ebiat0", Math.round(ebiatYearX));

            // Compute and output ebit, taxes, and ebiat for years[1-5]
            for (let i = 1; i < 6; i++) {
                ebitYearX = ebitYearX * (1 + ebitGrowthRateDecimal);
                showText(cellNameGeneric + i, "$" + Math.round(ebitYearX));

                // Generate tax calculations for each ebit
                taxesYearX = ebitYearX * taxRateDecimal;
                showText("taxes" + i, Math.round(taxesYearX));

                // Compute EBIAT from ebit and taxes 
                ebiatYearX = ebitYearX - taxesYearX;
                showText("ebiat" + i, Math.round(ebiatYearX));
            }
        }

        // Compute and output forecast data for the remaining rows and columns of the table
        if (cellNameGeneric === "deprec") {
            // Display depreciation input value across the forecast
            let deprecAndAmortX = parseInt(cellInputVal);
            for (let i = 1; i < 6; i++) {
                showText("deprec" + i, Math.round(deprecAndAmortX));
            }

            // Compute and display CAPEX forecast for future yrs 
            let capexAvg = document.getElementById("capex-avg").value / 100;
            let ebitdaX = parseInt(document.getElementById("ebit0").value) + deprecAndAmortX;   // EBITDA
            let capexX = Math.round(ebitdaX * capexAvg);    // EBITDA * avg CAPEX (from assumptions via historical data)
            showText("capex0", capexX);

            for (let j = 1; j < 6; j++) {
                let ebitX = document.getElementById("ebit" + j).textContent.substring(1);
                ebitdaX = parseInt(ebitX) + deprecAndAmortX;
                capexX = Math.round(ebitdaX * capexAvg);
                showText("capex" + j, capexX);
            }
            
            // Compute and display change-in-working-capital figures for years[0-5]
            const ebitYear0 = parseInt(document.getElementById("ebit0").value);
            const workingcapYr0 = Math.round(ebitYear0 * workingCapDecimal);
            showText("working-cap0", workingcapYr0);
            
            for (let k = 1; k < 6; k++) {
                let ebitX = document.getElementById("ebit" + k).textContent.substring(1);
                ebitX = parseInt(ebitX);
                let workingCapX = Math.round(ebitX * workingCapDecimal);
                showText("working-cap" + k, workingCapX);
            }

            // Compute and display free cash flow for years[0-5]
            let ebiatX = parseInt(document.getElementById("ebiat0").textContent);
            capexX = document.getElementById("capex0").textContent;
            let freeCashFlowX = ebiatX + deprecAndAmortX - capexX - workingcapYr0;
            showText("fcf0", freeCashFlowX);

            for (let t = 1; t < 6; t++) {
                ebiatX = parseInt(document.getElementById("ebiat" + t).textContent);
                capexX = document.getElementById("capex" + t).textContent;
                let workingCapX = document.getElementById("working-cap" + t).textContent;
                freeCashFlowX = ebiatX + deprecAndAmortX - capexX - workingCapX;
                showText("fcf" + t, freeCashFlowX);
            }

            // Compute and display the discount factor and present values of free cash flows for years[0-6]
            let discountFactorX = 1;
            freeCashFlowX = document.getElementById("fcf0").textContent;
            let pvCashFlowX = freeCashFlowX * discountFactorX;
            showText("disc-factor0", parseFloat(discountFactorX).toFixed(2));
            showText("pv-cashflow0", pvCashFlowX);

            let discountRate = document.getElementById("assump-discount-rate").value;
            discountRate = parseFloat(discountRate) / 100;
            let cumulativePVCashFlows = pvCashFlowX;
            for (let r = 1; r < 6; r++) {
                freeCashFlowX = document.getElementById("fcf" + r).textContent;
                discountFactorX = 1 / (1 + discountRate) ** r;
                pvCashFlowX = freeCashFlowX * discountFactorX;
                cumulativePVCashFlows += pvCashFlowX;                   // sum up pvCashFlowX
                showText("disc-factor" + r, discountFactorX.toFixed(4));
                showText("pv-cashflow" + r, Math.round(pvCashFlowX));
            }

            // Compute terminal value to present value and add to cumulativePVCashFlows
            const freeCashFlowYr6 = parseInt(document.querySelector("#fcf6").value.trim());
            let terminalRateDecimal = parseFloat(terminalRate) / 100;
            const pvTerminalValueAtYr5 = freeCashFlowYr6 / terminalRateDecimal;
            showText("test", discountFactorX); // DELETE AFTER
            const pvTerminalValue = pvTerminalValueAtYr5 * discountFactorX;
            cumulativePVCashFlows += pvTerminalValue;

            // Show Cumulative PV of free cash flow on table
            showText("cumul-pv-cashflow", Math.round(cumulativePVCashFlows));

            // Compute and show Shareholder Value
            const debt = document.getElementById("debt").textContent;
            const cash = document.getElementById("cash").textContent;
            const shareholderValue = cumulativePVCashFlows + cash - debt;
            showText("shareholder-value", Math.round(shareholderValue));
            
            // Compute and show Implied Share Price
            const numShares = document.getElementById("total-shares").textContent;
            const sharePrice = shareholderValue / numShares;
            showText("share-price", sharePrice.toFixed(2));
        }
    }

}

function generateHistory(incomeStatementCurr, balanceSheetCurr, balanceSheetPrev, taxRate , yearX) {
    
    // Formulate all table figures
    const ebit = parseInt(incomeStatementCurr["ebit"]);
    const taxes = ebit * taxRate;
    const ebiat = ebit - taxes;
    const deprecAndAmort = parseInt(incomeStatementCurr["depreciationAndAmortization"]); // May need to change key wording depedending on company financials
    const capex = (parseInt(balanceSheetPrev["propertyPlantEquipment"]) - parseInt(balanceSheetCurr["propertyPlantEquipment"])) + parseInt(incomeStatementCurr["depreciation"]);
    const workingCapCurr = parseInt(balanceSheetCurr["totalCurrentAssets"]) - parseInt(balanceSheetCurr["totalCurrentLiabilities"]);
    const workingCapPrev = parseInt(balanceSheetPrev["totalCurrentAssets"]) - parseInt(balanceSheetPrev["totalCurrentLiabilities"]);
    const chgInWorkingCap = workingCapCurr - workingCapPrev;
    const freeCashFlow = ebiat + deprecAndAmort - chgInWorkingCap - capex;

    // Show figures on the model table
    showText("ebit-" + yearX, "$" + convertToMillions(ebit));
    showText("taxes-" + yearX, convertToMillions(taxes));
    showText("ebiat-" + yearX, convertToMillions(ebiat));
    showText("deprec-" + yearX, convertToMillions(deprecAndAmort));
    showText("capex-" + yearX, convertToMillions(capex));
    showText("working-cap-" + yearX, convertToMillions(chgInWorkingCap));
    showText("fcf-" + yearX, convertToMillions(freeCashFlow));
}

// Convert number in terms of millions and add commas
function convertToMillions(num) {
    return Math.round(num / 1000000);
}

// Hide the element
function hideElement(elementId) {
    document.getElementById(elementId).classList.add("hidden");
}

// Show the element
function showElement(elementId) {
    document.getElementById(elementId).classList.remove("hidden");
}

// Show text
function showText(elementId, text) {
    document.getElementById(elementId).innerHTML = text;
}

function isInvalid(input) {
    return (input.length === 0 || isNaN(input)) ? true : false;
}
