
const request = require('request-promise-native'),
    _ = require('lodash'),
    config = require('./config.json')
    moment = require('moment');

const _DISCOVERY_URL = config.nubank.discovery_url,
    _HEADERS = {
        'Content-Type': 'application/json',
        'X-Correlation-Id': 'WEB-APP.jO4x1',
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/53.0.2785.143 Safari/537.36',
        'Origin': 'https://conta.nubank.com.br',
        'Referer': 'https://conta.nubank.com.br/'
    };

let _tokenExpirateDate,
    _feedUrl,
    _billsSummaryURl;

async function _doRequest(options) {
    try {
        return await request(_.assign({
            headers: _HEADERS,
            json: true
        }, options));
    } catch (err) {
        throw new Error(err.stack);
    }
}

async function _getLoginURL() {
    const url = await _doRequest({ uri: _DISCOVERY_URL });
    return url.login;
}

function _isAutheticated() {
    let now = moment(new Date()).format('YYYY-MM-DDTHH:mm:ss[Z]');
    return _tokenExpirateDate && moment(_tokenExpirateDate).isAfter(now);
}

module.exports = {
    async auth(user, password) {
        if (_.isEmpty(user) || _.isEmpty(password))
            throw new Error("USER_PASSWORD_REQUIRED");

        if (!_isAutheticated()) {
            const loginURL = await _getLoginURL();

            const body = {
                'grant_type': 'password',
                'login': user,
                'password': password,
                'client_id': 'other.conta',
                'client_secret': 'yQPeLzoHuJzlMMSAjC-LgNUJdUecx8XO'
            };

            let data = await _doRequest({
                method: 'POST',
                uri: loginURL,
                body: body
            });

            _HEADERS['Authorization'] = `Bearer ${data.access_token}`;
            _feedUrl = data._links.events.href;
            _billsSummaryURl = data._links.bills_summary.href;
            _tokenExpirateDate = data.refresh_before;

        }
        console.log('User authenticated successfully.');

        return true;
    },

    async getCardStatements() {
        if (!_isAutheticated())
            throw new Error("UNAUTHENTICATED_USER");

        let data = await _doRequest({ uri: _feedUrl });

        let cardStatements = _.filter(data.events, function (cs) {
            return cs.category == 'transaction';
        });

        return cardStatements;
    },

    async getOpenedBill() {
        if (!_isAutheticated())
            throw new Error("UNAUTHENTICATED_USER");

        let data = await request({ uri: _billsSummaryURl, headers: _HEADERS, json: true });
        let opened = data.bills.find(bill => bill.state == 'open');

        return opened;
    },

    async getOpenedBillDetails() {
        const opened = await this.getOpenedBill();
        const detailsURL = opened._links.self.href;

        const opnedDetails = await _doRequest({ uri: detailsURL });

        return opnedDetails.bill;
    },

    async getCurrentPurchases(date) {
        if (_.isEmpty(date) || !moment(date).isValid())
            throw new Error("INVALID_DATE");

        const openedBillDetails = await this.getOpenedBillDetails();
        const currentPurchases = _.filter(openedBillDetails.line_items, (item) => {
            return moment(item.post_date).isSame(date);
        });

        return currentPurchases;
    }
}