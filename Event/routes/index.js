var express = require('express');
var fs = require('fs');
var router = express.Router();
const multer = require('multer');
const shortid = require('shortid');
const nodemailer = require('nodemailer');
const User = require('../models/users');
const Event = require('../models/events');
const Token = require('../models/tokens');
const Join = require('../models/join');
const RegCreator = require('../models/regcreators');
var Jimp = require("jimp");
var QRCodes = require('qrcode');
const excel = require('exceljs');
function makeid(length) {
  var result = '';
  var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}
function isAutheticated(req, res, next) {
  if (req.query.access_token || req.body.access_token) {
    var q = req.query.access_token || req.body.access_token;
    Token.findOne({
      token: q
    })
      .populate('user')
      .exec((err, access_token) => {
        if (err || !access_token) return res.json({
          status: 'access_token invalid'
        });
        req.user = access_token.user;
        next();
      })
  } else if (req.session.user) {
    req.user = req.session.user;
    next();
  } else res.json({
    status: 'Vui lòng đăng nhập'
  });
}
function isCreator(req, res, next) {
  if (req.query.access_token || req.body.access_token) {
    var q = req.query.access_token || req.body.access_token;
    Token.findOne({
      token: q
    }).populate('user').exec(async (err, access_token) => {
      if (err || !'access_token') {
        return res.json({
          status: 'access_token invalid'
        });
      } else if (access_token.user.type_user == 'CREATOR') {
        req.user = access_token.user;
        next();
      } else res.json({
        status: 'Lỗi'
      });
    })
  } else if (req.session.user && req.session.user.type_user == 'ADMIN') {
    next();
  } else if (req.session.user && req.session.user.type_user == 'CREATOR') {
    next();
  } else res.json({
    status: 'Lỗi'
  });
}
function isAdmin(req, res, next) {
  if (req.session.user && req.session.user.type_user == 'ADMIN') {
    next();
  } else if (req.query.acces_token || req.body.access_token) {
    var q = req.query.acces_token || req.body.access_token;
    Token.findOne({
      token: q
    }).populate('user').exec((err, access_token) => {
      if (err || !'access_token') return res.json({
        error: 'access_token invalid'
      });
      if (access_token.user.type_user == 'ADMIN') {
        req.session.user = access_token.user;
        next();
      } else res.json({
        error: 'Unauthorized'
      });
    })
  } else res.json({
    error: 'Unauthorized'
  });
}
function normalize(str) {
  return str.trim().toLowerCase();
}
var storage = multer.diskStorage({
  // nơi lưu trữ ảnh đc upload lên server
  destination: function (req, file, cb) {
    cb(null, "./public/uploads");
  },
  // quy định tên file đc upload lên : cấu hình tên file - giữ nguyên tên file gốc
  filename: function (req, file, cb) {
    cb(null, shortid.generate() + '.' + file.originalname.split('.')[1]);
  }
});
var upload = multer({
  storage: storage
});
//Đăng ký tài khoản
router.post("/users/register", function (req, res, next) {
  var {
    name, email, password, phone, birthday,
  } = req.body;
  User.findOne({ email: normalize(email) }).select('_id email').exec(async (err, data) => {
    if (data) return res.json({ status: 'Lỗi', message: 'Tài khoản đã tồn tại' })
    var segs = email + '|' + name + '|' + birthday;
    var link = './public/uploads/' + makeid(8) + '.png';
    await QRCodes.toFile(link, segs, {
      color: {
        dark: '#000000',  // Blue dots
        light: '#0000' // Transparent background
      }
    }, function (err) {
      if (err) throw err
    })
    var model = new User({
      name: name,
      email: normalize(email),
      password: password,
      phone: phone,
      birthday: birthday,
      qrcode: link.replace('./public', '').replace(/\\/g, "/")
    });
    await model.save(err => {
      if (err) res.json({
        status: err.message //"Lưu không thành công"
      })
      else {
        res.json({
          status: 'OK',
          message: 'Đăng ký thành công tài khoản'
        }).end();
      }
    });
  })

});
//User
router.get('/users', (req, res) => {
  User.findOne({}).exec((err, user) => {
    if (user) res.json({ user })
  });
});
//Đăng nhập
router.post('/users/login', (req, res) => {
  User.findOne({
    email: normalize(req.body.email),
    password: req.body.password
  }).exec((err, user) => {
    if (err) return res.json({ status: err });
    if (user) {
      var access_token = new Token({
        user: user._id,
        token: makeid(32) + Date.now()
      });
      access_token.save(err => {
        if (err) return res.json({
          status: err
        });
        res.json({
          user: user,
          access_token: access_token.token,
          status: 'OK',
          message: 'Đăng nhập thành công'
        });
      });
    } else res.json({
      message: "Lỗi đăng nhập",
      status: 'False'
    }).end();
  });
});
//Đăng xuất
router.get('/users/logout', (req, res) => {
  req.session.destroy();
  res.json({
    status: 'OK',
    message: ''
  });
});
//Quên mật khẩu
router.post('/users/reset-password', (req, res) => {
  if (!req.body.email || req.body.email == null) {
    return res.json({
      status: 'Lỗi', message: 'Kiểm tra lại'
    })
  }
  User.findOne({ email: normalize(req.body.email) }).exec((err, user) => {
    if (err) return res.json({
      status: 'Lỗi', message: 'Kiểm tra lại'
    })
    var token = Date.now() + makeid(6);
    var tokens = new Token();
    tokens.user = user.email;
    tokens.token = token;
    tokens.save(function (err) {
      if (err) return res.json({ status: 'Lỗi', message: 'Kiểm tra lại' });
    })
    var transporter = nodemailer.createTransport({ // config mail server
      service: 'Gmail',
      auth: {
        user: 'thanhntph06292@fpt.edu.vn',
        pass: '0166225914433__ok__'
      }
    });
    var mainOptions = { // thiết lập đối tượng, nội dung gửi mail
      from: 'Thanh IT',
      to: user.email,
      subject: 'Event & Check - Đặt lại mật khẩu',
      text:
        'Bạn đang nhận được điều này bởi vì bạn (hoặc người khác) đã yêu cầu đặt lại mật khẩu cho tài khoản của bạn.\n\n' +
        'Đây là đường dẫn xác nhận đặt lại mậu khẩu của bạn:\n\n' + '45.77.252.198/reset/' + token + '\n\n' +
        'Nếu bạn không yêu cầu điều này, xin vui lòng bỏ qua email này và mật khẩu của bạn sẽ không thay đổi.\n\n' +
        'Vui lòng bảo mật thông tin tài khoản của bạn.\n\n' +
        '------------------------------\n\n' +
        'Admin Event & Check\n\nHotline: 0943428321 (gặp Mr. Thành IT)\n\nAddress: FPT Polytechnic - Hà Nội'
    }
    transporter.sendMail(mainOptions, function (err, info) {
      if (err) return res.json({ status: 'Lỗi', message: 'Lỗi rồi' })
      res.json({ status: 'OK', message: 'Vui lòng kiểm tra email để lấy mật khẩu mới' })
    });
  });
});
//Thay đỏi mật khẩu
router.get('/reset/:cId', async (req, res) => {
  var token = req.params.cId;
  await Token.findOne({ token: token }).exec(async (err, tokens) => {
    if (err) return res.json('Đừng hack tài khoản người khác chứ')
    if (tokens == null) return res.json('Không tồn tại đường dẫn')
    var email = tokens.user;
    var passwords = makeid(8);
    await User.findOne({ email: email }).select('_id email password phone').exec((err, users) => {
      if (err) return res.json({ status: 'Lỗi', message: 'Lỗi' });
      users.password = passwords;
      users.save(function (err) {
        if (err) return res.json(err);
        res.json('Thay đổi mật khẩu thành công. Mật khẩu của bạn mới là: ' + users.password + '. Vui lòng đăng nhập và cập nhật mới mật khẩu của bạn.')
      })
      Token.deleteMany({ token: { $in: tokens.token } }, (err, test) => {
        if (err) return res.json(err);
      });
    })

  })
})
//Thông tin người dùng
router.get('/profile', isAutheticated, (req, res) => {
  res.json({ profile: req.user, message: 'Thông tin cá nhân của bạn', status: 'OK' })
});
//Sửa thông tin
router.post('/profile', isAutheticated, upload.single('image'), (req, res) => {
  var edit_id = req.user._id;
  User.findOne({ _id: edit_id }).exec((error, users) => {
    if (error) return res.json({
      status: error
    });
    if (req.body.name != null) {
      users.name = req.body.name;
    }
    if (req.body.birthday != null) {
      users.birthday = req.body.birthday;
    }
    if (req.body.phone != null) {
      users.phone = req.body.phone;
    }
    if (req.body.password != null) {
      users.password = req.body.password;
    }
    if (req.file.image || req.file.image !== null) {
      var image = req.file.path.replace('public', '').replace(/\\/g, "/");
      fs.unlink('./public' + users.image, function (err) {
        if (err) {
          // handle the error - like res.send with status 500 etc.
        }
        users.image = image;
        Jimp.read('./public' + users.image, (err, lenna) => {
          if (err) throw err;
          lenna
            .resize(132, Jimp.AUTO) // set greyscale
            .write('./public' + users.image); // save
        });
      });
    }
    var segs = users.email + '|' + users.name + '|' + users.birthday;
    var link = './public/uploads/' + makeid(8) + '.png';
    QRCodes.toFile(link, segs, {
      color: {
        dark: '#000000',  // Blue dots
        light: '#0000' // Transparent background
      }
    }, function (err) {
      if (err) throw err
      console.log('done')
    })
    fs.unlink('./public' + users.qrcode, function (err) {
      if (err) {
        // handle the error - like res.send with status 500 etc.
      }
      users.qrcode = link.replace('./public', '').replace(/\\/g, "/");;
      users.save(function (err) {
        if (err) res.json({ status: err });
        else res.json({
          status: 'OK',
          message: 'Sửa thành công'
        });
      })
    });

  })
});

//Lấy danh sách sự kiên
router.get('/events', isAutheticated, (req, res) => {
  Event.find({}).populate('users').sort({ lastdate: 'desc' }).exec((err, event) => {
    if (err) return res.json({
      error: err
    });
    res.json({ events: event, message: 'Lấy danh sách thành công', status: 'OK' }).end();
  });
});
//Check trang tạo sự kiện của CREATOR
router.get('/events/creator', isCreator, (req, res) => {
  res.json({ status: 'OK', message: '200' })
});
router.post('/reg/creator', isAutheticated, (req, res) => {
  RegCreator.findOne({ reg_by: req.user._id }).exec((err, data) => {
    if (err) return res.json({
      status: 'Lỗi', message: 'Không tìm được dữ liệu'
    })
    if (data) {
      return res.json({
        status: 'Lỗi', message: 'Vui lòng chờ Admin xác nhận'
      })
    }
    var reg = new RegCreator();
    reg.date = Date.now();
    reg.reg_by = req.user;
    reg.save(err => {
      if (err) return res.json({
        error: err
      });
      res.json({
        status: 'OK',
        message: 'Bạn đã đăng ký tạo sự kiện'
      })
    });
  })

});
//Tạo sự kiện
router.post('/events/create', isCreator, upload.fields([{ name: 'image', maxCount: 2 }]), async (req, res) => {
  var event = new Event();
  event.create_by = req.user._id;
  event.title = req.body.title;
  event.content.line1 = req.body.line1;
  event.content.line2 = req.body.line2;
  event.content.line3 = req.body.line3;
  var images = [];
  if (req.files != null) {
    req.files.image.forEach(function (element) {
      images.push(element.path.replace('public', '').replace(/\\/g, "/"))
      Jimp.read('./public' + element.path.replace('public', '').replace(/\\/g, "/"), (err, lenna) => {
        if (err) throw err;
        lenna
          .resize(Jimp.AUTO, 250) // set greyscale
          .write('./public' + element.path.replace('public', '').replace(/\\/g, "/")); // save
      });
    });
  }
  event.image = images;
  event.lastdate = req.body.lastdate;
  await event.save(err => {
    if (err) return res.json({
      error: err
    });
    res.json({
      status: 'OK',
      message: 'Bạn đã tạo sự kiện thành công'
    })
  });
});
//Sửa sự kiện
router.post('/events/edit', isCreator, upload.fields([{ name: 'image', maxCount: 2 }]), (req, res) => {
  var e = req.query.id_event || req.body.id_event;
  Event.findOne({ _id: e, create_by: req.user._id }).exec((err, event) => {
    if (err) return res.json({ status: 'Lỗi', message: err })
    console.log(event);
    event.title = req.body.title;
    event.content.line1 = req.body.line1;
    event.content.line2 = req.body.line2;
    event.content.line3 = req.body.line3;
    var images = [];
    if (req.files.image || req.files.image !== null) {
      for (var i = 0; i < req.files.image; i++) {
        images.push(req.files.image[i].path.replace('public', '').replace(/\\/g, "/"))
      }
      event.image = images;
    }
    event.lastdate = req.body.lastdate;
    event.date = Date.now();
    event.save(function (err) {
      if (err) res.json(err);
      else res.json({
        success: 'OK',
        message: 'Sửa thành công'
      });
    })
  })
});
//Tham gia sự kiện
router.post('/events/join', isAutheticated, (req, res) => {
  var join = new Join();
  Join.findOne({ qrcode: req.user._id, event_join: req.body.event_id }).exec((err, joined) => {
    if (joined) return res.json({ status: 'False', message: 'Bạn đã tham gia sự kiện rồi' });
    join.qrcode = req.user._id;
    join.event_join = req.body.event_id;
    join.save(err => {
      if (err) return res.json({
        error: err
      });
      res.json({
        status: 'OK',
        message: 'Bạn đã tham gia sự kiện thành công'
      }).end();
    });
  })
});
//Lịch sử tạo sự kiện
router.get('/history/created', isCreator, (req, res) => {
  Event.find({ create_by: req.user._id }).populate('user').sort({ date: 'desc' }).exec((err, events) => {
    if (err) return res.json({
      error: err
    });
    res.json({ events: events, status: 'OK', message: 'Danh sách tạo' });
  })
});
//Lịch sử tham gia sự kiện
router.get('/history/joined', isAutheticated, (req, res) => {
  Join.find({ qrcode: req.user._id }).populate('event_join').sort({ date: 'desc' }).exec((err, events) => {
    if (err) return res.json({
      status: err
    });
    res.json({ events: events, profile: req.user, status: 'OK', message: 'Danh sách tham gia' });
  })
});
//Tải về thống kê người tham gia sự kiện
router.post('/events/downloads', isCreator, (req, res) => {
  var event_id = req.body.event_join;
  console.log(event_id)
  Join.find({ event_join: event_id }).populate('event_join').populate('qrcode').sort({ date: 'desc' }).exec(async (err, events) => {
    if (err) return res.json({
      status: err
    });
    if (events.length < 1) {
      return res.json({ status: 'Lỗi', message: 'Không có dữ liệu tham gia' })
    }
    var datas = [];
    for (var i = 0; i < events.length; i++) {
      await datas.push({ name: events[i].qrcode.name, email: events[i].qrcode.email, phone: events[i].qrcode.phone, birthday: events[i].qrcode.birthday, name_event: events[i].event_join.title, date_join: events[i].date, status: events[i].check });
    }
    let workbook = new excel.Workbook();
    let worksheet = workbook.addWorksheet('Danh sách tham gia');
    worksheet.columns = [
      { header: 'Tên', key: 'name', width: 20 },
      { header: 'Email', key: 'email', width: 20 },
      { header: 'Số điện thoại', key: 'phone', width: 30 },
      { header: 'Sinh nhật', key: 'birthday', width: 10 },
      { header: 'Tên sự kiện', key: 'name_event', width: 20 },
      { header: 'Ngày tham gia', key: 'date_join', width: 20 },
      { header: 'Trạng thái', key: 'status', width: 10 }
    ];
    worksheet.addRows(datas);
    var link = './public/datas/' + Date.now() + '.xlsx';
    await workbook.xlsx.writeFile(link)
      .then(function () {
        res.json({ status: 'OK', message: link.replace('./public', '') })
      });
  })
});
//Kiểm tra tính hợp lệ của khách mời
router.post('/check-info', isCreator, (req, res) => {
  User.findOne({ email: req.body.user_join }).exec((err, user) => {
    if (err) return res.json({ status: 'Lỗi', message: err });
    Join.findOne({ event_join: req.body.event_id, qrcode: user._id }).populate('qrcode').exec((err, join) => {
      if (err) return res.json({ status: 'Lỗi', message: 'Không tìm được thông tin người tham gia' });
      console.log(join)
      if (join == null) {
        return res.json({ status: 'Lỗi', message: user.name + ' chưa đăng ký tham gia sự kiện!' })
      }
      if (join.check == 'USED') {
        return res.json({ status: 'Lỗi', message: join.qrcode.name + ' đã kiểm tra tham gia rồi!' })
      } else {
        join.check = 'USED';
        join.save(err => {
          if (err) return res.json({
            error: err
          });
          res.json({
            status: 'OK',
            message: 'Thông tin ' + join.qrcode.name + ' hợp lệ!'
          }).end();
        });
      }
    })
  })
})
module.exports = router;