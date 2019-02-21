'use strict';

const nu = require('./lib/nubank'),
  organizze = require('./lib/organizze'),
  _ = require('lodash'),
  moment = require('moment'),
  config = require('./lib/config.json');


function _generateDate(postDate) {
  return moment(postDate).add(1, 'M').date(6).format('YYYY-MM-DD');
}

module.exports.run = async (event, context) => {
  await nu.auth(config.nubank.user, config.nubank.password);

  const yesterday = moment(new Date()).subtract(1, 'd').format('YYYY-MM-DD');
  const purchases = await nu.getCurrentPurchases(yesterday);

  let response = {
    total: 0,
    data: [],
    msg: ''
  }

  if (_.isEmpty(purchases)) {
    response.msg = 'No new purchases to be registered.'
    return response;
  }

  for (const purchase of purchases) {
    if (purchase.category != 'Pagamento') {
      let transaction = {
        'description': purchase.title,
        'date': _generateDate(purchase.post_date),
        'amount_cents': -Math.abs(purchase.amount)
      }
      
      await organizze.createTransaction(transaction, 'Principal', 'Cartão');
      response.data.push(transaction);
      response.total++;
    }
  }
  response.msg = 'SUCCESS';
  
  console.log(response);
  return response;

};
