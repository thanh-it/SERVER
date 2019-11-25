var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var eventSchema = new Schema({
    title: {
        type: String, required: true, default: 'No name'
    },
    content: {
        line1: { type: String, default: null },
        line2: { type: String, default: null },
        line3: { type: String, default: null },
    },
    image: [{type: String, default: null}
    ],
    lastdate: {
        type: String, default: null
    },
    create_by: {
        type: Schema.Types.ObjectId,  ref: "users"
    },
    date: {
        type: Date, default: Date.now()
    }
});

module.exports = mongoose.model('events', eventSchema);