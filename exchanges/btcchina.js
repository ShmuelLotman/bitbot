var colors      = require('colors'),
    _           = require('underscore'),
    Deferred    = require("promised-io/promise").Deferred,
    config      = require('./../config'),
    BTCChina    = require('btcchina'),
    utils       = require('../utils'),
    events      = require('events'),
    emitter     = new events.EventEmitter();

var btcchina = new BTCChina(config['btcchina'].apiKey, config['btcchina'].secret);

module.exports = {

    exchangeName: 'btcchina',

    balances: {},

    prices: {},

    hasOpenOrder: false,

    initialize: function () {
        emitter.on('orderNotMatched', this.checkOrderStatus);
        emitter.on('orderMatched', this.fetchBalance);
    },

    fetchBalance: function () {
        var deferred = new Deferred(),
            self = this;

        this.balances = {};

        btcchina.getAccountInfo(function (err, data) {
            if (!err) {
                _.each(data.result.balance, function (balance, idx) {
                    var amount = balance.amount;

                    self.balances[idx] = +amount;
                });

                self.hasOpenOrder = false;

                console.log('Balance for '.green + self.exchangeName + ' fetched successfully'.green);
            }
            else {
                console.log('Error when checking balance for '.red + self.exchangeName);
            }

            try {deferred.resolve();} catch (e) {}
        });

        setTimeout(function () {
            try { deferred.resolve();} catch (e){}
        }, config.requestTimeouts.balance);

        return deferred.promise;
    },

    createOrder: function (market, type, rate, amount) {
        console.log('Creating order for ' + amount + ' in ' + this.exchangeName + ' in market ' + market + ' to ' + type + ' at rate ' + rate);

        this.hasOpenOrder = true;

        // btcchina.createOrder(type,
        // }, function (err, data) {
        //     if (!err && data.success === 1) {
        //         deferred.resolve(true);
        //     }
        //     else {
        //         deferred.resolve(false);
        //     }
        // });
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

        btcchina.orderbook({market: market}, function (err, data) {
            if (!err) {
                self.prices.sell.price = _.first(data.bids)[0];
                self.prices.sell.quantity = _.first(data.asks)[1];

                self.prices.buy.price = _.last(data.asks)[0];
                self.prices.buy.quantity = _.last(data.bids)[1];

                console.log('Exchange prices for ' + self.exchangeName + ' fetched successfully!');
            }
            else {
                console.log('Error! Failed to get prices for ' + self.exchangeName);
            }

            try {deferred.resolve();} catch (e) {}
        });

        setTimeout(function () {
            try {deferred.resolve();} catch (e){}
        }, config.requestTimeouts.prices);

        return deferred.promise;
    },

    checkOrderStatus: _.debounce(function () {
        var deferred = new Deferred(),
            self = this,
            market = config[this.exchangeName].marketMap[config.market];

        btceTrade.activeOrders({pair: market}, function (err, data) {
            console.log('BTCE ORDER DATA: ', data);

            if (!err && data.error === 'no orders') {
                console.log('order for '.green + self.exchangeName + ' filled successfully!'.green);
                _.delay(emitter.emit, config.interval, 'orderMatched');
            }
            else {
                console.log('order for '.red + self.exchangeName + ' not filled yet!'.red);
                emitter.emit('orderNotMatched');
            }
        });
    }, config.interval)
};