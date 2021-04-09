const MarketData = require('./marketdata')
const Trade = require('./trade')
const Models = require('../models')

const daysPreload = 10

class BackTest {
  constructor(symbol, sinceDate, bot) {
    this.symbol = symbol
    this.sinceDate = sinceDate
    this.bot = bot
    this.dailyOHLCVList = []
    this.currentOHLCVList = []
    this.tickersTable = {}
    this.initPrice = 0
  }
  async init() {
    let loadFromDate = new Date(this.sinceDate)
    loadFromDate.setDate(loadFromDate.getDate() - daysPreload)
    this.dailyOHLCVList = await MarketData.getDailyOHLCV(this.symbol, loadFromDate)
    console.log(`Got ${this.dailyOHLCVList.length} days OHLCV data from ${loadFromDate}`)
    for (let i = 0; i < this.dailyOHLCVList.length; i++) {
      if (this.dailyOHLCVList[i].date >= this.sinceDate) break;

      this.currentOHLCVList.push(this.dailyOHLCVList[i])
    }
    let tickers = await MarketData.getTickers()
    tickers.forEach((ticker) => {
      this.tickersTable[ticker.symbol] = ticker
    })

    this.initPrice = this.currentOHLCVList[this.currentOHLCVList.length - 1].close
    this.finalPrice = this.dailyOHLCVList[this.dailyOHLCVList.length - 1].close

    this.bot.initData(this.currentOHLCVList)
  }
  async run() {
    let nowDate = null
    for (let i = 0; i < this.dailyOHLCVList.length; i++) {
      if (this.dailyOHLCVList[i].date < this.sinceDate) continue;
      console.log(`Running ${this.dailyOHLCVList[i].date}...`)
      for (let j = 0; j < this.dailyOHLCVList[i].minutes.close.length; j++) {
        let lastOHLCV = null
        if (j === 0) {
          lastOHLCV = new Models.DailyOHLCV({
            symbol: this.dailyOHLCVList[i].symbol,
            date: this.dailyOHLCVList[i].date,
            open: this.dailyOHLCVList[i].minutes.open[0],
            high: this.dailyOHLCVList[i].minutes.high[0],
            low: this.dailyOHLCVList[i].minutes.low[0],
            close: this.dailyOHLCVList[i].minutes.close[0],
            volume: this.dailyOHLCVList[i].minutes.volume[0],
          })
          this.currentOHLCVList.push(lastOHLCV)
        } else {
          lastOHLCV = this.currentOHLCVList[this.currentOHLCVList.length - 1]
          lastOHLCV.high = Math.max(lastOHLCV.high, this.dailyOHLCVList[i].minutes.high[j])
          lastOHLCV.low = Math.min(lastOHLCV.low, this.dailyOHLCVList[i].minutes.low[j])
          lastOHLCV.close = this.dailyOHLCVList[i].minutes.close[j]
          lastOHLCV.volume += this.dailyOHLCVList[i].minutes.volume[j]
        }
        lastOHLCV.minutes.open.push(this.dailyOHLCVList[i].minutes.open[j])
        lastOHLCV.minutes.high.push(this.dailyOHLCVList[i].minutes.high[j])
        lastOHLCV.minutes.low.push(this.dailyOHLCVList[i].minutes.low[j])
        lastOHLCV.minutes.close.push(this.dailyOHLCVList[i].minutes.close[j])
        lastOHLCV.minutes.volume.push(this.dailyOHLCVList[i].minutes.volume[j])

        this.tickersTable[this.symbol].close = lastOHLCV.close

        nowDate = new Date(lastOHLCV.date.getTime() + (j+1) * 60000)
        // console.log(`Check at ${nowDate}`)
        let balanceChange = 0
        balanceChange = await Trade.reviewTriggers(this.tickersTable, nowDate)
        if (balanceChange) {
          this.bot.balance += balanceChange
          console.log(`Balance: ${this.bot.balance}`)
        }
        let actions = this.bot.makeDecision(this.currentOHLCVList)
        if (actions && actions.length > 0) {
          for (let k = 0; k < actions.length; k++) {
            actions[k].isTest = true
            actions[k].date = nowDate
            balanceChange = await Trade.order(actions[k], this.tickersTable)
            if (balanceChange) {
              this.bot.balance += balanceChange
              console.log(`Balance: ${this.bot.balance}`)
            }
          }
        }
      }
    }

    let stopTestAction = new Models.Action({
      type: Models.ActionTypeEnum.STOP,
      symbol: this.symbol,
      isTest: true,
      date: nowDate,
      status: Models.ActionStatusEnum.NEW, // ActionStatusEnum
      openBy: 'Backtest', // Bot name
    })
    let balanceChange = await Trade.order(stopTestAction, this.tickersTable)
    if (balanceChange) {
      this.bot.balance += balanceChange
      console.log(`Balance: ${this.bot.balance}`)
    }
    this.report()
  }

  report() {
    console.log(`Initial balance: ${this.bot.budget}`)
    let totalHoldingMinutes = 0
    let profitCount = 0
    let lossCount = 0
    Trade.actionList.forEach((action) => {
      let holdingMinutes = (action.closeInfo.datetime - action.openInfo.datetime) / 60000
      totalHoldingMinutes += holdingMinutes
      let profit = action.closeInfo.cost - action.openInfo.cost
      let profitString = (profit > 0)? `+${profit}` : `${profit}`
      console.log(`${action.type} ${action.openInfo.datetime} ${action.openInfo.price} => ${action.closeInfo.datetime} ${action.closeInfo.price} : ${profitString} ${action.closeBy}(${holdingMinutes}min)`)

      if (profit > 0) {
        profitCount++
      } else {
        lossCount--
      }
    })
    console.log(`Final balance: ${this.bot.balance}`)
    let profitRate = (this.bot.balance - this.bot.budget) / this.bot.budget * 100
    console.log(`Profit rate: ${profitRate.toFixed(2)}%`)
    let baseRate = (this.finalPrice - this.initPrice) / this.initPrice * 100
    console.log(`Base rate: ${baseRate.toFixed(2)}%`)
    let tradeCount = Trade.actionList.length
    console.log(`Trade count: ${tradeCount}`)
    console.log(`Win rate: ${(profitCount / tradeCount * 100).toFixed(2)}%`)
    console.log(`Avg hoding time: ${(totalHoldingMinutes/tradeCount).toFixed(2)} min`)
  }
}

module.exports = BackTest