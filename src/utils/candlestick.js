// const ti = require('technicalindicators')
// ti.setConfig('precision', 10)
const ti = require('./indicators')

const simpleInputIndicatorList = [
  'BollingerBands',
  'RSI',
  'SMA',
  'WEMA',
  'WMA',
  'EMA',
  'ROC',
  'TRIX',
]

class Candlestick {
  /**
   * 
   * @param {Array} dailyOHLCVList 
   * @param {String} timeframe 1m, 5m, 15m, 1h, 1d
   * @param {Array} indicators See https://github.com/anandanand84/technicalindicators
   */
  constructor(dailyOHLCVList, timeframe = '1d', indicators = []) {
    this.timeframe = timeframe
    this.date = []
    this.open = []
    this.high = []
    this.low = []
    this.close = []
    this.volume = []
    this.indicators = indicators

    this.convertDailyOHLCVToCandlesticks(dailyOHLCVList, timeframe)
    this.calculateIndicators()
  }
  get lastCandle() {
    return this.getLastNCandle()
  }
  get lastSecondCandle() {
    return this.getLastNCandle(1)
  }
  getLastNCandle(shift = 0) {
    let lastIdx = this.close.length - 1 - shift
    if (lastIdx < 0) return null
    return {
      date: this.date[lastIdx],
      open: this.open[lastIdx],
      high: this.high[lastIdx],
      low: this.low[lastIdx],
      close: this.close[lastIdx],
      volume: this.volume[lastIdx],
      indicators: this.indicators.map((indicator) => {
        return {
          name: indicator.name,
          params: indicator.params,
          value: indicator.values[indicator.values.length - 1 - shift], // may be undefined
        }
      })
    }
  }
  /**
   * Call it after each candle finished
   * @param {*} dailyOHLCV 
   */
  increment(dailyOHLCV) {
    
    let oldLength = this.date.length
    let removedCount = 0
    for (let i = 0; i < this.date.length; i++) {
      if (this.date[i] >= dailyOHLCV.date) {
        let newLength = i
        removedCount = oldLength - newLength
        this.date.length = newLength
        this.open.length = newLength
        this.high.length = newLength
        this.low.length = newLength
        this.close.length = newLength
        this.volume.length = newLength
        break;
      }
    }
    this.convertDailyOHLCVToCandlesticks([dailyOHLCV], this.timeframe)
    this.calculateNextValue()
    // console.log(`check: ${dailyOHLCV.date}`)
    // for (let i = this.date.length - 1; i >= 0; i--) {
    //   // console.log(this.date[i])
    //   if (this.date[i] >= dailyOHLCV.date) {
    //     console.log('fuck')

    //   }
    // }

    // let t1 = new Date()

    // let t2 = new Date()
    // console.log(`convertDailyOHLCVToCandlesticks cost: ${(t2-t1)}`)
    // if (removedCount > 0) { // recalculate whole indicators (slow!!)
    //   this.calculateIndicators()
    // } else {
    //   this.calculateNextValue()
    // }
    // let t3 = new Date()
    // console.log(`calculateIndicators cost: ${(t3-t2)}`)

    // let incrementCount = this.date.length - oldLength
    // return {
    //   date: this.date.slice(Math.max(this.date.length - incrementCount, 0)),
    //   open: this.open.slice(Math.max(this.open.length - incrementCount, 0)),
    //   high: this.high.slice(Math.max(this.high.length - incrementCount, 0)),
    //   low: this.low.slice(Math.max(this.low.length - incrementCount, 0)),
    //   close: this.close.slice(Math.max(this.close.length - incrementCount, 0)),
    //   volume: this.volume.slice(Math.max(this.volume.length - incrementCount, 0)),
    // }
  }

  convertDailyOHLCVToCandlesticks(dailyOHLCVList, timeframe) {
    if (timeframe === '1d') {
      dailyOHLCVList.forEach((daily) => {
        this.date.push(daily.date)
        this.open.push(daily.open)
        this.high.push(daily.high)
        this.low.push(daily.low)
        this.close.push(daily.close)
        this.volume.push(daily.volume)
      })
    } else if (timeframe === '1m'){
      dailyOHLCVList.forEach((daily) => {
        for (let i = 0; i < daily.minutes.close.length; i++) {
          this.date.push(new Date(daily.date.getTime() + i * 60000))
        }
        this.open.push(...daily.minutes.open)
        this.high.push(...daily.minutes.high)
        this.low.push(...daily.minutes.low)
        this.close.push(...daily.minutes.close)
        this.volume.push(...daily.minutes.volume)
      })
    } else if (timeframe.includes('m') || timeframe.includes('h')) {
      let period = 0
      if (timeframe.includes('m')) {
        period = Number(timeframe.split('m')[0])
      } else {
        period = Number(timeframe.split('h')[0]) * 60
      }
      dailyOHLCVList.forEach((daily) => {
        let periodIdx = 0
        let periodHigh = 0
        let periodLow = 0
        let periodVolume = 0
        for (let i = 0; i < daily.minutes.close.length; i++) {
          if (periodIdx === 0) {
            this.date.push(new Date(daily.date.getTime() + i * 60000))
            this.open.push(daily.minutes.open[i])
            periodHigh = daily.minutes.high[i]
            periodLow = daily.minutes.low[i]
            periodVolume = daily.minutes.volume[i]
          } else {
            periodHigh = Math.max(periodHigh, daily.minutes.high[i])
            periodLow = Math.min(periodLow, daily.minutes.low[i])
            periodVolume += daily.minutes.volume[i]
          }
          
          if (periodIdx === period - 1) {
            this.high.push(periodHigh)
            this.low.push(periodLow)
            this.volume.push(periodVolume)
            this.close.push(daily.minutes.close[i])
            periodIdx = 0
          } else {
            periodIdx++
          }
        }
      })
    } else {
      throw Error(`timeframe error: ${timeframe} not supported!`)
    }
  }

  calculateIndicators() {
    this.indicators.forEach((indicator) => {
      if (ti[indicator.name]) {
        let input = {
          open: this.open,
          high: this.high,
          low: this.low,
          close: this.close,
          values: this.close,
          volume: this.volume,
        }
        Object.assign(input, indicator.params)
        indicator.instance = new ti[indicator.name](input)
        indicator.values = indicator.instance.getResult()
        // indicator.values = ti[indicator.name].calculate(input)
      }
    })
  }
  calculateNextValue() {
    // let lastIdx = this.close.length - 1
    let lastCandle = this.lastCandle
    this.indicators.forEach((indicator) => {
      if (ti[indicator.name]) {
        if (simpleInputIndicatorList.includes(indicator.name)) {
          indicator.values.push(indicator.instance.nextValue(lastCandle.close))
        } else {
          let input = {
            open: [lastCandle.open],
            high: [lastCandle.high],
            low: [lastCandle.low],
            close: [lastCandle.close],
            values: [lastCandle.close],
            volume: [lastCandle.volume],
          }
          Object.assign(input, indicator.params)
          let results = indicator.instance.nextValue(input)
          indicator.values.push(results)
        }
        
      }
    })
  }


}

module.exports = Candlestick