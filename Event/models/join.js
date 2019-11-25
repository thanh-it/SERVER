var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var joinSchema = new Schema({
    date: {
        type: Date, required: true, default: Date.now()
    },
    qrcode: {
        type: Schema.Types.ObjectId, require: true, ref: "users"
    },
    check:{
        type: String, default: 'USE',
        enum: ['USE', 'USED']
    },
    event_join: {
        type: Schema.Types.ObjectId, require: true, ref: "events"
    }
});

module.exports = mongoose.model('join', joinSchema);