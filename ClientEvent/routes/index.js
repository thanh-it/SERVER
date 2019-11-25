var express = require('express');
var router = express.Router();
const User = require('../models/users');
const Event = require('../models/events');
const Token = require('../models/tokens');
const Join = require('../models/join');
const RegCreator = require('../models/regcreators');

/* GET home page. */
router.get('/', async (req, res, next) => {
  var event_count = 0, join = 0, user_count = 0, users = [];
  await User.find({}).select('email type_user name phone birthday qrcode image').exec((err, data) => {
    user_count = data.length;
    users = data;
  })
  await Event.find({}).select('_id').exec((err, events) => {
    event_count = events.length
  })
  await Join.find({}).select('_id').exec((err, joins) => {
    join = joins.length
  })
  await User.find({ type_user: 'CREATOR' }).select('email type_user').exec((err, data) => {
    if (err) res.json({ status: err })
    res.render('index', { title: 'Trang chủ', user_count: user_count, creator_count: data.length, join_count: join, event_count: event_count, users: users })
  })
});
router.get('/creator', async (req, res) => {
  await RegCreator.find({}).populate('reg_by').exec((err, data) => {
    res.render('creator', { reg_creator: data })
  })
})
router.post('/creator/comfirm/:cId', (req, res) => {
  User.findOne({ _id: req.params.cId }).select('_id email phone name type_user').exec((err, user) => {
    if (err) return res.json({ status: 'Lỗi', message: 'Không tìm thấy người dùng' });
    user.type_user = 'CREATOR';
    user.save(err => {
      if (err) return res.json({ status: 'Lỗi', message: 'Cập nhật lỗi' })
      res.redirect('/creator');
    })
  })
})
router.get('/creator/cancel/:cId', (req, res) => {
  Token.deleteOne({ _id: req.params.cId }, function (err) {
    if (err) return handleError(err);
    res.redirect('/creator');
  });
})
router.get('/remove/:cId', async (req, res) => {
  await User.deleteOne({ _id: req.params.cId }, function (err) {
    if (err) return handleError(err);
    res.redirect('/');
  });
})
module.exports = router;
