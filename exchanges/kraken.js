var colors          = require('colors'),
    _               = require('underscore'),
    Deferred        = require("promised-io/promise").Deferred,
    config          = require('./../config'),
    utils           = require('../utils'),
    KrakenClient    = require('kraken-api');

var kraken = new KrakenClient(config['kraken'].apiKey, config['kraken'].secret);

module.exports = {

    exchangeName: 'kraken',

    balances: {},

    prices: {},

    balancesMap: {
        'XXBT': 'btc',
        'XLTC': 'ltc'
    },

    getBalance: function () {
        var deferred = new Deferred(),
            self = this;

        this.balances = {};
        
        kraken.api('Balance', null, function (err, data) {
            if (!err) {
                _.each(data.result, function (balance, idx) {
                    self.balances[self.balancesMap[idx]] = +balance;
                });

                console.log('Balance for '.green + self.exchangeName + ' fetched successfully'.green);
            }
            else {
                console.log(err);
                console.log('Error when checking balance for '.red + self.exchangeName);
            }

            deferred.resolve();
        });

        return deferred.promise;
    },

    createOrder: function (market, type, rate, amount) {
        var deferred = new Deferred();

        //ugly ugly
        if (config.market === 'LTC_BTC') {
            type = type === 'buy' ? 'sell' : 'buy';
            rate = (1/rate).toFixed(5);
        }

        console.log('KRAKEN TEST!!!!!');
        console.log('market: ', market);
        console.log('type: ', type);
        console.log('rate: ', rate);
        console.log('amount: ', amount);

        amount = 0;

        console.log('Creating order for ' + amount + ' in ' + this.exchangeName + ' in market ' + market + ' to ' + type + ' at rate ' + rate);

        kraken.api('AddOrder', {
            pair: config[this.exchangeName].marketMap[market],
            type: type,
            ordertype: 'limit',
            rate: rate,
            amount: amount
        }, function (err, data) {
            console.log('KRAKEN ORDER RESPONSE!!');
            console.log('err: ', err);
            console.log('data: ', data);

            if (!err && data.success === 1) {
                deferred.resolve(true);
            }
            else {
                deferred.resolve(false);
            }
        });

        return deferred.promise;
    },

    calculateProfit: function (amount, decimals) {
        var sellFee = config[this.exchangeName].fees[config.market].sell;
        return utils.calculateProfit(amount, this.prices.sell.price, sellFee.currency, sellFee.percentage, decimals);
    },

    calculateCost: function (amount, decimals) {
        var buyFee = config[this.exchangeName].fees[config.market].buy;
        return utils.calculateCost(amount, this.prices.buy.price, buyFee.currency, buyFee.percentage, decimals);
    },

    getExchangeInfo: function () {
        var deferred = new Deferred(),
            market = config[this.exchangeName].marketMap[config.market],
            self = this;

        this.prices = {
            buy: {},
            sell : {}
        };

        console.log('Checking prices for '.yellow + this.exchangeName);

        kraken.api('Depth', {'pair': market, 'count': 10}, function (err, data) {

            if (!err) {
                var resultMarket = _.keys(data.result),
                    tempData = data.result[resultMarket];

                //ugly, but will do for now
                if (config.market === 'LTC_BTC') {
                    self.prices.sell.price = (1/_.first(tempData.asks)[0]).toFixed(5);
                    self.prices.sell.quantity = (_.first(tempData.asks)[1] * _.first(tempData.asks)[0]).toFixed(8);

                    self.prices.buy.price = (1/_.first(tempData.bids)[0]).toFixed(5);
                    self.prices.buy.quantity = (_.first(tempData.bids)[1] * _.first(tempData.bids)[0]).toFixed(8);
                }

                console.log(self.prices);

                console.log('Exchange prices for ' + self.exchangeName + ' fetched successfully!');
            }
            else {
                console.log('Error! Failed to get prices for ' + self.exchangeName);
            }

            deferred.resolve();
        });

        return deferred.promise;
    },

    checkOrderStatus: function () {
        var deferred = new Deferred(),
            self = this,
            market = config[this.exchangeName].marketMap[config.market];

        btceTrade.activeOrders({pair: market}, function (err, data) {
            console.log('BTCE ORDER DATA: ', data);

            if (!err && data.error === 'no orders') {
                deferred.resolve(true);
            }
            else {
                deferred.resolve(false);
            }
        });

        return deferred.promise;
    }
};