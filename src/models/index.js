const mongoose = require('mongoose')
const schemas = require('./schemas')

module.exports = {
  Ticker: mongoose.model('Ticker', schemas.tickerSchema),
  TickerHistory: mongoose.model('TickerHistory', schemas.tickerSchema),
  DailyOHLCV: mongoose.model('DailyOHLCV', schemas.dailyOHLCVSchema),
  Action: mongoose.model('Action', schemas.actionSchema),
  ActionTypeEnum: schemas.ActionTypeEnum,
  ActionStatusEnum: schemas.ActionStatusEnum,
  ActionCloseByEnum: schemas.ActionCloseByEnum,
}