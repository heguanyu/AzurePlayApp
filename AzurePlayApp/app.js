var createError = require('http-errors');
var express = require('express');
var path = require('path');
const bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
let gamestatus = require('./services/gamestatus');
let playerService = require('./services/playerService');
let cors = require('cors')

var app = express();
var port = 8089;
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

for(let i = 0; i < 15; i++) {
  playerService.createPlayer("id-" + i)
}

app.use('/gamestatus', gamestatus)
app.get('/', (req,res) => {
  res.sendFile(path.resolve(__dirname, './thegame/build', 'index.html'));
});
app.use(express.static(path.resolve(__dirname, './thegame/build')));


// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.json({ error: err })
});


// app.listen(port, () => {
//   console.log(`Server listening on the port::${port}`);
// });

module.exports = app;