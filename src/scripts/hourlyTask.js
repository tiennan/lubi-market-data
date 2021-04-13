const mongoose = require('mongoose')

require('dotenv').config()
global.Config = require('../config')
const Utils = require('../utils')

console.log('connecting mongodb...')
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useFindAndModify: false,
}).then(() => {
  console.log('mongodb connected.')
  main()
},(err) => {
  console.log(err)
}
)


const main = async () => {
  console.log(`[${new Date()}] Run hourly task`)

  await Utils.Adviser.run()

  console.log(`[${new Date()}] Done.`)
  mongoose.disconnect()
}