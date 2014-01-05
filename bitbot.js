var config = require('./config'),
    _ = require('underscore'),
    when = require('promised-io/promise').when,
    all = require('promised-io/promise').all,
    Deferred = require("promised-io/promise").Deferred;

module.exports = {

    exchangeMarkets: {
        'cryptsy': require('./exchanges/cryptsy'),
        'vircurex': require('./exchanges/vircurex'),
        'btce': require('./exchanges/btce')
    },

	start: function () {
        console.log("starting bot");
        this.startLookingAtPrices();
	},

    startLookingAtPrices: function () {
        var self = this,
            hasFoundArb = false,
            interval;
        
        var getExchangesInfo = function () {
            var group = all(self.exchangeMarkets['cryptsy'].getExchangeInfo(),
                            self.exchangeMarkets['vircurex'].getExchangeInfo(),
                            self.exchangeMarkets['btce'].getExchangeInfo()
                        ).then(function (array) {

                hasFoundArb = self.calculateArbOpportunity(array);

                //escaping the setInterval
                if (hasFoundArb) {
                    console.log("HAS fOUND ARB: ", hasFoundArb);
                    self.makeTrade(hasFoundArb);
                    clearInterval(interval);
                    console.log("INTERVAL ESCAPED!!!!");
                }
            });
        };

        interval = setInterval(getExchangesInfo, config.interval);
    },

    makeTrade: function (arb) {
        var ex1 = arb.ex1,
            ex2 = arb.ex2,
            self = this,
            maxAmount;

        when(self.checkBalances(self.exchangeMarkets[ex1.name], self.exchangeMarkets[ex2.name])
            ).then(function (array) {
                console.log("CHECK BALANCES RESULT: ", array);
                // this.exchangeMarkets[ex1.name].createOrder(config.market, 'buy', ex1.toBuy, config.tradeAmount); 
            });
    
    console.log('arb: ', arb);

    // this.exchangeMarkets[ex1.name].createOrder(config.market, 'buy', ex1.toBuy, config.tradeAmount);
    // this.exchangeMarkets[ex2.name].createOrder(config.market, 'sell', ex2.toSell, config.tradeAmount);
    },

    checkBalances: function (ex1, ex2) {
        var deferred = new Deferred(),
            group = all(
            ex1.getBalance('buy'),
            ex2.getBalance('sell')
            ).then(function (array) {
                if (array[0] > config.tradeAmount && array[1] > config.tradeAmount) {
                    deferred.resolve(true);
                }
                else {
                    deferred.resolve(false);
                }
            });

        return deferred.promise;
    },

    _getMaxAmount: function (arb) {

    },

    calculateArbOpportunity: function (exchanges) {
        var exArray = [],
            viability,
            arbFound = false;

        //compare all exchanges prices from each exchange with each other
        for (var i = 0; i < exchanges.length; i++) {
            var ex1 = exchanges[i];

            for (var j = 0; j < exchanges.length; j++) {
                var ex2 = exchanges[j];

                if (ex2.exchangeName !== ex1.exchangeName && !exArray[ex2.exchangeName]) {
                    arbFound = this.calculateViability(ex1, ex2);

                    if (arbFound) {
                        console.log("\007");
                        console.log('@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@');
                        console.log('Found a candidate!!!');
                        console.log('buy ' + config.tradeAmount + ' ltc for ' + arbFound.ex1.toBuy + ' in ' + arbFound.ex1.name + ' and sell ' + config.tradeAmount + ' ltc for ' + arbFound.ex2.toSell + ' in ' + arbFound.ex2.name);
                        console.log('@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@');

                        break;
                    }
                }
            }

            exArray[ex1.exchangeName] = true;
            if (arbFound) {
                break;
            }
        }
        return arbFound;
    },

    calculateViability: function (ex1, ex2) {
        var isViable = false;

        if (ex1.bestPrices.lowestBuyPrice.price < ex2.bestPrices.highestSellPrice.price) {
            isViable = this.calculateAfterFees(ex1, ex2);
        }
        else if (ex1.bestPrices.highestSellPrice.price > ex2.bestPrices.lowestBuyPrice.price) {
            isViable = this.calculateAfterFees(ex2, ex1);
        }

        return isViable;
    },

    calculateAfterFees: function (ex1, ex2) {
        var amount = config.tradeAmount,
            amountToBuy = (ex1.bestPrices.lowestBuyPrice.price * amount) * (1 - ex1.buyltcFee),
            amountToSell = (ex2.bestPrices.highestSellPrice.price * amount) * (1 - ex2.buybtcFee),
            maxAmount;

        if (amountToBuy - amountToSell > 0) {
            if (ex1.bestPrices.lowestBuyPrice.quantity < amount) {
                maxAmount = ex1.bestPrices.lowestBuyPrice.quantity;
            }

            if (ex2.bestPrices.highestSellPrice.quantity < maxAmount) {
                maxAmount = ex2.bestPrices.highestSellPrice.quantity;
            }

            return {
                ex1: {
                    name: ex1.exchangeName,
                    toBuy: ex1.bestPrices.lowestBuyPrice.price,
                    maxAmount: maxAmount
                },
                ex2: {
                    name: ex2.exchangeName,
                    toSell: ex2.bestPrices.highestSellPrice.price,
                    maxAmount: maxAmount
                }
            };
        }
        else {
            return false;
        }
    }
};