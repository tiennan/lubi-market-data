const Models = require('../models')

class MarketData {
  static async getDailyOHLCV(symbol, sinceDate) {
    let list = await Models.DailyOHLCV.find({
      symbol,
      date: { $gte: sinceDate }
    }).exec()
    return list
  }
  static async getTickers() {
    let tickers = await Models.Ticker.find()
    return tickers
  }
  static async getTicker(symbol) {
    let ticker = await Models.Ticker.findOne({
      symbol,
    }).exec()
    return ticker
  }
}

module.exports = MarketData