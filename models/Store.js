const mongoose = require('mongoose')
const schema = new mongoose.Schema({
    id: Number,
    externalId: Number,

    storeId: String,
    storeECPId: String,

    latitude: Number,
    longitude: Number,
    city: String,
    postalCode: String,
    address: String,
    street: String,
    phone: String,
    seoURL: {
        type: String,
        unique: true,
    },
    name1: String,
    name2: String,

    lastRefresh: Date,
})
module.exports = mongoose.model('Store', schema)