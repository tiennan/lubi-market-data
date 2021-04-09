const ti = require('technicalindicators')
const BaseBot = require('./basebot')
const Utils = require('../utils')
const Models = require('../models')

class BBBot extends BaseBot {
  constructor(symbol, budget) {
    super()
    this.symbol = symbol
    this.budget = budget
    this.balance = budget
    this.listDailyOHLCV = null

  }
  initData(listDailyOHLCV) {
    this.listDailyOHLCV = listDailyOHLCV
    this.kline1h = new Utils.Candlestick(listDailyOHLCV, '5m', [{
      name: 'BollingerBands',
      params: {
        period: 20,
        stdDev:2,
      }
    }])
  }
  makeDecision() {
    let currentOHLCV = this.listDailyOHLCV[this.listDailyOHLCV.length - 1]
    if (currentOHLCV.minutes.close.length % 5 !== 0) return;
    let currentPrice = currentOHLCV.close
    
    this.kline1h.increment(currentOHLCV)
    let lastCandle = this.kline1h.lastCandle
    let lastSecondCandle = this.kline1h.lastSecondCandle

    let priceLine = [lastSecondCandle.close, lastCandle.close]
    let middleLine = [lastSecondCandle.indicators[0].value.middle, lastCandle.indicators[0].value.middle]
    let upperLine = [lastSecondCandle.indicators[0].value.upper, lastCandle.indicators[0].value.upper]
    let lowerLine = [lastSecondCandle.indicators[0].value.lower, lastCandle.indicators[0].value.lower]

    // console.log({
    //   priceLine,
    //   middleLine,
    //   upperLine,
    //   lowerLine,
    // })

    let isCrossDownUpper = ti.crossDown({
      lineA: priceLine,
      lineB: upperLine,
    })[1]
    // let isCrossDownMiddle = ti.crossDown({
    //   lineA: priceLine,
    //   lineB: middleLine,
    // })[1]
    if (isCrossDownUpper) {
      let action = new Models.Action({
        type: Models.ActionTypeEnum.STOP,
        symbol: this.symbol,
        status: Models.ActionStatusEnum.NEW, // ActionStatusEnum
        openBy: 'BBBot', // Bot name
      })
      return [action]
    }

    if (this.balance < this.budget * 0.1) return;

    // let isCrossUpMiddle = ti.crossUp({
    //   lineA: priceLine,
    //   lineB: middleLine,
    // })[1]
    // if (isCrossUpMiddle) {
    //   let action = new Models.Action({
    //     type: Models.ActionTypeEnum.BUY,
    //     symbol: this.symbol,
    //     // date: Date,
    //     cost: this.balance,
    //     status: Models.ActionStatusEnum.NEW, // ActionStatusEnum
    //     triggers: {
    //       profitPrice: currentPrice * 1.02,
    //       lossPrice: currentPrice * 0.98,
    //       endTimeSecond: 4 * 60 * 60,
    //     },
    //     openBy: 'BBBot', // Bot name
    //   })
    //   return [action]
    // }

    let isCrossUpLower = ti.crossUp({
      lineA: priceLine,
      lineB: lowerLine,
    })[1]
    if (isCrossUpLower) {
      let action = new Models.Action({
        type: Models.ActionTypeEnum.BUY,
        symbol: this.symbol,
        // date: Date,
        cost: this.balance,
        status: Models.ActionStatusEnum.NEW, // ActionStatusEnum
        triggers: {
          profitPrice: currentPrice * 1.02,
          lossPrice: currentPrice * 0.98,
          endTimeSecond: 4 * 60 * 60,
        },
        openBy: 'BBBot', // Bot name
      })
      return [action]
    }

    return;
  }
}

module.exports = BBBot
