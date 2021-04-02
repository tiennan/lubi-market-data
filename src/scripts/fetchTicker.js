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
  let busdOHLCVLimit = 50
  
  let markets = await exchange.loadMarkets()

  console.log('markets count: ' + exchange.symbols.length)

  for (key in markets) {
    if (key === 'BUSD/USDT') continue
    if (markets[key].quote === 'USDT' || markets[key].quote === 'BUSD') {
      let ticker = await exchange.fetchTicker(key)
      ticker.count = ticker.info.count || 0
      if (ticker.count === 1) continue // ignore not exist case
      if (key.includes('UP/') || key.includes('DOWN/')) continue
      if (markets[key].quote === 'USDT') {
        matchedUSDTTickers.push(ticker)
      } else if (markets[key].quote === 'BUSD') {
        matchedBUSDTickers.push(ticker)
      }
      console.log(`${key}: ${ticker.quoteVolume} ${ticker.count}`)
      await new Promise (resolve => setTimeout (resolve, delay))
    }
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