const TelegramBot = require('node-telegram-bot-api')
require('dotenv').config()
const token = process.env.TELEGRAM_API_KEY
const bot = new TelegramBot(token)
const chatId = process.env.TELEGRAM_RECEIVER_ID

class Sender {
  static toTG(message) {
    bot.sendMessage(chatId, message);
  }
}

module.exports = Sender