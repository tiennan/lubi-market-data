const mongoose = require('mongoose')
const Config = require('../config')

const Schema = mongoose.Schema

/**
 * See:
 * https://github.com/ccxt/ccxt/wiki/Manual#ticker-structure
 */
const tickerSchema = new Schema({
  symbol: String,
  timestamp: Number,
  datetime: String,
  high: Number,
  low: Number,
  bid: Number,
  bidVolume: Number,
  ask: Number,
  askVolume: Number,
  vwap: Number,
  open: Number,
  close: Number,
  last: Number,
  previousClose: Number,
  change: Number,
  percentage: Number,
  // average: undefined,
  baseVolume: Number,
  quoteVolume: Number,
  count: Number, // from info.count
  hasOHLCV: Boolean,
})
tickerSchema.index({ symbol: 1 })
tickerSchema.index({ datetime: -1 })
tickerSchema.index({ symbol: 1, datetime: -1 })

const dailyOHLCVSchema = new Schema({
  symbol: String, // Symbol
  date: Date,
  open: Number,
  high: Number,
  low: Number,
  close: Number,
  volume: Number,
  minutes: {
    open: [Number],
    high: [Number],
    low: [Number],
    close: [Number],
    volume: [Number],
  },
})
dailyOHLCVSchema.statics.parseTOHLCVArray = function(tohlcvArray) {
  if (!tohlcvArray) return null
  return {
    date: new Date(tohlcvArray[0]),
    open: tohlcvArray[1],
    high: tohlcvArray[2],
    low: tohlcvArray[3],
    close: tohlcvArray[4],
    volume: tohlcvArray[5],
  }
}
dailyOHLCVSchema.statics.pushMinute = function(dailyObj, tohlcvArray) {
  if (!dailyObj.minutes) {
    dailyObj.minutes = {
      open: [],
      high: [],
      low: [],
      close: [],
      volume: [],
    }
  }
  if (tohlcvArray && tohlcvArray.length === 6) {
    let idxOfDay = tohlcvArray[0] % 86400000 / 60000 // 0 ~ 1439
    if (dailyObj.minutes.close.length > 0 && idxOfDay > dailyObj.minutes.close.length) {
      let lastClose = dailyObj.minutes.close[dailyObj.minutes.close.length - 1]
      for (let i = dailyObj.minutes.close.length; i < idxOfDay; i++) {
        dailyObj.minutes.open.push(lastClose)
        dailyObj.minutes.high.push(lastClose)
        dailyObj.minutes.low.push(lastClose)
        dailyObj.minutes.close.push(lastClose)
        dailyObj.minutes.volume.push(0)
        console.log(`[Warn] ${dailyObj.symbol} ${dailyObj.date} miss the ${i} minutes data`)
      }
    }
    dailyObj.minutes.open.push(tohlcvArray[1])
    dailyObj.minutes.high.push(tohlcvArray[2])
    dailyObj.minutes.low.push(tohlcvArray[3])
    dailyObj.minutes.close.push(tohlcvArray[4])
    dailyObj.minutes.volume.push(tohlcvArray[5])
  }
}
dailyOHLCVSchema.statics.removeLastMinute = function(dailyObj) {
  if (dailyObj.minutes) {
    let newLength = dailyObj.minutes.close.length - 1
    dailyObj.minutes.open.length = newLength
    dailyObj.minutes.high.length = newLength
    dailyObj.minutes.low.length = newLength
    dailyObj.minutes.close.length = newLength
    dailyObj.minutes.volume.length = newLength
  }
}
dailyOHLCVSchema.statics.getMinutesLength = function(dailyObj) {
  if (!dailyObj.minutes) return 0
  return dailyObj.minutes.close.length
}
dailyOHLCVSchema.statics.verify = function(dailyObj) {
  if (!dailyObj.minutes || dailyObj.minutes.length > 1440) {
    throw new Error(dailyObj.toString())
    return false
  }
  return true
}

dailyOHLCVSchema.index({ symbol: 1, date: 1 })

const actionSchema = new Schema({
  type: String, // ActionTypeEnum
  symbol: String,
  date: Date,
  cost: Number,
  isTest: Boolean,
  status: String, // ActionStatusEnum
  triggers: {
    profitPrice: Number,
    lossPrice: Number,
    endTimeSecond: Number,
  },
  openInfo: { // Filled after status=OPEN
    datetime: Date,
    price: Number,
    amount: Number,
    cost: Number,
  },
  closeInfo: { // Filled after status=CLOSED
    datetime: Date,
    price: Number,
    amount: Number,
    cost: Number,
  },
  openBy: String, // Bot name
  closeBy: String, // ActionCloseByEnum
})

const ActionCloseByEnum = {
  TRIGGER_PROFIT: 'TRIGGER_PROFIT',
  TRIGGER_LOSS: 'TRIGGER_LOSS',
  TRIGGER_ENDTIME: 'TRIGGER_ENDTIME',
  STOP_SIGNAL: 'STOP_SIGNAL',
}

const ActionTypeEnum = {
  BUY: 'BUY',
  SELL: 'SELL',
  STOP: 'STOP',
}
const ActionStatusEnum = {
  NEW: 'NEW',
  OPEN: 'OPEN',
  CLOSED: 'CLOSED',
  STOPPED: 'STOPPED',
}

module.exports = {
  tickerSchema,
  dailyOHLCVSchema,
  actionSchema,
  ActionTypeEnum,
  ActionStatusEnum,
  ActionCloseByEnum,
}
