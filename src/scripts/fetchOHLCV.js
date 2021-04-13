const ccxt = require ('ccxt')
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

const exchange = new ccxt.binance({
  'apiKey': process.env.BINANCE_API_KEY,
  'secret': process.env.BINANCE_SECRET_KEY,
  'timeout': 30000,
  'enableRateLimit': true,
})

const main = async () => {
  console.log(`[${new Date()}] Run fetchOHLCV`)
  const delay = 500
  const now = new Date()
  let tickers = await Models.Ticker.find({
    hasOHLCV: true,
  })
  console.log(`Total tickers to be fetched: ${tickers.length}`)
  let symbols = tickers.map(t => t.symbol)
  console.log(`Fetching all OHLCVs...`)
  for (let i = 0; i < symbols.length; i++) {
    let symbol = symbols[i]
    let lastOHLCV = await Models.DailyOHLCV.findOne({ symbol }, null, { sort: { date: -1 } })
    let sinceDate = (lastOHLCV)? lastOHLCV.date : new Date('2020/1/1') // Get OHLCV from 2020/1/1 by default
    while(sinceDate < now) {
      console.log(`Fetching ${symbol} 1d since ${sinceDate} limit 500`)
      let listOHLCV = await exchange.fetchOHLCV(symbol, '1d', sinceDate.getTime(), 500)
      if (!listOHLCV || listOHLCV.length === 0) break;
      console.log(`count: ${listOHLCV.length}`)
      for (let j = 0; j < listOHLCV.length; j++) {
        let dailyObj = Models.DailyOHLCV.parseTOHLCVArray(listOHLCV[j])
        dailyObj.symbol = symbol
        let sinceDateTime = dailyObj.date.getTime()
        let currentMinutesLength = 0
        if (lastOHLCV && sinceDateTime === lastOHLCV.date.getTime()) {
          dailyObj.minutes = lastOHLCV.minutes
          Models.DailyOHLCV.removeLastMinute(dailyObj)
          currentMinutesLength = Models.DailyOHLCV.getMinutesLength(dailyObj)
          sinceDateTime += currentMinutesLength * 60 * 1000
        }

        console.log(`Fetching ${symbol} 1m since ${new Date(sinceDateTime)} limit 1000`)
        let minutesOHLCVList = await exchange.fetchOHLCV(symbol, '1m', sinceDateTime, 1000)
        console.log(`count: ${minutesOHLCVList.length}`)
        if (minutesOHLCVList.length === 0) {
          // To avoid [] case, skip whole day data
          console.log(`[Warn] ${dailyObj.symbol} ${dailyObj.date} miss whole day minutes data, skip this day.`)
          continue;
        }
        minutesOHLCVList.forEach((tohlcvArray) => {
          Models.DailyOHLCV.pushMinute(dailyObj, tohlcvArray)
        })
        currentMinutesLength = Models.DailyOHLCV.getMinutesLength(dailyObj)
        sinceDateTime = dailyObj.date.getTime() + currentMinutesLength * 60 * 1000
        if (sinceDateTime < now.getTime()) {
          let limit = Math.min(440, 1440 - currentMinutesLength)
          console.log(`Fetching ${symbol} 1m since ${new Date(sinceDateTime)} limit ${limit}`)
          minutesOHLCVList = await exchange.fetchOHLCV(symbol, '1m', sinceDateTime, limit)
          console.log(`count: ${minutesOHLCVList.length}`)
          minutesOHLCVList.forEach((tohlcvArray) => {
            Models.DailyOHLCV.pushMinute(dailyObj, tohlcvArray)
          })
        }
        if (Models.DailyOHLCV.verify(dailyObj)) {
          await Models.DailyOHLCV.findOneAndUpdate({
            symbol: dailyObj.symbol,
            date: dailyObj.date,
          }, dailyObj, {
            upsert: true
          }).exec()
          console.log(`${symbol} ${dailyObj.date} OHLCV added`)
        }
        await new Promise (resolve => setTimeout (resolve, delay))
      }
      sinceDate.setDate(sinceDate.getDate() + 500) // load more 500 days if need
    }
  }
  console.log(`[${new Date()}] Done.`)

  await Utils.Adviser.run()

  mongoose.disconnect()
}