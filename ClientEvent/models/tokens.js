var mongoose = require('mongoose');
var Schema = mongoose.Schema;


var tokenSchema = new Schema({
	 token: {
	 	type: String, 
	 	required: true, 
	 },
	 user: {
      type: Schema.Types.ObjectId,
      require: true,
      ref: "users"
	 }
});

module.exports = mongoose.model('tokens', tokenSchema);