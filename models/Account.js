const mongoose = require('mongoose')
const schema = new mongoose.Schema({
    active: {
        type: Boolean,
        default: false,
    },
    free: {
        type: Boolean,
        default: true,
    },
    created: {
        type: Date,
        default: () => new Date(),
    },
    email: String,
    deviceId: String,
    password: String,
    link: String,
    token: String,
    lastLogin: Date,
})
module.exports = mongoose.model('Account', schema)