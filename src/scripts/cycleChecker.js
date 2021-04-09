const mongoose = require('mongoose')

require('dotenv').config()
global.Config = require('../config')
const Models = require('../models')
const Utils = require('../utils')

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

const toToday = () => {
  let today = new Date()
  today.setHours(0)
  today.setMinutes(0)
  today.setSeconds(0)
  today.setMilliseconds(0)
  return today
}

const main = async () => {
  console.log(`[${new Date()}] Run cycleChecker`)
  const delay = 500
  const now = new Date()
  const today = toToday()
  const todayISOString = today.toISOString()

  let tickers = await Models.Ticker.find({
    hasOHLCV: true,
    datetime: { $gt: todayISOString },
  })
  console.log(`Total tickers to be checked: ${tickers.length}`)
  let symbols = tickers.map(t => t.symbol)

  const daysPreload = 15
  let loadFromDate = toToday()
  loadFromDate.setDate(loadFromDate.getDate() - daysPreload)

  let toBuy1 = []
  let toBuy2 = []
  let toSell1 = []

  for (let i = 0; i < symbols.length; i++) {
    let symbol = symbols[i]
    console.log(`Checking ${symbol}`)
    let listDailyOHLCV = await Utils.MarketData.getDailyOHLCV(symbol, loadFromDate)
    if (listDailyOHLCV.length < daysPreload) continue;

    let kDaily = new Utils.Candlestick(listDailyOHLCV, '1d', [{
      name: 'Custom_KD',
      params: {
        period: 9,
        signalPeriod:3,
      }
    }])
    let kHourly = new Utils.Candlestick(listDailyOHLCV, '1h', [{
      name: 'Custom_KD',
      params: {
        period: 9,
        signalPeriod:3,
      }
    }])
    if (!kDaily.lastCandle || !kHourly.lastCandle) continue;
    console.log(`${kDaily.lastCandle.indicators[0].value.k}, ${kHourly.lastCandle.indicators[0].value.k}`)
    if (kDaily.lastCandle.indicators[0].value.k < 20 && kHourly.lastCandle.indicators[0].value.k < 20) {
      toBuy1.push(symbol)
    } else if (kDaily.lastCandle.indicators[0].value.k < 30 && kHourly.lastCandle.indicators[0].value.k < 20) {
      toBuy2.push(symbol)
    } else if (kDaily.lastCandle.indicators[0].value.k > 90) {
      toSell1.push(symbol)
    }
  }

  console.log('toBuy1 list:')
  toBuy1.forEach((symbol) => { console.log(symbol) })
  console.log('toBuy2 list:')
  toBuy2.forEach((symbol) => { console.log(symbol) })
  console.log('toSell1 list:')
  toSell1.forEach((symbol) => { console.log(symbol) })

  console.log(`[${new Date()}] Done.`)
  mongoose.disconnect()
}