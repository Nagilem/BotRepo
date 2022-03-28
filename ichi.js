{
    //custom bot by Rob Esparza
    //Started 3/4/2022, latest update 3/27/2022. See version below.

    const botVer = "4.0.1-a52"
    const _ = gb.method.require(gb.modulesPath + '/lodash')
    
    // constants that need setting to tell bot when to buy / sell

    const bStateAmt = 30 // ** the total amount of points out of 100 for conversion line over base line - no points for bearish indication
    const cStateAmt = 15 // ** total amount of points out of 100 for cloud being green - no points for red
    const lStateAmt = 10 // ** the total amount of points out of 100 for close higher than SMA for last 15 closes - no points if close is below
    const pStateAmt = 35 // ** the total amount of points out of 100 for price in previous candles and support/resistance zone - can have neg points
    const rStateAmt = 10 // ** the total amount of points out of 100 for rising price over previous rounds - can have neg points
    
    const askPctPos = .003 //percent of ask to evaluate if the current ask is higher than last round
    const askPctNeg = -.0025 //percent of ask to evaluate if the current ask is lower than last round signficantly
    const askPctIB = .09 //percent of ask to evaluate if the current ask warrants in immediate buy 
    const AvgNum = 30 //number of candles to average to figure the rate of change of conversion line
    const buyThreshold = 66 // number between 0-100 to tell the bot the floor of the evaluated indicators at which to buy
    const entries = 60 //number of historical entries to keep for evaluation before starting culling
    const fcPct = -.035  //percent threshold below buy price to allow evaluation of fundamental criteria for sale of assets
    const immedBuy = buyThreshold + 1 //points needed to force an immediate buy of an asset
    const months = ["Jan", "Feb", "Mar","Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]; //months for date calcs
    const noAmt = 0 // no points for bearish indicator
    const purchaseAmt = 150 // amount in USDT to use per trade
    const sellThreshold = 14 // number between 0-100 to tell the bot the threshold of the evaluated indicators at which to sell
    const sellWaitGain = 1 //number of rounds to wait before allowing another purchases when last was a gain
    const sellWaitLoss = 15 //number of rounds to wait before allowing another purchase when last was a loss
    const sellWaitLoss2 = 30 //number of rounds to wait before allowing another purchase when more than last was a loss
    const stopLimitPct = .07 // pct of gain to setup a stop/limit price
    const trailBasePct = .02 // pct of gain to activate / setup a trail limit price
    const trailPct = .01  // pct amount of trail stop after a activation to setup sell
    const trailPct1 = .015 //pct amount of trail stop after 5% profit
    const trailPct2 = .025 //pct amount of trail stop after 10% profit
    const trailPct3 = .035 //pct amount of trail stop after 25% profit
    
    // Variables to be set as the script is processing - these set automatically
    var ask = gb.data.ask //ask price
    var askDiff = 0
    var askHigh = 0
    var askIB = 0
    var askLow = 0
    var bid = gb.data.bid //bid price
    var balances = gb.data.balances
    var baseLine = gb.data.kijun
    var bState = 0 //conversion / baseline point repository
    var bStateC1 = 0 //conversion / baseline criteria 1 point repository
    var bStateC2 = 0 //conversion / baseline criteria 2 point repository
    var bStateC3 = 0 //conversion / baseline criteria 3 point repository
    var bStateC4 = 0 //conversion / baseline criteria 4 point repository
    var bStateLine = 0 //conversion line % change for slope calc
    var bStateSum = 0 //conversion / baseline looped sum repository for average calc
    var bStateSlope = 0 //slope amount of conversion line
    var bStateAvg = 0 //conversion line average repository
    var buyAmt = (purchaseAmt / ask) //how much can be purchased based on ask price
    var buyDec = "Hold" //final decision repository for calculated action - buy, hold, sell
    var buyState = 0 //repository for the criteria points to make buyDec
    var cColor = "None"
    var clArray  // Average close array
    var clAvg = 0 //average close repository after calc
    var closeDiff1 = 0
    var closePct = 0
    var closePrice = gb.data.candlesClose
    var clSum = 0
    var conversionLine = gb.data.tenkan
    var cState = 0
    var debug = false
    var gainCalc = 0
    var infoRef = Date.now() - 900000 //refresh time to check - data should be less than 15 mins old.
    var lagSpan = gb.data.chikou
    var leadLine1 = gb.data.senkouSpanB
    var leadLine2 = gb.data.senkouSpanA
    var lState = 0
    var noOPair = 0
    var pairBalanceAmt = 0
    var pairBase = "None"
    var pairDash = 0
    var pairId = "None"
    var pairOp = "None"
    var pairName = gb.data.pairName
    var pairResult = "None"
    var pairStrCnt = 0
    var pState = 0
    var pStateC1 = 0
    var pStateC2 = 0
    var pStateResultC1 = "None"
    var pStateResultC2 = "None"
    var resetStore = false //Manual reset of the customStratStore
    var resistance1 = gb.data.R1
    var rState = 0
    var rStatePct = 0
    var rStateReason = "None"
    var saDiff = 0
    var saDiffPct = 0
    var sellNow = false
    var sellReason = "None"
    var srDiff1 = 0
    var srMid = 0
    var support1 = gb.data.S1
    var tradeState = "None"
    var trailCalc = 0

    // check if there are any open orders for this pair, 
    // wait until they get filled before doing anything else
    if (gb.data.openOrders.length > 0){
        // print a message to the console logs
            console.log('There is an open order, waiting...')
            // stop doing things
            return
    }

    // printing the current indicator readings 
    console.log("********************************************************************")
    console.log("                            " + pairName + "       Bot Version: " + botVer)
    console.log("********************************************************************")
    
    // checking the strat store and creating if one doesn't exist.
    if (_.isNil(gb.data.pairLedger.customStratStore)) { //checking if one exists
        console.log("No custom store exists... Setting up a new store.")
        gb.data.pairLedger.customStratStore = {}
        gb.data.pairLedger.customStratStore.birth = Date.now()
    }
    else if (_.isNil(gb.data.pairLedger.customStratStore.birth)) { //checking for a birth date, if no, then reset
        console.log("No birthdate exists... Refreshing store.")
        gb.data.pairLedger.customStratStore = {}
        gb.data.pairLedger.customStratStore.birth = Date.now()
    }
    else if (resetStore) { //only used if customStratStore needs to be reset manually. See resetStore bool above. 
        console.log("Resetting store on user input.")
        gb.data.pairLedger.customStratStore = {}
        gb.data.pairLedger.customStratStore.birth = Date.now()
        return  
    }

    //checking on h object to store historical data.
    if (_.isNil(gb.data.pairLedger.customStratStore.h)) { //checking for the h object. Create if none.
        console.log("No history store exists... Setting up history store.")
        gb.data.pairLedger.customStratStore.h = {}
        gb.data.pairLedger.customStratStore.h.lastRef = Date.now()
    }
    else if (_.isNil(gb.data.pairLedger.customStratStore.h.lastRef)) { //checking for a last refresh date. Refresh if none.
        console.log("History store does not have a last refresh date... Refreshing history store.")
        gb.data.pairLedger.customStratStore.h = {}
        gb.data.pairLedger.customStratStore.h.lastRef = Date.now()
    }
    else if (infoRef > gb.data.pairLedger.customStratStore.h.lastRef) { //checking freshness of data. Refresh if older than 15 mins.
        console.log("History store is out of date. Refreshing history store.")
        gb.data.pairLedger.customStratStore.h = {}
        gb.data.pairLedger.customStratStore.h.lastRef = Date.now()
    }
   
    //setting up the arrays to hold the historical data.
    if (_.isNil(gb.data.pairLedger.customStratStore.h.cLine)) {
        console.log("Setting up history arrays...")
        gb.data.pairLedger.customStratStore.h.cLine = []
        gb.data.pairLedger.customStratStore.h.bLine = []
        gb.data.pairLedger.customStratStore.h.lead1 = []
        gb.data.pairLedger.customStratStore.h.lead2 = []
        gb.data.pairLedger.customStratStore.h.lag = []
        gb.data.pairLedger.customStratStore.h.bid = []
        gb.data.pairLedger.customStratStore.h.ask = []
        gb.data.pairLedger.customStratStore.h.buyPrice = []
        gb.data.pairLedger.customStratStore.h.buyAmount = []
        gb.data.pairLedger.customStratStore.h.sellPrice = []
        gb.data.pairLedger.customStratStore.h.cnt = 0
    }
    
    //putting history into the store for later use
    gb.data.pairLedger.customStratStore.h.cLine.push(conversionLine)
    gb.data.pairLedger.customStratStore.h.bLine.push(baseLine)
    gb.data.pairLedger.customStratStore.h.lead1.push(leadLine1)
    gb.data.pairLedger.customStratStore.h.lead2.push(leadLine2)
    gb.data.pairLedger.customStratStore.h.lag.push(lagSpan)
    gb.data.pairLedger.customStratStore.h.bid.push(bid)
    gb.data.pairLedger.customStratStore.h.ask.push(ask)
    gb.data.pairLedger.customStratStore.h.cnt = gb.data.pairLedger.customStratStore.h.cnt + 1
    gb.data.pairLedger.customStratStore.h.lastRef = Date.now()

    //putting initial values in for buyPrice, buyAmount, and sellPrice
    if (_.isNil(gb.data.pairLedger.customStratStore.h.buyPrice)) {
        gb.data.pairLedger.customStratStore.h.buyPrice.push(ask)
        gb.data.pairLedger.customStratStore.h.buyAmount.push(buyAmt)
        gb.data.pairLedger.customStratStore.h.sellPrice.push(ask)
    }

    //culling arrays to match number in entries variable.
    if (gb.data.pairLedger.customStratStore.h.cLine.length > entries) {
        console.log("Culling historical criteria entries...")
        gb.data.pairLedger.customStratStore.h.cLine.shift()
        gb.data.pairLedger.customStratStore.h.bLine.shift()
        gb.data.pairLedger.customStratStore.h.lead1.shift()
        gb.data.pairLedger.customStratStore.h.lead2.shift()
        gb.data.pairLedger.customStratStore.h.lag.shift()
        gb.data.pairLedger.customStratStore.h.bid.shift()
        gb.data.pairLedger.customStratStore.h.ask.shift()
    }
    
    //culling buy info to match numbers in entries variable
    if (gb.data.pairLedger.customStratStore.h.buyPrice.length > entries) {
        console.log("Culling historical purchase entries...")
        gb.data.pairLedger.customStratStore.h.buyPrice.shift()
        gb.data.pairLedger.customStratStore.h.buyAmount.shift()
        gb.data.pairLedger.customStratStore.h.sellPrice.shift()
    }
    
    if (gb.data.pairLedger.customStratStore.h.cnt > (AvgNum + 1)) {
        // setting up close average for past 15 candles
        gb.method.tulind.indicators.sma.indicator([gb.data.candlesClose], [25], function(err, results){
            clArray = results[0]
            });

        for(let i = 1; i <= AvgNum ; i++) {
            clSum = clArray[i] + clSum
            }   
        clAvg = clSum / AvgNum
        
        /*
        // checking if the cloud is pointing long or short
        if (tradeState == "None" && leadLine1 > leadLine2) {
            tradeState = "+++++Long+++++"
        }
        else {
            tradeState = "-----Short-----"
        } 
        console.log("Bot general state is: " + tradeState)
        */

        // checking cloud state - green or red
        if (leadLine1 >= leadLine2) {
            cState = cStateAmt // cloud green
            cColor = "Green"
        }
        else {
            cState = noAmt // cloud red
            cColor = "Red"
        } 
        if (debug == true) {
            console.log("********************************************************************")
            console.log("Cloud (" + cStateAmt + "): " + cState + " Color: " + cColor + " | Lead1: "  + leadLine1 + " Lead2: " + leadLine2)
        }
        else {
            console.log("********************************************************************")
            console.log("Cloud (" + cStateAmt + "): " + cState + " Color: " + cColor)
        }
        // checking if the conversion line is bullish
        if (conversionLine >= baseLine) {
            bStateC1 = bStateAmt * .5 // blue line high
        }
        else {
            bStateC1 = noAmt // red line high
        }
        
        //Check if conversion line is rising over past 3 rounds
        if (
            gb.data.pairLedger.customStratStore.h.cLine[gb.data.pairLedger.customStratStore.h.cLine.length - 20] >= gb.data.pairLedger.customStratStore.h.cLine[gb.data.pairLedger.customStratStore.h.cLine.length - 30] 
            && gb.data.pairLedger.customStratStore.h.cLine[gb.data.pairLedger.customStratStore.h.cLine.length - 10] >= gb.data.pairLedger.customStratStore.h.cLine[gb.data.pairLedger.customStratStore.h.cLine.length - 20] 
            && gb.data.pairLedger.customStratStore.h.cLine[gb.data.pairLedger.customStratStore.h.cLine.length - 1] >= gb.data.pairLedger.customStratStore.h.cLine[gb.data.pairLedger.customStratStore.h.cLine.length - 10]
            ) {
            bStateC2 = bStateAmt * .25
        }
        else if (
            gb.data.pairLedger.customStratStore.h.cLine[gb.data.pairLedger.customStratStore.h.cLine.length - 5] >= gb.data.pairLedger.customStratStore.h.cLine[gb.data.pairLedger.customStratStore.h.cLine.length - 10] 
            && gb.data.pairLedger.customStratStore.h.cLine[gb.data.pairLedger.customStratStore.h.cLine.length- 1] >= gb.data.pairLedger.customStratStore.h.cLine[gb.data.pairLedger.customStratStore.h.cLine.length - 5]
            ) {
            bStateC2 = bStateAmt * .15
        }
        else if (gb.data.pairLedger.customStratStore.h.cLine[gb.data.pairLedger.customStratStore.h.cLine.length - 1] >= gb.data.pairLedger.customStratStore.h.cLine[gb.data.pairLedger.customStratStore.h.cLine.length - 5]) {
            bStateC2 = bStateAmt * .05
        }
        else {
            bStateC2 = noAmt
        }

        //avg conversion line by AvgNum for slope comparison
        for(let i = 1; i <= AvgNum ; i++) {
            bStateSum =  gb.data.pairLedger.customStratStore.h.cLine[gb.data.pairLedger.customStratStore.h.cLine.length - i] + bStateSum
        }   
        bStateAvg = (bStateSum / AvgNum)
        bStateLine = gb.data.pairLedger.customStratStore.h.cLine[gb.data.pairLedger.customStratStore.h.cLine.length - 1] - bStateAvg
        bStateSlope = bStateLine / gb.data.pairLedger.customStratStore.h.cLine[gb.data.pairLedger.customStratStore.h.cLine.length - 1]

        if(bStateSlope > .005) {
            bStateC3 = bStateAmt * .25
        }
        else if (bStateSlope > .0015 && bStateSlope < .005) {
            bStateC3 = bStateAmt * .15
        }
        else if (bStateSlope > .0 && bStateSlope < .0015) {
            bStateC3 = bStateAmt * .05
        }

        //checking if a cross has happened within the past 2 rounds
        if (
            gb.data.pairLedger.customStratStore.h.cLine[gb.data.pairLedger.customStratStore.h.cLine.length - 1] >= gb.data.pairLedger.customStratStore.h.bLine[gb.data.pairLedger.customStratStore.h.bLine.length - 1] 
            && gb.data.pairLedger.customStratStore.h.cLine[gb.data.pairLedger.customStratStore.h.cLine.length - 2] <= gb.data.pairLedger.customStratStore.h.bLine[gb.data.pairLedger.customStratStore.h.bLine.length - 2]
            ) {
                let bStateCrossDate = new Date()
                gb.data.pairLedger.customStratStore.h.bStateCrossDate = ("0" + bStateCrossDate.getHours()).slice(-2) + ":" + ("0" + bStateCrossDate.getMinutes()).slice(-2) + " " + ("0" + bStateCrossDate.getDate()).slice(-2) + "-" + months[bStateCrossDate.getMonth()] + "-" + bStateCrossDate.getFullYear()
                bStateC4 = immedBuy
        }
        else if (
            gb.data.pairLedger.customStratStore.h.cLine[gb.data.pairLedger.customStratStore.h.cLine.length - 2] >= gb.data.pairLedger.customStratStore.h.bLine[gb.data.pairLedger.customStratStore.h.bLine.length - 2] 
            && gb.data.pairLedger.customStratStore.h.cLine[gb.data.pairLedger.customStratStore.h.cLine.length - 3] <= gb.data.pairLedger.customStratStore.h.bLine[gb.data.pairLedger.customStratStore.h.bLine.length - 3]
            ) {
                let bStateCrossDate = new Date()
                gb.data.pairLedger.customStratStore.h.bStateCrossDate = ("0" + bStateCrossDate.getHours()).slice(-2) + ":" + ("0" + bStateCrossDate.getMinutes()).slice(-2) + " " + ("0" + bStateCrossDate.getDate()).slice(-2) + "-" + months[bStateCrossDate.getMonth()] + "-" + bStateCrossDate.getFullYear()
                bStateC4 = immedBuy
        }
        else {
            bStateC4 = noAmt
        }

        bState = bStateC1 + bStateC2 + bStateC3 + bStateC4
        console.log("Baseline (" + bStateAmt + "): " + bState + " | C1: " + bStateC1 + "   C2: " + bStateC2 + "   C3: " + bStateC3 + "   C4: " + bStateC4)
        
        if (debug == true) {
            console.log("   C1: " + bStateC1 + " | Conversion: " + conversionLine + " Base: " + baseLine)
            console.log("   C2: " + bStateC2 + " | cLine[30]: " + gb.data.pairLedger.customStratStore.h.cLine[gb.data.pairLedger.customStratStore.h.cLine.length - 30] + " cLine[20]: " + gb.data.pairLedger.customStratStore.h.cLine[gb.data.pairLedger.customStratStore.h.cLine.length - 20] + " cLine[10]: " + gb.data.pairLedger.customStratStore.h.cLine[gb.data.pairLedger.customStratStore.h.cLine.length - 10] + " cLine[1]: " + gb.data.pairLedger.customStratStore.h.cLine[gb.data.pairLedger.customStratStore.h.cLine.length - 1])
            console.log("   C3: " + bStateC3 + " | bStateAvg: " + bStateAvg + "  bStateLine: " + bStateLine + "  bStateSlope: " + bStateSlope + " cLine: " + gb.data.pairLedger.customStratStore.h.cLine[gb.data.pairLedger.customStratStore.h.cLine.length- 1])
            
            if (_.isNil(gb.data.pairLedger.customStratStore.h.bStateCrossDate)) {
                console.log("   C4: " + bStateC4 + " | Last Cross: None")   
            }
            else {
                console.log("   C4: " + bStateC4 + " | Last Cross: " + gb.data.pairLedger.customStratStore.h.bStateCrossDate)
            }
        }
        // checking to see if the price is rising or falling over past rounds
        askDiff = ask - gb.data.pairLedger.customStratStore.h.ask[gb.data.pairLedger.customStratStore.h.ask.length -2]
        askIB = askPctIB * ask
        askHigh = askPctPos * ask
        askLow = askPctNeg * ask
        if (
            gb.data.pairLedger.customStratStore.h.ask[gb.data.pairLedger.customStratStore.h.ask.length - 6] > gb.data.pairLedger.customStratStore.h.ask[gb.data.pairLedger.customStratStore.h.ask.length - 9] 
            && gb.data.pairLedger.customStratStore.h.ask[gb.data.pairLedger.customStratStore.h.ask.length - 3] > gb.data.pairLedger.customStratStore.h.ask[gb.data.pairLedger.customStratStore.h.ask.length - 6] 
            && ask > gb.data.pairLedger.customStratStore.h.ask[gb.data.pairLedger.customStratStore.h.ask.length - 3]
        ) {
            rState = rStateAmt
            rStateReason = "Price is trending UP for last three evaluated rounds."
        }
        else if(askDiff > askIB) {
            rState = immedBuy
            rStateReason = "Price is SIGNIFICANTLY HIGHER this round from last round. IMMEDIATE BUY."
        }
        else if(askDiff > askHigh) {
            rState = (rStateAmt * .5)
            rStateReason = "Price is HIGHER this round from last round."
        }
        else if (
            gb.data.pairLedger.customStratStore.h.ask[gb.data.pairLedger.customStratStore.h.ask.length - 9] > gb.data.pairLedger.customStratStore.h.ask[gb.data.pairLedger.customStratStore.h.ask.length - 6] 
            && gb.data.pairLedger.customStratStore.h.ask[gb.data.pairLedger.customStratStore.h.ask.length - 6] > gb.data.pairLedger.customStratStore.h.ask[gb.data.pairLedger.customStratStore.h.ask.length - 3] 
            && ask < gb.data.pairLedger.customStratStore.h.ask[gb.data.pairLedger.customStratStore.h.ask.length - 3]
        ) {
            rState = rStateAmt * -1
            rStateReason = "Price is trending DOWN for last three evaluated rounds." 
        }
        else if(askDiff < askLow) {
            rState = rStateAmt * -1
            rStateReason = "Price is SIGNIFICANTLY LOWER this round from last round."
        }
        else {
            rState = noAmt
            rStateReason = "Inconclusive trend."
        }
        console.log("Rising (" + rStateAmt + "): " + rState + " | Reason: " + rStateReason)
        if (debug == true) {
            console.log("   Ask[9]: " + gb.data.pairLedger.customStratStore.h.ask[gb.data.pairLedger.customStratStore.h.ask.length - 9])
            console.log("   Ask[6]: " + gb.data.pairLedger.customStratStore.h.ask[gb.data.pairLedger.customStratStore.h.ask.length - 6])
            console.log("   Ask[3]: " + gb.data.pairLedger.customStratStore.h.ask[gb.data.pairLedger.customStratStore.h.ask.length - 3])
            if (askDiff > askIB) {
                console.log("   Ask: " + ask + " | Difference: " + askDiff + "  " + (askPctIB * 100) + "% Comparison: " + askIB)
            }
            else if (askDiff > 0) {
            console.log("   Ask: " + ask + " | Difference: " + askDiff + "  " + (askPctPos * 100) + "% Comparison: " + askHigh)
            }
            else {
                console.log("   Ask: " + ask + " | Difference: " + askDiff + "  " + (askPctNeg * 100) + "% Comparison: " + askLow)   
            }
        }   
                
        //calculating the current ask versus the support/resistance lines        
        srDiff1 = (resistance1 - support1) * .5
        srMid = support1 + srDiff1
        
        if (ask > resistance1) {
            pStateC1 = pStateAmt * .5
            pStateResultC1 = "Ask OVER R1."
        }
        else if (ask >= srMid && ask < resistance1) {
            saDiff = (ask - srMid)
            saDiffPct = (saDiff/srDiff1) * -1 
            pStateC1 = Math.round((pStateAmt * .5) * saDiffPct)
            pStateResultC1 = "Ask OVER mid point UNDER R1."    
        }
        else if (ask > support1 && ask < srMid) {
            saDiff = (ask - support1)
            saDiffPct = saDiff/srDiff1
            saDiffPct = 1 - saDiffPct
            pStateC1 = Math.round((pStateAmt * .5) * saDiffPct)
            pStateResultC1 = "Ask UNDER mid point OVER S1."
        }
        else if (ask < support1) {
            pStateC1 = pStateAmt * -.5
            pStateResultC1 = "Ask UNDER S1."
        }

        // checking price history for green or red candle closes over the past 4 candles
        if (
            gb.data.candlesClose[gb.data.candlesClose.length - 4] < gb.data.candlesClose[gb.data.candlesClose.length - 3]
            && gb.data.candlesClose[gb.data.candlesOpen.length - 4] < gb.data.candlesClose[gb.data.candlesLow.length - 3]
            && gb.data.candlesClose[gb.data.candlesClose.length - 3] < gb.data.candlesClose[gb.data.candlesClose.length - 2]
            && gb.data.candlesClose[gb.data.candlesOpen.length - 3] < gb.data.candlesClose[gb.data.candlesLow.length - 2]
            && gb.data.candlesClose[gb.data.candlesClose.length - 2] < gb.data.candlesClose[gb.data.candlesClose.length - 1]
            && gb.data.candlesClose[gb.data.candlesOpen.length - 2] < gb.data.candlesClose[gb.data.candlesLow.length - 1]
        ) {
            pStateC2 = pStateAmt *.5
            pStateResultC2 = "3 POSITIVE candle closes with opens lower than lows."
        }
        else if( 
            gb.data.candlesClose[gb.data.candlesClose.length - 3] < gb.data.candlesClose[gb.data.candlesClose.length - 2]
            && gb.data.candlesClose[gb.data.candlesOpen.length - 3] < gb.data.candlesClose[gb.data.candlesLow.length - 2]
            && gb.data.candlesClose[gb.data.candlesClose.length - 2] < gb.data.candlesClose[gb.data.candlesClose.length - 1]
            && gb.data.candlesClose[gb.data.candlesOpen.length - 2] < gb.data.candlesClose[gb.data.candlesLow.length - 1]
        ) {
            pStateC2 = pStateAmt * .25
            pStateResultC2 = "2 POSITIVE candle closes with opens lower than lows."
        }
        else if (
            gb.data.candlesClose[gb.data.candlesClose.length - 4] > gb.data.candlesClose[gb.data.candlesClose.length - 3]
            && gb.data.candlesClose[gb.data.candlesClose.length - 3] > gb.data.candlesClose[gb.data.candlesClose.length - 2]
            && gb.data.candlesClose[gb.data.candlesClose.length - 2] > gb.data.candlesClose[gb.data.candlesClose.length - 1]
        ) {
            pStateC2 = pStateAmt * -.5
            pStateResultC2 = "3 NEGATIVE candle closes."
        }
        else if (
            gb.data.candlesClose[gb.data.candlesClose.length - 3] > gb.data.candlesClose[gb.data.candlesClose.length - 2]
            && gb.data.candlesClose[gb.data.candlesClose.length - 2] > gb.data.candlesClose[gb.data.candlesClose.length - 1]
            ) {
            pStateC2 = pStateAmt * -.25
            pStateResultC2 = "2 NEGATIVE candle closes."
        }
        else if (gb.data.candlesClose[gb.data.candlesClose.length - 2] > gb.data.candlesClose[gb.data.candlesClose.length - 1]) {
            pStateC2 = pStateAmt * -.1
            pStateResultC2 = "1 NEGATIVE candle close."
        }
        else {
            pStateC2 = noAmt
            pStateResultC2 = "Inconclusive trend."
        }
        
        pState = pStateC1 + pStateC2
        
        console.log("Price (" + pStateAmt + "): " + pState + " | C1 Result: " + pStateResultC1 + " C2 Result: " + pStateResultC2)
        if (debug == true) {
            console.log("C1: " + pStateC1)
            console.log("   Ask " + ask)
            console.log("   R1: " + resistance1)
            console.log("   Mid point: " + srMid)
            console.log("   S1: " + support1)
            console.log("   % Diff: " + saDiffPct)
            console.log("C2: " + pStateC2)
            console.log("   Close[4]: " + gb.data.candlesClose[gb.data.candlesClose.length - 4])
            console.log("   Close[3]: " + gb.data.candlesClose[gb.data.candlesClose.length - 3])
            console.log("   Close[2]: " + gb.data.candlesClose[gb.data.candlesClose.length - 2])
            console.log("   Close[1]: " + gb.data.candlesClose[gb.data.candlesClose.length - 1])
        }

        // checking if closing price is over the closing average for last 15 candles 
        if (ask > clAvg) {
            lState = lStateAmt // green above
        }
        else {
            lState = noAmt // orange above
        }   
        console.log("Lag (" + lStateAmt + "): " + lState + " | Ask: " + ask + " Lag Span 15 Avg: " + clAvg)

        //Adding up criteria points to make a decision
        buyState = rState + bState + pState + lState + cState

        //setting buy decision based on criteria
        if (buyState >= buyThreshold) {
            buyDec = "Buy"
        }
        else if (buyState < buyThreshold && buyState > sellThreshold) {
            buyDec = "Hold"
        }
        else if (buyState <= sellThreshold) {
            buyDec = "Sell"
        }
      
        //pushing data to log screen for review
        console.log("********************************************************************")
        console.log("--------------------------------------------------------------------")
        console.log("Current Buy State of " + pairName + " is: " + buyState + " - " + buyDec)
        console.log("--------------------------------------------------------------------")
        console.log("********************************************************************")

        //Setting hold in event that the bot just sold the asset last round
        if (gb.data.pairLedger.customStratStore.h.sellWait >= gb.data.pairLedger.customStratStore.h.cnt) {
            buyDec = "Hold"
            console.log("Just sold. Pausing new purchase action for " + (gb.data.pairLedger.customStratStore.h.sellWait - gb.data.pairLedger.customStratStore.h.cnt + 1) + " of " + gb.data.pairLedger.customStratStore.h.sellWaitRounds + " rounds.")   
            //console.log("sellWait: " + gb.data.pairLedger.customStratStore.h.sellWait + " cnt: " + gb.data.pairLedger.customStratStore.h.cnt)
            console.log("********************************************************************")
            return
        }
        
        console.log("Starting trade operations...")
        console.log("Base: " + gb.data.baseBalance + " | Quote: " + gb.data.quoteBalance + " | Purchase Amount: " + purchaseAmt)
        console.log("Buy: " + buyThreshold + " | Sell: " + sellThreshold)
        console.log("Stop %: " + Math.round(stopLimitPct * 100) + "% | Trail Activate %: " + Math.round(trailBasePct * 100) + "% | Trail %: " + Math.round(gb.data.pairLedger.customStratStore.h.trailPct * 100) + "%")
        console.log("********************************************************************")
    
        //checking to see if the opposite pairing has already been bought
        pairStrCnt = pairName.length
        pairDash = pairName.search("-")
        pairStrCnt = pairStrCnt - pairDash
        pairId = pairName.slice(-2)
        pairBase = pairName.slice((pairDash + 1),- 2)
        if (pairId == "3L") {
            pairOp = pairBase + "3S"
            pairResult = "Short"
        }
        else if (pairId == "3S") {
            pairOp = pairBase + "3L"
            pairResult = "Long"
        }
        else {
            pairOp = 0
        }
        
        if(_.isNil(balances[pairOp])) {
            pairBalanceAmt = -1
        }
        else {
            pairBalanceAmt = balances[pairOp]["available"]
        }

        //limiting purchases if contradicting pair has a position
        if (pairBalanceAmt > 0) {
            noOPair = false
            console.log(pairOp + " found with " + pairBalanceAmt + " assets. Holding purchases...")
        }
        else if (pairBalanceAmt == -1) {
            noOPair = true
            console.log("This is a new pair . No contradicting assets. Purchase actions authorized.")
        }
        else{
            noOPair = true
            console.log("No contradicting assets found. Purchase actions authorized.")
        }
        
        //setting up buy conditions and making purchase
        if (gb.data.quoteBalance == 0 && buyDec == "Buy" && noOPair == true) {
            console.log("There are no open orders and criteria is set to " + buyDec + ". Setting entry point...")
            console.log("Purchasing " + buyAmt + " of " + pairName + "...")
            gb.method.buyMarket(buyAmt, pairName)
            gb.data.pairLedger.customStratStore.h.buyPrice.push(ask)
            gb.data.pairLedger.customStratStore.h.buyAmount.push(buyAmt)
            gb.data.pairLedger.customStratStore.h.stopLoss = ask * (1 - stopLimitPct) 
            gb.data.pairLedger.customStratStore.h.trailBase = ask * (1 + trailBasePct) 
            gb.data.pairLedger.customStratStore.h.trailPct = trailPct
            gb.data.pairLedger.customStratStore.h.sellWait = 0
        } 
                
        //calculating gain
        if (gb.data.pairLedger.customStratStore.h.buyPrice[gb.data.pairLedger.customStratStore.h.buyPrice.length -1] > 0) {
            gainCalc = (ask - gb.data.pairLedger.customStratStore.h.buyPrice[gb.data.pairLedger.customStratStore.h.buyPrice.length -1])/ask
        }

        //setting up sell conditions for stop, trail and criteria
        if (gb.data.quoteBalance > 0 && ask < gb.data.pairLedger.customStratStore.h.stopLoss) {
            sellNow = true
            sellReason = "Selling due to Stop/Limit breach."
        }
        else if (gb.data.quoteBalance > 0 && ask < gb.data.pairLedger.customStratStore.h.trailPrice) {
            sellNow = true
            sellReason = "Selling due to Trail stop breach."
        }
        else if (
            gb.data.quoteBalance > 0
            && gb.data.pairLedger.customStratStore.h.lag[gb.data.pairLedger.customStratStore.h.lag.length - 1] < gb.data.pairLedger.customStratStore.h.lag[gb.data.pairLedger.customStratStore.h.lag.length - 2]
            && gb.data.pairLedger.customStratStore.h.cLine[gb.data.pairLedger.customStratStore.h.cLine.length - 1] < gb.data.pairLedger.customStratStore.h.cLine[gb.data.pairLedger.customStratStore.h.cLine.length - 2]
            && gb.data.pairLedger.customStratStore.h.lead1[gb.data.pairLedger.customStratStore.h.lead1.length - 1] < gb.data.pairLedger.customStratStore.h.lead1[gb.data.pairLedger.customStratStore.h.lead1.length - 2]
            && gainCalc > trailBasePct
        ) {
            sellNow = true
            sellReason = "Sold due to declining indicators."   
        }
        else if (
            gb.data.quoteBalance > 0
            && buyDec == "Sell"
            && gainCalc < fcPct
        ) {
            sellNow = true
            sellReason = "Sold due to deteriorating fundamental criteria."
        }

        //setting trailpct based on amount of profit
        if (_.isNil(gb.data.pairLedger.customStratStore.h.trailPct)) {
            gb.data.pairLedger.customStratStore.h.trailPct = trailPct
        }
        
        if (gainCalc > .25) {
            gb.data.pairLedger.customStratStore.h.trailPct = trailPct3
        }
        else if (gainCalc < .25 && gainCalc > .1) {
            gb.data.pairLedger.customStratStore.h.trailPct = trailPct2
        }
        else if (gainCalc < .1 && gainCalc > .05) {
            gb.data.pairLedger.customStratStore.h.trailPct = trailPct1
        }

        //setting up trailPrice from trailBase
        if (gb.data.pairLedger.customStratStore.h.trailBase > 0 && ask > gb.data.pairLedger.customStratStore.h.trailBase) {
            trailCalc = ask * (1 - gb.data.pairLedger.customStratStore.h.trailPct)
            gb.data.pairLedger.customStratStore.h.trailPrice = Math.max(trailCalc, gb.data.pairLedger.customStratStore.h.trailPrice)
        }

        if (gb.data.quoteBalance > 0) {
            console.log("Last Price bought: " + gb.data.pairLedger.customStratStore.h.buyPrice[gb.data.pairLedger.customStratStore.h.buyPrice.length -1] + " | Gain %: " + (gainCalc * 100) + "%")
            console.log("Stop/Loss price: " + gb.data.pairLedger.customStratStore.h.stopLoss, )
            console.log("Trail base activation price: " + gb.data.pairLedger.customStratStore.h.trailBase + " | Ask now: " + ask)
        }

        if (gb.data.pairLedger.customStratStore.h.trailBase > 0 && ask > gb.data.pairLedger.customStratStore.h.trailBase) {
            console.log("Trail price now: " + gb.data.pairLedger.customStratStore.h.trailPrice)
        }

        console.log("********************************************************************")

        if (gb.data.pairLedger.customStratStore.h.stopLoss > 0) {
            gb.data.pairLedger.customStopTarget = gb.data.pairLedger.customStratStore.h.stopLoss
        }

        if (gb.data.pairLedger.customStratStore.h.trailPrice > 0) {
            gb.data.pairLedger.customTrailingTarget = gb.data.pairLedger.customStratStore.trailPrice
        }

        //selling the assets back
        if (sellNow) {
            console.log("Selling " + gb.data.quoteBalance + " of " + pairName + "...")
            console.log(sellReason)
            gb.method.sellMarket(gb.data.quoteBalance, pairName)
            gb.data.pairLedger.customStratStore.h.sellPrice.push(ask)
            
            console.log("Setting up wait time for repurchase after this sale...")
            if (
                gb.data.pairLedger.customStratStore.h.buyPrice[gb.data.pairLedger.customStratStore.h.buyPrice.length - 2] - gb.data.pairLedger.customStratStore.h.sellPrice[gb.data.pairLedger.customStratStore.h.sellPrice.length -2] > 0
                && gb.data.pairLedger.customStratStore.h.buyPrice[gb.data.pairLedger.customStratStore.h.buyPrice.length - 1] - gb.data.pairLedger.customStratStore.h.sellPrice[gb.data.pairLedger.customStratStore.h.sellPrice.length -1] > 0
            ) {
                gb.data.pairLedger.customStratStore.h.sellWait = gb.data.pairLedger.customStratStore.h.cnt + sellWaitLoss2
                gb.data.pairLedger.customStratStore.h.sellWaitRounds = sellWaitLoss2
                console.log("This is the SECOND sale at a LOSS IN A ROW. Setting wait to " + sellWaitLoss2 + ".")
            }
            else if (
                gb.data.pairLedger.customStratStore.h.buyPrice[gb.data.pairLedger.customStratStore.h.buyPrice.length -1] - gb.data.pairLedger.customStratStore.h.sellPrice[gb.data.pairLedger.customStratStore.h.sellPrice.length -1] > 0
            ) {
                gb.data.pairLedger.customStratStore.h.sellWait = gb.data.pairLedger.customStratStore.h.cnt + sellWaitLoss
                gb.data.pairLedger.customStratStore.h.sellWaitRounds = sellWaitLoss
                console.log("This sale was for a LOSS. Setting wait to " + sellWaitLoss + ".")
            }
            else {   
                gb.data.pairLedger.customStratStore.h.sellWait = gb.data.pairLedger.customStratStore.h.cnt + sellWaitGain
                gb.data.pairLedger.customStratStore.h.sellWaitRounds = sellWaitGain
                console.log("This sale was for a GAIN. Setting wait to " + sellWaitGain + ".")
            }
            
            console.log("Resetting configuration after this sale...")
            gb.data.pairLedger.customStratStore.h.stopLoss = 0
            gb.data.pairLedger.customStratStore.h.trailBase = 0
            gb.data.pairLedger.customStratStore.h.trailPrice = 0
            gb.data.pairLedger.customStratStore.h.trailPct = trailPct
            gb.data.pairLedger.customStopTarget
            gb.data.pairLedger.customTrailingTarget
            sellReason = "None"
        }
    }    
    else {
        console.log("Building history repository... " + gb.data.pairLedger.customStratStore.h.cnt + " records captured.")
        console.log("Processing will begin after " + (AvgNum +1)  + " records are available.")
    }
}
