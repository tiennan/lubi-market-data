const ccxt = require ('ccxt')
const mongoose = require('mongoose')

require('dotenv').config()
global.Config = require('../config')
const Models = require('../models')

console.log('connecting mongodb...')
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useFindAndModify: false,
}).then(() => {
  console.log('mongodb connected.')
  main()
},(err) => {
  console.log(err)
}
)

const exchange = new ccxt.binance({
  'apiKey': process.env.BINANCE_API_KEY,
  'secret': process.env.BINANCE_SECRET_KEY,
  'timeout': 30000,
  'enableRateLimit': true,
})

const main = async () => {
  console.log(`[${new Date()}] Run fetchTicker`)
  const delay = 500
  let matchedUSDTTickers = []
  let matchedBUSDTickers = []
  let usdtOHLCVLimit = 150
  let busdOHLCVLimit = 20
  
  let markets = await exchange.loadMarkets()

  console.log('markets count: ' + exchange.symbols.length)

  let listUSDTCoins = []
  let listBUSDCoins = []
  let listSymbolsToFetch = []
  let countBUSDTickers = 0

  for (key in markets) {
    if (key === 'BUSD/USDT') continue
    if (key.includes('UP/') || key.includes('DOWN/')) continue
    if (Config.skipCoins.includes(markets[key].base)) continue

    if (markets[key].quote === 'USDT') {
      listUSDTCoins.push(markets[key].base)
      listSymbolsToFetch.push(key)
    } else if (markets[key].quote === 'BUSD') {
      listBUSDCoins.push(markets[key].base)
    }
  }

  listBUSDCoins.forEach((label) => {
    if (!listUSDTCoins.includes(label)) {
      listSymbolsToFetch.push(`${label}/BUSD`)
      countBUSDTickers++
    }
  })
  console.log(`Fetching tickers count: ${listSymbolsToFetch.length} (USDT: ${listUSDTCoins.length}, BUSD: ${countBUSDTickers})`)
  for (let i = 0; i < listSymbolsToFetch.length; i++) {
    let symbol = listSymbolsToFetch[i]
    let ticker = await exchange.fetchTicker(symbol)
    ticker.count = ticker.info.count || 0
    if (ticker.count === 1) continue // ignore not exist case

    if (symbol.includes('/USDT')) {
      matchedUSDTTickers.push(ticker)
    } else if (symbol.includes('/BUSD')) {
      matchedBUSDTickers.push(ticker)
    }
    console.log(`${symbol}: ${ticker.quoteVolume} ${ticker.count}`)
    await new Promise (resolve => setTimeout (resolve, delay))
  }

  console.log(`USDT tickers count: ${matchedUSDTTickers.length}`)
  console.log(`BUSD tickers count: ${matchedBUSDTickers.length}`)

  matchedUSDTTickers.sort((a, b) => {
    return a.quoteVolume - b.quoteVolume
  }).reverse()
  matchedBUSDTickers.sort((a, b) => {
    return a.quoteVolume - b.quoteVolume
  }).reverse()

  console.log(`Saving ${matchedUSDTTickers.length} USDT tickers...`)
  for (let i = 0; i < matchedUSDTTickers.length; i++) {
    let ticker = matchedUSDTTickers[i]
    if (i < usdtOHLCVLimit) {
      ticker.hasOHLCV = true
    } else {
      ticker.hasOHLCV = false
    }
    await Models.Ticker.findOneAndUpdate({
      symbol: ticker.symbol,
    }, ticker, {
      upsert: true
    }).exec()
  }

  console.log(`Saving ${matchedBUSDTickers.length} BUSD tickers...`)
  for (let i = 0; i < matchedBUSDTickers.length; i++) {
    let ticker = matchedBUSDTickers[i]
    if (i < busdOHLCVLimit) {
      ticker.hasOHLCV = true
    } else {
      ticker.hasOHLCV = false
    }
    await Models.Ticker.findOneAndUpdate({
      symbol: ticker.symbol,
    }, ticker, {
      upsert: true
    }).exec()
  }

  console.log(`[${new Date()}] Done.`)
  mongoose.disconnect()
}