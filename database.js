const config = require('./config')
const mongoose = require('mongoose')
mongoose.connect(config.mongodbURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: true,
    dbName: config.mongodbName
})
mongoose.Promise = global.Promise
const Models = require('./models')
module.exports = { mongoose, Models }