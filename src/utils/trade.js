const Models = require('../models')

const actionList = []

class Trade {
  static async order(action, tickersTable) {
    let balanceChange = 0
    switch(action.type) {
      case Models.ActionTypeEnum.BUY:
      case Models.ActionTypeEnum.SELL:
        if (action.isTest) {
          let ticker = tickersTable[action.symbol]
          action.openInfo = {
            datetime: action.date,
            price: ticker.close,
            amount: (action.cost / ticker.close),
            cost: action.cost,
          }
        } else {
          // TODO: Call createOrder()
        }
        action.status = Models.ActionStatusEnum.OPEN
        actionList.push(action)
        balanceChange = -action.openInfo.cost
        console.log(action)
        break;
      case Models.ActionTypeEnum.STOP:
        for (let i = 0; i < actionList.length; i++) {
          if (actionList[i].symbol === action.symbol && actionList[i].status === Models.ActionStatusEnum.OPEN) {
            if (action.isTest) {
              let ticker = tickersTable[action.symbol]
              actionList[i].closeInfo = {
                datetime: action.date,
                price: ticker.close,
                amount: actionList[i].openInfo.amount,
                cost: actionList[i].openInfo.amount * ticker.close,
              }
            } else {
              // TODO: Call createOrder()
            }
            actionList[i].closeBy = Models.ActionCloseByEnum.STOP_SIGNAL
            actionList[i].status = Models.ActionStatusEnum.CLOSED
            balanceChange = actionList[i].closeInfo.cost
            console.log(actionList[i])
          }
        }
        break;
    }
    
    return balanceChange
  }
  static async reviewTriggers(tickersTable, nowDate) {
    let balanceChange = 0
    for (let i = 0; i < actionList.length; i++) {
      if (!actionList[i].triggers) continue;
      if (actionList[i].status === Models.ActionStatusEnum.OPEN) {
        let ticker = tickersTable[actionList[i].symbol]
        // console.log(ticker.close)
        if (actionList[i].triggers.endTimeSecond && nowDate.getTime() >= (actionList[i].openInfo.datetime.getTime() + actionList[i].triggers.endTimeSecond * 1000)) {
          actionList[i].closeBy = Models.ActionCloseByEnum.TRIGGER_ENDTIME
        } else if (actionList[i].type === Models.ActionTypeEnum.BUY) {
          if (actionList[i].triggers.profitPrice && ticker.close >= actionList[i].triggers.profitPrice) {
            actionList[i].closeBy = Models.ActionCloseByEnum.TRIGGER_PROFIT
          } else if (actionList[i].triggers.lossPrice && ticker.close <= actionList[i].triggers.lossPrice) {
            actionList[i].closeBy = Models.ActionCloseByEnum.TRIGGER_LOSS
          }
        } else if (actionList[i].type === Models.ActionTypeEnum.SELL){
          if (actionList[i].triggers.profitPrice && ticker.close <= actionList[i].triggers.profitPrice) {
            actionList[i].closeBy = Models.ActionCloseByEnum.TRIGGER_PROFIT
          } else if (actionList[i].triggers.lossPrice && ticker.close >= actionList[i].triggers.lossPrice) {
            actionList[i].closeBy = Models.ActionCloseByEnum.TRIGGER_LOSS
          }
        }

        if (actionList[i].closeBy) {
          if (actionList[i].isTest) {
            actionList[i].closeInfo = {
              datetime: nowDate,
              price: ticker.close,
              amount: actionList[i].openInfo.amount,
              cost: actionList[i].openInfo.amount * ticker.close,
            }
          } else {
            // TODO: Call createOrder()
          }
          actionList[i].status = Models.ActionStatusEnum.CLOSED
          console.log(actionList[i])
          balanceChange += actionList[i].closeInfo.cost
        }
      }
    }
    return balanceChange
  }
}
Trade.actionList = actionList

module.exports = Trade