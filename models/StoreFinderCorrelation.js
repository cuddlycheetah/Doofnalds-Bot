const mongoose = require('mongoose')
const schema = new mongoose.Schema({
    place_id: String,
    query: String,
    latitude: Number,
    longitude: Number,
    store: {
        type: mongoose.Types.ObjectId,
        ref: 'Store'
    },
    lastRefresh: Date,
})
module.exports = mongoose.model('StoreFinderCorrelation', schema)