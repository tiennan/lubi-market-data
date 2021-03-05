const mongoose = require('mongoose')
const schemas = require('./schemas')

module.exports = {
  Ticker: mongoose.model('Ticker', schemas.tickerSchema),
  DailyOHLCV: mongoose.model('DailyOHLCV', schemas.dailyOHLCVSchema),
}