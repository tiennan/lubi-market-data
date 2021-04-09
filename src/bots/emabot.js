const ti = require('technicalindicators')
const BaseBot = require('./basebot')
const Utils = require('../utils')
const Models = require('../models')

class EMABot extends BaseBot {
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
    this.kline1h = new Utils.Candlestick(listDailyOHLCV, '15m', [{
      name: 'EMA',
      params: {
        period: 5,
      }
    }, {
      name: 'EMA',
      params: {
        period: 20,
      }
    }])
    // console.log(`${this.kline1h.close.length} ${this.kline1h.indicators[0].values.length}`)
  }
  makeDecision() {
    let currentOHLCV = this.listDailyOHLCV[this.listDailyOHLCV.length - 1]
    if (currentOHLCV.minutes.close.length % 15 !== 0) return;
    
    this.kline1h.increment(currentOHLCV)
    let lastCandle = this.kline1h.lastCandle
    let lastSecondCandle = this.kline1h.lastSecondCandle
    let currentPrice = currentOHLCV.close

    const ratioThreshold = 0.05
    const ratioThreshold1 = 0.02
    let currentRatio = (lastCandle.indicators[0].value - lastSecondCandle.indicators[0].value) / lastSecondCandle.indicators[0].value * 100
    let currentRatio1 = (lastCandle.indicators[1].value - lastSecondCandle.indicators[1].value) / lastSecondCandle.indicators[1].value * 100
    // console.log(currentRatio)
    // console.log(currentRatio)
    if (currentRatio < -(ratioThreshold * 2)) {
      let action = new Models.Action({
        type: Models.ActionTypeEnum.STOP,
        symbol: this.symbol,
        status: Models.ActionStatusEnum.NEW, // ActionStatusEnum
        openBy: 'EMABot', // Bot name
      })
      return [action]
    }

    if (this.balance < this.budget * 0.1) return;

    if (currentRatio > ratioThreshold && currentRatio1 > -ratioThreshold1) {
      let action = new Models.Action({
        type: Models.ActionTypeEnum.BUY,
        symbol: this.symbol,
        // date: Date,
        cost: this.balance,
        status: Models.ActionStatusEnum.NEW, // ActionStatusEnum
        triggers: {
          // profitPrice: currentPrice * 1.02,
          // lossPrice: currentPrice * 0.98,
          endTimeSecond: 2 * 60 * 60,
        },
        openBy: 'EMABot', // Bot name
      })
      return [action]
    }
    
    return;
  }
}

module.exports = EMABot
