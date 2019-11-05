const mongoose = require('mongoose')
const schema = new mongoose.Schema({
    place_id: String,
    query: String,
    name: String,
    latitude: Number,
    longitude: Number,
    lastRefresh: Date,
})
module.exports = mongoose.model('GoogleCacheResult', schema)