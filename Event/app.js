var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

const session = require('express-session');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);

app.use(
  session({
    secret: 'keyboard cat',
    name: 'argon.sid',
    resave: false,
    saveUninitialized: true,
    cookie: {
      secure: true,
      expires: Date.now() + parseInt(3600000, 10),
      maxAge: parseInt(3600000, 10),
    },
  })
);
var hbs = require('hbs');
hbs.registerHelper('if_eq', function(a, b, opts) {
  if (a == b) {
    return opts.fn(this);
  } else {
    return opts.inverse(this);
  }
});
hbs.registerHelper('if_eqa', function(a, b, opts) {
  if (a != b) {
    return opts.fn(this);
  } else {
    return opts.inverse(this);
  }
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});
var mongoose = require('mongoose');
let dev_db_url = 'mongodb://localhost:27017/EventCheck';
let mongoDB = process.env.MONGODB_URI || dev_db_url;
mongoose.connect(mongoDB, {useNewUrlParser: true, useCreateIndex: true});
mongoose.Promise = global.Promise;
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
// catch 404 and forward to error handler
// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.json({status: "Lỗi", message: "Kiểm tra lại"})
  // res.status(err.status || 500);
  // res.render('error');
});

module.exports = app;
