var mongoose             = require('mongoose'),
    connection           = mongoose.connect('mongodb://bitbot:12345@162.243.22.198:27017/bitbot'),
    db                   = mongoose.connection,
    TradeModel           = require('./models/TradeModel'),
    ExchangeBalanceModel = require('./models/ExchangeBalanceModel'),
    _                    = require('underscore');

module.exports = {
    initialize: function () {
        ExchangeBalanceModel.initialize();
        TradeModel.initialize();

        db.on('error', console.error.bind(console, 'connection error:'));
        db.once('open', function () { console.log('connection open'); });
    },

    registerNewTrade: function (tradeData) {
        var tradeModel = TradeModel.getModel(),
            trade;

        trade = new tradeModel({
            market: tradeData.market,
            exchange1: {
                name: tradeData.ex1.name,
                buyPrice: tradeData.ex1.buyPrice,
                amount: tradeData.ex1.amount
            },
            exchange2: {
                name: tradeData.ex2.name,
                sellPrice: tradeData.ex2.sellPrice,
                amount: tradeData.ex2.amount
            },
            profit: tradeData.finalProfit,
            when: Date.now()
        });

        trade.save();
    },

    newExchangeBalance: function (exchangeName, exchangeBalance) {
        var exchangeBalanceModel = ExchangeBalanceModel.getModel(),
            balance,
            balanceArray = [];

        _.each(exchangeBalance, function (balance, idx) {
            if (balance > 0) {
                var obj = {
                    currency: idx,
                    amount: balance
                };

                balanceArray.push(obj);
            }
        }, this);

        balance = new exchangeBalanceModel({
            name: exchangeName,
            balances: balanceArray,
            when: Date.now()
        });

        balance.save();
    }
}