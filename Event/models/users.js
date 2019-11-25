var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var userSchema = new Schema({
    name: {
        type: String,
        default: 'No name'
    },
    email: {
        type: String,
        default: 'support@thanhit.com'
    },
    phone: {
        type: String,
        default: 0943428321
    },
    password: {
        type: String,
        default: 'a'
    },
    birthday: {
        type: String,
        default: '22/02/2222'
    },
    qrcode: {
        type: String,
        default: 'ádsa'
    },
    image: {
        type: String,
        default: 'https://baogialai.com.vn/dataimages/201905/original/images2772176_1Mat_na_bun__Huy_Tinh.jpg'
    },
    type_user: {
        type: String,
        default: 'MEMBER',
        enum: ['MEMBER', 'CREATOR', 'ADMIN']
    }
});

module.exports = mongoose.model('users', userSchema);