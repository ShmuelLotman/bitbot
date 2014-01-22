var https = require('https');
var url = require('url');
var crypto = require('crypto');
var querystring = require('querystring');
var util = require('util');

module.exports = FxBTC;

function FxBTC(username, password) {
  self = this;

  this.username = username;
  this.password = password;
  this.urlGet = 'https://data.fxbtc.com/api';
  this.urlPost = 'https://trade.fxbtc.com/api';
  this.nonce = this.getTimestamp(Date.now());

  this._login({
    username: username,
    password: password
  }, function (err, response) {
    if (!err) {
      self.token = response.token;
    }
  });
}

FxBTC.prototype.getTimestamp = function(time) {
  if (util.isDate(time)) {
    return Math.round(time.getTime() / 1000);
  }
  if (typeof time == 'string') {
    return this.getTimestamp(new Date(time));
  }
  if (typeof time == 'number') {
    return (time >= 0x100000000) ? Math.round(time / 1000) : time;
  }
  return 0;
};

FxBTC.prototype.getInfo = function(callback) {
  var self = this;

  if (!this.token) {
    console.log('IS FETCHING TOKEN');
    this._login({ username: self.username, password: self.password }, function (err, response) {
        if (!err) {
          self.token = response.token;
          
          var url = self.urlPost + '?op=get_info&token=' + self.token;

          self.getHTTPS(url, callback);
        }
        else {
          callback(true, JSON.parse(data));
        }
      });
  }
  else {
    var url = self.urlPost + '?op=get_info&token=' + self.token;
    self.getHTTPS(url, callback);
  }
};

FxBTC.prototype._login = function(params, callback) {
  var url = this.urlPost + '?op=get_token&username=' + params.username + '&password=' + params.password;

  console.log(url);
  this.getHTTPS(url, callback);
};

FxBTC.prototype._trade = function(params, callback) {
  this.query('trade', params, callback);
};

FxBTC.prototype.depth = function(params, callback) {
  if (!params) {
    params = {};
  }

  var url = this.urlGet + '?op=query_depth&symbol=' + params.pair;

  this.getHTTPS(url, callback);
};

FxBTC.prototype.query = function(method, params, callback) {
  var _this = this;
  var content = {
    'method': method,
    'nonce': ++this.nonce,
  };

  if (!!params && typeof(params) == 'object') {
    Object.keys(params).forEach(function (key) {
      if (key == 'since' || key == 'end') {
        value = _this.getTimestamp(params[key]);
      }
      else {
        value = params[key];
      }
      content[key] = value;
    });
  }

  content = querystring.stringify(content);

  var sign = crypto
    .createHmac('sha512', new Buffer(this.secret, 'utf8'))
    .update(new Buffer(content, 'utf8'))
    .digest('hex');

  var options = url.parse(this.urlPost + '/' + method);

  options.method = 'POST';
  options.headers = {
    'AuthKey': this.apiKey,
    'AuthSign': sign,
    'content-type': 'application/x-www-form-urlencoded',
    'content-length': content.length,
  };

  var req = https.request(options, function(res) {
    var data = '';
    res.setEncoding('utf8');
    res.on('data', function (chunk) {
      data+= chunk;
    });
    res.on('end', function() {
      callback(false, JSON.parse(data));
    });
  });

  req.on('error', function(err) {
    callback(err, null);
  });

  req.write(content);
  req.end();
};

FxBTC.prototype.ticker = function(params, callback) {
  if (!params) {
    params = {};
  }

  var url = this.urlGet + 'ticker/' + params.pair;

  this.getHTTPS(url, callback);
};

FxBTC.prototype.getHTTPS = function(getUrl, callback) {
  var options = url.parse(getUrl);
  options.method = 'GET';
  var req = https.request(options, function(res) {
    var data = '';
    res.setEncoding('utf8');
    res.on('data', function (chunk) {
      data+= chunk;
    });
    res.on('end', function() {
      if (data.charAt(0) === '<') {
        data = '{}';
      }
      callback(false, JSON.parse(data));
    });
  });

  req.on('error', function(err) {
    callback(err, null);
  });

  req.end();
};