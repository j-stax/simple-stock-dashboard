window.addEventListener("DOMContentLoaded", domLoaded);

function domLoaded() {
    document.getElementById("searchBtn").addEventListener("click", searchStockData);
    document.getElementById("ticker").addEventListener("input", tickerInput);
}
    
// Called when ticker input changes
function tickerInput(e) {
    // Extract the text from ticker input that triggered the callback
    const tickerId = e.target.id;
    const ticker = document.getElementById(tickerId).value.trim();

    // Display error message if no ticker is entered
    if (ticker.length === 0) {
        showElement("error-value-ticker");
        hideElement("error-loading-data");
    }
    else {
        hideElement("error-value-ticker");
        hideElement("error-loading-data");
    }

    // Error-handling - hide table if empty after error input
    const elemChildrenList = document.getElementById("stock-table").children;
    if (elemChildrenList.length == 2) { 
        hideElement("stock-data"); 
    }
}

// SearchBtn is clicked
function searchStockData() {
    const ticker = document.getElementById("ticker").value.trim().toUpperCase();

    // Show error message if field left blank
    if (ticker.length === 0) {
        showElement("error-value-ticker");
    }
    else {
        showElement("stock-data");
        showElement("loading-data");
        hideElement("error-loading-data");
        getStockData(ticker);     // Fetch stock data
    }

}

// Request stock data
async function getStockData(ticker) {
    // Create URL to access the web API
    const endpoint = "https://www.alphavantage.co/query";
    const apiKey = "HWCZ8MM4K05A2PXH";    // Back-up apiKey=87U3MLKGFH1NNRT8
    const queryString = `function=GLOBAL_QUOTE&symbol=${encodeURI(ticker)}&apikey=${apiKey}`;
    const url = `${endpoint}?${queryString}`;

    // Send http request to web API
    const response = await fetch(url);

    // No longer loading
    hideElement("loading-data");

    // See if data was successfully received
    if (response.ok) {
        const jsonResult = await response.json();
        displayStockData(ticker, jsonResult);
    }
    else {
        // Display appropriate error message
        showElement("error-loading-data");
        showText("error-loading-data", `Error loading information on ${ticker}. Ensure the ticker is correct!`);
    }
}

function displayStockData(ticker, jsonResult) {

    // Get ticker symbol from response
    const globalQuote = jsonResult["Global Quote"];
    const symbol = globalQuote["01. symbol"];

    // Ticker entry is valid
    if (ticker === symbol) {

        // Container to hold stock data
        let rowList = [];

        // Extract required stock info from response
        const price = roundNum(globalQuote["05. price"], 2);
        const high = roundNum(globalQuote["03. high"], 2);
        const low = roundNum(globalQuote["04. low"], 2);
        const volume = parseInt(globalQuote["06. volume"]).toLocaleString("en-US");
        const change = roundNum(globalQuote["10. change percent"], 2);
        const date = globalQuote["07. latest trading day"].substring(2);

        // Construct new row of stock data
        rowList.push(symbol);
        rowList.push(price);
        rowList.push(low);
        rowList.push(high);
        rowList.push(volume);
        rowList.push(change);
        rowList.push(date);
        addTableRow(rowList);
    }
    else {
       // Display appropriate error message
       showElement("error-loading-data");
       showText("error-loading-data", `Error loading information on ${ticker}. Ensure the ticker is correct!`);
    }

}

// Add new row to the Stock Info table
function addTableRow(rowList) {
    const stockTable = document.getElementById("stock-table");
    let rowNode = document.createElement("tr");     // Create new row node

    // Iterate through rowList and build new row branch
    for (let item of rowList) {
        let dataNode = document.createElement("td");
        let textNode = document.createTextNode(item);
        dataNode.appendChild(textNode);
        rowNode.appendChild(dataNode);
    }
    stockTable.appendChild(rowNode);        // Add new row to the table
}

// Hide the element
function hideElement(elementId) {
    document.getElementById(elementId).classList.add("hidden");
}

// Show the element
function showElement(elementId) {
    document.getElementById(elementId).classList.remove("hidden");
}

// Display the text in the element
function showText(elementId, text) {
    document.getElementById(elementId).innerHTML = text;
}

// Return string number with specified decimal places
function roundNum(numString, precision) {
    num = parseFloat(numString);
    return num.toFixed(precision);
}

