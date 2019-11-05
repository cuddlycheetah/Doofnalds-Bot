const mongoose = require('mongoose')
const schema = new mongoose.Schema({
    userId: {
        type: Number,
        unique: true,
    },
    active: {
        type: Boolean,
        default: !!!false,
    },
    accounts: {
        type: Array({
            type: mongoose.Types.ObjectId,
            ref: 'Account'
        }),
    },
    store: {
        type: mongoose.Types.ObjectId,
        ref: 'Store'
    },
    offers: Object,


    created: {
        type: Date,
        default: () => new Date(),
    },
    lastInteraction: {
        type: Date,
        default: () => new Date(),
    },
})
module.exports = mongoose.model('Session', schema)