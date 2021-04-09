const ti = require('technicalindicators')
const BaseBot = require('./basebot')
const Utils = require('../utils')
const Models = require('../models')

class KDBot extends BaseBot {
  constructor(symbol, budget) {
    super()
    this.symbol = symbol
    this.budget = budget
    this.balance = budget
    this.kline1h = null
    this.listDailyOHLCV = null

  }
  initData(listDailyOHLCV) {
    this.listDailyOHLCV = listDailyOHLCV
    this.kline1h = new Utils.Candlestick(listDailyOHLCV, '60m', [{
      // name: 'Stochastic',
      name: 'Custom_KD',
      params: {
        period: 9,
        signalPeriod:3,
      }
    }])
    // console.log(`${this.kline1h.close.length} ${this.kline1h.indicators[0].values.length}`)
  }
  makeDecision() {
    let currentOHLCV = this.listDailyOHLCV[this.listDailyOHLCV.length - 1]
    if (currentOHLCV.minutes.close.length % 60 !== 0) return;
    let currentPrice = currentOHLCV.close
    
    this.kline1h.increment(currentOHLCV)
    let lastCandle = this.kline1h.lastCandle

    let lineA = []
    let lineB = []
    this.kline1h.indicators[0].values.slice(Math.max(this.kline1h.indicators[0].values.length - 2, 0)).forEach((value) => {
      lineA.push(value.k)
      lineB.push(value.d)
    })
    let isCrossUp = ti.crossUp({lineA, lineB})[1]
    let isCrossDown = ti.crossDown({lineA, lineB})[1]
    // console.log(lastCandle.indicators[0].value)

    if (lastCandle.indicators[0].value.d > 75 && isCrossDown) {
      let action = new Models.Action({
        type: Models.ActionTypeEnum.STOP,
        symbol: this.symbol,
        status: Models.ActionStatusEnum.NEW, // ActionStatusEnum
        openBy: 'KDBot', // Bot name
      })
      return [action]
    }

    if (this.balance < this.budget * 0.1) return;
    
    if (lastCandle.indicators[0].value.d < 25 && isCrossUp) {
      let action = new Models.Action({
        type: Models.ActionTypeEnum.BUY,
        symbol: this.symbol,
        // date: Date,
        cost: this.balance,
        status: Models.ActionStatusEnum.NEW, // ActionStatusEnum
        triggers: {
          // profitPrice: currentPrice * 1.02,
          lossPrice: currentPrice * 0.98,
          endTimeSecond: 4 * 60 * 60,
        },
        openBy: 'KDBot', // Bot name
      })
      return [action]
    }
    return;
  }
}

module.exports = KDBot
