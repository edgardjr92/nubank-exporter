const request = require('request-promise-native'),
    _ = require('lodash'),
    moment = require('moment'),
    config = require('./config.json');

const _BASE_URL = config.organizze.base_url,
    _HEADERS = {
        'Content-Type': 'application/json; charset=utf-8',
        'User-Agent': 'Edgard (santoos.ed@gmail.com)',
    };

async function _doRequest(options) {
    try {
        return await request(_.assign({
            headers: _HEADERS,
            json: true,
            auth: {
                user: config.organizze.user,
                password: config.organizze.password
            }
        }, options));
    } catch (err) {
        throw new Error(err.stack);
    }
}
module.exports = {
    async getCategoryByName(categoryName) {
        const categories = await _doRequest({
            uri: `${_BASE_URL}/categories`
        });

        return categories.find(category => category.name == categoryName);
    },

    async getAccountByName(accountName) {
        const accounts = await _doRequest({
            uri: `${_BASE_URL}/accounts`
        });

        return accounts.find(account => account.name = accountName);
    }, 
    
    async createTransaction(transaction, accountName, categoryName) {
        const category = await this.getCategoryByName(categoryName);
        const account = await this.getAccountByName(accountName);

        transaction['category_id'] = category.id;
        transaction['account_id'] = account.id;

        return await _doRequest({
            uri: `${_BASE_URL}/transactions`,
            method: 'POST',
            body: transaction
        });
    }
}