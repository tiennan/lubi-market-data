const ti = require('technicalindicators')
ti.setConfig('precision', 10)

class Custom_KD extends ti.Stochastic {
  constructor(paramsStochasticInput) {
    super(paramsStochasticInput)
    this.period = paramsStochasticInput.period,
    this.signalPeriod = paramsStochasticInput.signalPeriod,
    this.customResult = []
  }
  getResult() {
    let originalResults = super.getResult()
    let newResults = []
    const alpha = (1 / this.signalPeriod)
    for (let i = 0 ;i < originalResults.length; i++) {
      // let RSVn = originalResults[i].k || 50
      // let Kn1 = 50
      let Dn1 = 50
      if (i > 0) {
        // Kn1 = newResults[i - 1].k
        Dn1 = newResults[i - 1].d
      }
      // let Kn = alpha * RSVn + (1 - alpha) * Kn1
      // let Dn = alpha * Kn + (1- alpha) * Dn1
      let Kn = originalResults[i].d || 50
      let Dn = alpha * Kn + (1- alpha) * Dn1
      newResults.push({
        k: Kn,
        d: Dn,
      })
    }
    this.customResult = newResults.slice()
    return newResults
  }
  nextValue(paramsStochasticInput) {
    const alpha = (1 / this.signalPeriod)
    let originalKD = super.nextValue(paramsStochasticInput)
    // let RSVn = originalKD.k
    // let Kn1 = this.customResult[this.customResult.length - 1].k
    let Dn1 = this.customResult[this.customResult.length - 1].d
    // let Kn = alpha * RSVn + (1 - alpha) * Kn1
    // let Dn = alpha * Kn + (1- alpha) * Dn1
    let Kn = originalKD.d || 50
    let Dn = alpha * Kn + (1- alpha) * Dn1

    let newKD = {
      k: Kn,
      d: Dn,
    }
    this.customResult.push(newKD)
    return newKD
  }
}

ti.Custom_KD = Custom_KD

module.exports = ti