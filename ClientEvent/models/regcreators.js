var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var regSchema = new Schema({
    date: {
        type: Date, required: true, default: Date.now()
    },
    reg_by: {
        type: Schema.Types.ObjectId, require: true, ref: "users"
    }
});

module.exports = mongoose.model('regcreator', regSchema);