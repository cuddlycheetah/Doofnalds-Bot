const config = require('../config')

const express = require('../node_modules/express')
const bodyParser = require('../node_modules/body-parser')
const querystring = require('../node_modules/querystring')

const microService = express()
microService.use(bodyParser.json(true))

// MongoDB
const { mongoose, Models } = require('../database')

// MCD API
const rqt = require('../node_modules/rqt')
const MCDSession = new rqt.Session({
    host: config.mcdEndpointLegacy,
    headers: config.mcdHeadersLegacy,
})

const login = async (botId) => {
    let dbId = mongoose.Types.ObjectId(botId)
    let $user = await Models.Account.findById(dbId)
    console.log('logging in', $user._id)
    const res = await MCDSession.jqt('/v2/customer/security/authentication?type=traditional', {
        method: 'POST',
        type: 'json',
        data: {
            password: $user.password,
            type: "email",
            loginUsername: $user.email,
        }
    })
    if (res.status == "ok") {
        await Models.Account.findByIdAndUpdate(dbId, {
            token: res.details.token,
            lastLogin: new Date(),
        })
        return true
    } else 
        console.error('logging in', $user._id, 'failed', res)
        return false
}
const redeemCode = async (userName, token, storeId, offerId, retryOnError) => {
    if (retryOnError == undefined) retryOnError = true
    console.log('redeemCode', userName, storeId, offerId, retryOnError)
    const res = await MCDSession.jqt('/v3/customer/offer/redemption', {
        method: 'POST',
        type: 'json',
        data: {
            "marketId": "DE",
            "application": "MOT",
            "languageName": "de-DE",
            "platform": "android",
            "offersIds": [`${ offerId }`],
            "storeId": storeId,
            "userName": userName,
        },
        headers: {
            'Authorization': `Bearer ${ token }`
        }
    })
    if (!!res.Data && !!res.Data.QrCode) {
        console.log('SUCC', res)
        return res
    } else {
        if (retryOnError) {
            switch (parseInt(res.statusCode)) {
                case 10022:
                case 10018:
                    console.log('not logged in')
                break;
                case -28006: //McDoofnald Exploded
                    console.error('McDoofnald Exploded')
                break;
            }
            let retry = await redeemCode(userName, token, storeId, offerId, false)
            return retry
        }
        console.error('error', res)
        return false
    }
}
const removeMCDType = (obj) => {
    for(prop in obj) {
        if (prop === '$type')
            delete obj[prop]
        else if (typeof obj[prop] === 'object')
            removeMCDType(obj[prop])
    }
}
const compressOffers = (users) => {
	let output = {}
	let uniqueOffers = {}
	let $users = Object.keys(users)
	for (let i=0;i < $users.length;i++) {
		let $user = $users[i]
		let $offers = users[ $user ]
		for (let j=0;j< $offers.length; j++) {
			let $offer = $offers[ j ]
			if (!uniqueOffers[ $offer.Id ]) {
				uniqueOffers[ $offer.Id ] = {
					...$offer,
					tokens: []
				}
			}
			uniqueOffers[ $offer.Id ].tokens.push($user)    
		}
	}
	return Object.values(uniqueOffers)
}
const customerOffer = async (userName, token, lat, lng, storeId, retryOnError) => {
    if (retryOnError == undefined) retryOnError = true
    const res = await MCDSession.jqt('/v3/customer/offer?' + querystring.stringify({
        marketId: 'DE',
        application: 'MOT',
        languageName:'de-DE',
        platform: 'ios',
        userName: userName,
        latitude: lat,
        longitude: lng,
        storeId: storeId || '[]'
    }), {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${ token }`
        }
    })
    if (!!res.ResultCode && parseInt(res.ResultCode) == 1) {
        console.log(res)
        return res
    } else {
        console.error('ERROR', res)
        if (retryOnError) {
            switch (parseInt(res.statusCode)) {
                case 10022:
                case 10018:
                    console.log('not logged in')
                break;
                case -28006: //McDoofnald Exploded
                    console.error('McDoofnald Exploded')
                break;
            }
            let retry = await customerOffer(userName, token, lat, lng, storeId, false)
            return retry
        }
        return false
    }
}

microService
    /** 
     * Creating a Session
     */
    .post('/sitzung/:user', async (req, res) => {
        const userId = parseInt(req.params.user)
        let freeAccounts = await Models.Account
            .count({ free: true, active: true })
            .limit(config.sessionManager.accountsPerSession);

        if (freeAccounts < config.sessionManager.accountsPerSession) {
            return res.status(500).json('Bitte versuchen sie es später erneut, es werden gerade neue Accounts erstellt.')
        }

        let accountsForSession = await Models.Account
            .find({ free: true, active: true })
            .limit(config.sessionManager.accountsPerSession);

        for (let account of accountsForSession) {
            await Models.Account.findByIdAndUpdate(account._id, { 
                free: false,
                lastLogin: new Date(),
            })
            await login(account._id)
        }

        if (await Models.Session.count({ userId: userId }) > 0) {
            await Models.Session.findOneAndDelete({ userId: userId })
        }
        let session = await Models.Session.create({
            userId: userId,
            accounts: accountsForSession.map(a => mongoose.Types.ObjectId(a._id)),
        })
        //console.log(session)
        res.json(session)
    })
    /**
     * Selecting a Restaurant and sending fetched Offers to rabbitmq
     */
    .post('/sitzung/:user/restaurant/:restaurant', async (req, res) => {
        const userId = parseInt(req.params.user)
        const restaurantId = mongoose.Types.ObjectId(req.params.restaurant)
        if (await Models.Session.count({ userId: userId }) > 0) {
            if (await Models.Store.count({ _id: restaurantId }) === 0) {
                return res.json('Fehler: Kein Restaurant mit dieser ID')
            }
            await Models.Session
                .findOne({ userId })
                .update({ store: restaurantId });
            const sessionData = await Models.Session
                .findOne({ userId })
                .populate('store')
                .populate('accounts');
            // ES6 <3
            const { latitude: storeLat, longitude: storeLon, storeId } = sessionData.store
            const output = {}
            for (let sessionAccount of sessionData.accounts) {
                let offers = await customerOffer(sessionAccount.email, sessionAccount.token, storeLat, storeLon, storeId)
                if (!offers || !offers.Data || offers.Data.length === 0) continue; // skip empty responses, in case they somehow are
                //offers.Data.map((offer) => console.log(offer.Archived, offer.Expired, offer.Redeemed))
                offers.Data = offers.Data.filter((offer) => !offer.Archived && !offer.Expired && !offer.Redeemed)
                offers.Data = offers.Data.map((offer) => {
                    removeMCDType(offer)
                    return offer
                })
                output[ sessionAccount._id.toString() ] = offers.Data
            }
            const cOffers = compressOffers(output)
            //console.log(JSON.stringify(cOffers, null, "\t"))
            await Models.Session
                .findOne({ userId })
                .update({ offers: cOffers })
            return res.json(cOffers)
        }
        res.json(false)
    })
    /**
     * Redeems the Offer
     */
    .get('/sitzung/:user/angebot/:offer', async (req, res) => {
        const userId = parseInt(req.params.user)
        const offerId = parseInt(req.params.offer)
        const sessionData = await Models.Session
            .findOne({ userId })
            .populate('store');
        let selectedOffer = sessionData.offers.filter((offer) => offer.Id === offerId)
        if (selectedOffer.length === 0) return res.json('Kein Angebot mit der ID gefunden')
        selectedOffer = selectedOffer[0]

        let offerResult = false
        for (let i in selectedOffer.tokens) {
            let offerAccountID = selectedOffer.tokens[ i ]
            try {
                // console.log('trying code redemtion with account', offerAccountID)
                let account = await Models.Account.findById(mongoose.Types.ObjectId(offerAccountID))
                offerResult = await redeemCode(account.email, account.token, sessionData.store.storeId, offerId)
            } catch (ex) {
                console.error(ex)
            }
        }
        if (!!offerResult) {
            removeMCDType(offerResult)
            if (offerResult.ResultCode == 1)
                return res.json(offerResult.Data)
        }
        res.json(false)
    })
microService.listen(config.sessionManager.port, config.sessionManager.host)