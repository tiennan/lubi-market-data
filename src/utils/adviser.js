const Sender = require('./sender')
const Common = require('./common')
const Models = require('../models')
const MarketData = require('./marketdata')
const Candlestick = require('./candlestick')

class Adviser {
  static async run() {
    await Adviser.cycleChecker()
  }
  static async cycleChecker() {
    console.log(`[${new Date()}] Run cycleChecker`)
    const today = Common.getTodayDate()
    const todayISOString = today.toISOString()
  
    let tickers = await Models.Ticker.find({
      hasOHLCV: true,
      datetime: { $gt: todayISOString },
    })
    console.log(`Total tickers to be checked: ${tickers.length}`)
    let symbols = tickers.map(t => t.symbol)
  
    const daysPreload = 15
    let loadFromDate = Common.getTodayDate()
    loadFromDate.setDate(loadFromDate.getDate() - daysPreload)
  
    let toBuy1 = []
    let toBuy2 = []
    let toSell1 = []
    let priceMap = {}
  
    for (let i = 0; i < symbols.length; i++) {
      let symbol = symbols[i]
      console.log(`Checking ${symbol}`)
      let listDailyOHLCV = await MarketData.getDailyOHLCV(symbol, loadFromDate)
      if (listDailyOHLCV.length < daysPreload) continue;
  
      let kDaily = new Candlestick(listDailyOHLCV, '1d', [{
        name: 'Custom_KD',
        params: {
          period: 9,
          signalPeriod:3,
        }
      }])
      let kHourly = new Candlestick(listDailyOHLCV, '1h', [{
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
        priceMap[symbol] = kDaily.lastCandle.close
      } else if (kDaily.lastCandle.indicators[0].value.k < 30 && kHourly.lastCandle.indicators[0].value.k < 20) {
        toBuy2.push(symbol)
        priceMap[symbol] = kDaily.lastCandle.close
      } else if (kDaily.lastCandle.indicators[0].value.k > 90) {
        toSell1.push(symbol)
        priceMap[symbol] = kDaily.lastCandle.close
      }
    }
  
    let message = ''
    console.log('toBuy1 list:')
    toBuy1.forEach((symbol) => {
      console.log(symbol)
      let symbolLabel = symbol.replace('/', '_')
      message += `[買入1] ${symbol} ${priceMap[symbol]}\n`
    })
    console.log('toBuy2 list:')
    toBuy2.forEach((symbol) => {
      console.log(symbol)
      let symbolLabel = symbol.replace('/', '_')
      message += `[買入2] ${symbol} ${priceMap[symbol]}\n`
    })
    console.log('toSell1 list:')
    toSell1.forEach((symbol) => {
      console.log(symbol)
      let symbolLabel = symbol.replace('/', '_')
      message += `[過熱] ${symbol} ${priceMap[symbol]}\n`
    })

    if (message) {
      Sender.toTG(message)
    }
  
    console.log(`[${new Date()}] Done.`)
  }
}

module.exports = Adviser