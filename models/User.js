const mongoose = require('mongoose')
const schema = new mongoose.Schema({
    id: {
        type: Number,
        required: true
    },
    ios: {
        type: Boolean,
        default: false
    },
    screenWidth: Number,
    screenHeight: Number,
})
module.exports = mongoose.model('User', schema)