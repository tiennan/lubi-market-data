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
  console.log('Run fetchTicker')
  const delay = 500
  const TickersLimit = 200
  let matchedTickers = []
  let markets = await exchange.loadMarkets()

  console.log('markets count: ' + exchange.symbols.length)
  for (key in markets) {
    if (markets[key].quote === 'USDT' || markets[key].quote === 'BUSD') {
      let ticker = await exchange.fetchTicker(key)
      ticker.count = ticker.info.count || 0
      console.log(`${key}: ${ticker.count}`)
      matchedTickers.push(ticker)
      
      await new Promise (resolve => setTimeout (resolve, delay))
    }
  }
  console.log(`Total matched tickers count: ${matchedTickers.length}`)
  matchedTickers.sort((a, b) => {
    return a.count - b.count
  }).reverse()

  console.log(`Saving top ${TickersLimit} tickers...`)
  for (let i = 0; i < matchedTickers.length && i < TickersLimit; i++) {
    let ticker = matchedTickers[i]
    await Models.Ticker.findOneAndUpdate({
      symbol: ticker.symbol,
    }, ticker, {
      upsert: true
    }).exec()
  }
  console.log('done.')
  mongoose.disconnect()
}