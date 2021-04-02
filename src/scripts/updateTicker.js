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
  console.log(`[${new Date()}] Run updateTicker`)

  let tickers = await Models.Ticker.find()
  console.log(`Total tickers in database: ${tickers.length}`)
  let symbols = tickers.map(t => t.symbol)
  console.log(`Fetching all tickers...`)
  let tickersTable = await exchange.fetchTickers(symbols)
  let promises = []
  let newTickers = []
  symbols.forEach((symbol) => {
    let ticker = tickersTable[symbol]
    ticker.count = ticker.info.count || 0
    let p = Models.Ticker.updateOne({
      symbol,
    }, ticker)
    promises.push(p)
    newTickers.push(ticker)
  })
  console.log(`Updating all tickers...`)
  await Promise.all(promises)
  console.log(`Inserting all tickers into history...`)
  await Models.TickerHistory.insertMany(newTickers)

  console.log(`[${new Date()}] Done.`)
  mongoose.disconnect()
}