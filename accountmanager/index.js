const config = require('../config')
const every =  require('every')


// MongoDB
const { mongoose, Models } = require('../database')


// MCD API
const UUID = require('uuid')
const rqt = require('../node_modules/rqt')
const MCDSession = new rqt.Session({
    host: config.mcdEndpointLegacy,
    headers: config.mcdHeadersLegacy,
})


const imapAuth = config.accountManager.imapAuth
const MailListener = require('mail-listener2')
const mailListener = new MailListener({
    ...imapAuth,
    connTimeout: 10000,
    authTimeout: 10000,
    // debug: console.log,
    tlsOptions: { rejectUnauthorized: false },
    mailbox: config.accountManager.imapMailbox,
    searchFilter: ['UNSEEN'],
    markSeen: true,
    fetchUnreadOnStart: true,
})

function generatePass(plength){
    var keylistalpha="abcdefghijklmnopqrstuvwxyz";
    var keylistint="123456789";
    var keylistspec="!@#_";
    var temp='';
    var len = plength/2;
    var len = len - 1;
    var lenspec = plength-len-len;

    for (i=0;i<len;i++)
        temp+=keylistalpha.charAt(Math.floor(Math.random()*keylistalpha.length));

    for (i=0;i<lenspec;i++)
        temp+=keylistspec.charAt(Math.floor(Math.random()*keylistspec.length));

    for (i=0;i<len;i++)
        temp+=keylistint.charAt(Math.floor(Math.random()*keylistint.length));

        temp=temp.split('').sort(function(){return 0.5-Math.random()}).join('');
    return temp;
}

const makeAccount = async() => {
    const BOTID = mongoose.Types.ObjectId()
    const MAIL = BOTID + config.accountManager.mailSuffix
    const PW = generatePass(8) + 'aA.'
    const deviceId = UUID.v4()
    console.log('creating account', MAIL)
    const res = await MCDSession.aqt('/v2/customer/security/account?type=traditional', {
        method: 'POST',
        type: 'json',
        data: {
            "password": PW,
            "profile": {
                "base": {
                    "address": [
                        { "activeInd": "Y", "allowPromotions": "Y", "details": [{ "addressLineDetails": { "zipCode": config.accountManager.mcdRegZipCode }, "addressLocale": "de-DE" }], "primaryInd": "Y", "addressType": "other" },
                    ],
                    "email": [
                        { "activeInd": "Y", "emailAddress": MAIL, "primaryInd": "Y", "type": "personal" },
                    ],
                    "firstName": config.accountManager.mcdRegFirstName,
                    "lastName": config.accountManager.mcdRegLastName,
                    "username": MAIL
                },
                "extended": {
                    "devices": [
                        {
                            "brand": "privacymatters",
                            "deviceId": deviceId,
                            "deviceIdType": "AndroidId",
                            "isActive": "Y",
                            "language": "de-DE",
                            "manufacturer": "privacymatters",
                            "model": "privacymatters",
                            "os": "android",
                            "osVersion": "9",
                            "personalName": "PersonalMobile",
                            "sourceId": "MOT",
                            "timezone": "Europe/Berlin",
                            "token": "00000-0000:APA000000000000-00000000000000--0000000000000000000000000000000000000000000000000000000000000-000000000000000000000000000000000000000000000"
                        }
                    ],
                    "policies": {
                        "acceptancePolicies": [
                            { "acceptanceInd": "Y", "channelId": "M", "deviceId": deviceId, "isExpired": false, "name": "TermsOfUseAcceptanceType","sourceId": "MOT", "type": "1" }
                        ],
                        "accessPolicy": [
                            { "acceptanceInd": "Y", "channelId": "M", "deviceId": deviceId, "isExpired": false, "name": "PrivacyPolicyAcceptanceType", "sourceId": "MOT", "type": "2" }
                        ]
                    },
                    "preferences": [
                        { "details": { "Email": "de-DE", "legacyId": "1", "MobileApp": "de-DE" }, "isActive": "Y", "preferenceDesc": "PreferredLanguage", "preferenceId": "1", "label": "PreferredLanguage", "sourceId": "MOT", "type": "ecpLegacy" },
                        { "details": { "Email": "False", "legacyId": "2", "MobileApp": "False" }, "isActive": "N", "preferenceDesc": "DoesAcceptPromotion", "preferenceId": "2", "label": "DoesAcceptPromotion", "sourceId": "MOT", "type": "ecpLegacy" },
                        { "details": { "Email": "ByEmail", "legacyId": "3", "MobileApp": "ByEmail" }, "isActive": "Y", "preferenceDesc": "PreferredNotification", "preferenceId": "3", "label": "PreferredNotification", "sourceId": "MOT", "type": "ecpLegacy" },
                        { "details": { "Email": [], "legacyId": "18", "MobileApp": [] }, "isActive": "Y", "preferenceDesc": "PreferredOfferCategory", "preferenceId": "11", "label": "PreferredOfferCategory", "sourceId": "MOT", "type": "ecpLegacy" },
                        { "details": { "enabled": "Y" }, "isActive": "Y", "preferenceDesc": "FoodPreferenceFry", "preferenceId": "16", "sourceId": "MOT", "type": "FoodPreference" },
                        { "details": { "Email": "False", "legacyId": "6", "MobileApp": "True" }, "isActive": "Y", "preferenceDesc": "YourOffers", "preferenceId": "6", "label": "YourOffers", "sourceId": "MOT", "type": "ecpLegacy" },
                        { "details": { "Email": "False", "legacyId": "7", "MobileApp": "True" }, "isActive": "Y", "preferenceDesc": "LimitedTimeOffers", "preferenceId": "7", "label": "LimitedTimeOffers", "sourceId": "MOT", "type": "ecpLegacy" },
                        { "details": { "enabled": "Y" }, "isActive": "Y", "preferenceDesc": "FoodPreferenceBreakfast", "preferenceId": "12", "sourceId": "MOT", "type": "FoodPreference" },
                        { "details": { "enabled": "Y" }, "isActive": "Y", "preferenceDesc": "FoodPreferenceSandwich", "preferenceId": "13", "sourceId": "MOT", "type": "FoodPreference" },
                        { "details": { "enabled": "Y" }, "isActive": "Y", "preferenceDesc": "FoodPreferenceHappymeal", "preferenceId": "17", "sourceId": "MOT", "type": "FoodPreference" },
                        { "details": { "enabled": "Y" }, "isActive": "Y", "preferenceDesc": "FoodPreferenceDrink", "preferenceId": "15", "sourceId": "MOT", "type": "FoodPreference" },
                        { "details": { "enabled": "Y" }, "isActive": "Y", "preferenceDesc": "FoodPreferenceSalad", "preferenceId": "19", "sourceId": "MOT", "type": "FoodPreference" },
                        { "details": { "enabled": "Y" }, "isActive": "Y", "preferenceDesc": "FoodPreferenceChicken", "preferenceId": "14", "sourceId": "MOT", "type": "FoodPreference" },
                        { "details": { "Email": "False", "legacyId": "8", "MobileApp": "True" }, "isActive": "Y", "preferenceDesc": "PunchcardOffers", "preferenceId": "8", "label": "PunchcardOffers", "sourceId": "MOT", "type": "ecpLegacy" },
                        { "details": { "Email": "False", "legacyId": "9", "MobileApp": "True" }, "isActive": "Y", "preferenceDesc": "EverydayOffers", "preferenceId": "9", "label": "EverydayOffers", "sourceId": "MOT", "type": "ecpLegacy" },
                        { "details": { "enabled": "Y" }, "isActive": "Y", "preferenceDesc": "FoodPreferenceWrap", "preferenceId": "21", "sourceId": "MOT", "type": "FoodPreference" }
                    ],
                    "subscriptions": [
                        { "legacyId": "1", "legacyType": "optin", "optInStatus": "N", "sourceId": "MOT", "subscriptionDesc": "CommunicationChannel", "subscriptionId": "1" },
                        { "legacyId": "2", "legacyType": "optin", "optInStatus": "N", "sourceId": "MOT", "subscriptionDesc": "Surveys", "subscriptionId": "2" },
                        { "legacyId": "3", "legacyType": "optin", "optInStatus": "N", "sourceId": "MOT", "subscriptionDesc": "ProgramChanges", "subscriptionId": "3" },
                        { "legacyId": "4", "legacyType": "optin", "optInStatus": "N", "sourceId": "MOT", "subscriptionDesc": "Contests", "subscriptionId": "4" },
                        { "legacyId": "5", "legacyType": "optin", "optInStatus": "N", "sourceId": "MOT", "subscriptionDesc": "OtherMarketingMessages", "subscriptionId": "5" },
                        { "legacyId": "2", "legacyType": "sub", "optInStatus": "Y", "sourceId": "MOT", "subscriptionDesc": "OfferProgram", "subscriptionId": "7" },
                        { "legacyId": "5", "legacyType": "pref", "optInStatus": "Y", "sourceId": "MOT", "subscriptionDesc": "MobileNotificationEnabled", "subscriptionId": "11" },
                        { "legacyId": "5", "legacyType": "pref", "optInStatus": "N", "sourceId": "MOT", "subscriptionDesc": "EmailNotificationEnabled", "subscriptionId": "10" },
                        { "optInStatus": "Y", "sourceId": "MOT", "subscriptionDesc": "GeneralMarketing", "subscriptionId": "22" },
                        { "optInStatus": "N", "sourceId": "MOT", "subscriptionDesc": "PersonalMarketing", "subscriptionId": "23" }
                    ]
                }
            }
        },
    })
    //console.log(JSON.stringify(res.body, null, '\n'))
    await Models.Account.create({
        _id: BOTID,
        email: MAIL,
        deviceId: deviceId,
        password: PW,
    })
    return BOTID
}
const removeAccount = async(botId) => {
    let dbId = mongoose.Types.ObjectId(botId)
    console.log('removeAccount', dbId)
    let $user = await Models.Account.findById(dbId)
    const res = await MCDSession.jqt('/v2/customer/security/account', {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${ $user.token }`,
            'Content-Type': 'application/json',
        },
    })
    if (res.status == "ok") {
        await Models.Account.findByIdAndRemove(dbId) 
    } else  {
        console.log(res)
        return false
    }
}
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

async function handleMail(html, subject, toward, seqno) {
    try {
        let toMail = toward.replace('<', '').replace('>', '')
        if (subject == config.accountManager.mcdSubjectVerified) { // remove verified-mails
            mailListener.imap.seq.addFlags(seqno, '\\Seen', null)
            mailListener.imap.seq.addFlags(seqno, '\\Deleted', null)
            return
        }
        if (subject !== config.accountManager.mcdSubjectVerify) return console.error('not an register email')
        if (toMail.indexOf(config.accountManager.mailSuffix) == -1) return false
        let botId = toMail.substring(0, toMail.indexOf(config.accountManager.mailSuffix))
        console.log(botId)
        let dbId = mongoose.Types.ObjectId(botId)
        let activateAccountURL = html
        if (!activateAccountURL) return false
        if (activateAccountURL.indexOf(config.accountManager.mcdVerifyLink) == -1) return false
        // console.log(toMail, botId)
        if (await Models.Account.count({ _id: dbId }) !== 1) return console.error('not in db')
        let userEntryForMail = await Models.Account.findById(dbId)

        // https://www.mcdonalds.com/de/de-de/gmaredirect.html?&ac=XXXXXXXXXX
        activateAccountURL = activateAccountURL.substring(activateAccountURL.indexOf(config.accountManager.mcdVerifyLink))
        activateAccountURL = activateAccountURL.substring(0, activateAccountURL.indexOf('"'))
        let verificationCode = activateAccountURL.substring(activateAccountURL.indexOf('ac=') + 'ac='.length)
        console.log(toMail, toMail == userEntryForMail.email, activateAccountURL, verificationCode)

        let res = await MCDSession.jqt('/v2/customer/security/account/verification?type=email', {
            method: 'POST',
            type: 'json',
            data: {
                "username": userEntryForMail.email,
                "verificationCode": verificationCode
            }
        })
        // console.log(userEntryForMail , JSON.stringify(res, null,'\n'))
        console.log(res)
        if (res['status'] == "ok") {
            await Models.Account.findByIdAndUpdate(dbId, {
                active: true,
                link: activateAccountURL,
            })
            mailListener.imap.seq.addFlags(seqno, '\\Seen', null);
            mailListener.imap.seq.addFlags(seqno, '\\Deleted', null);
        } else {
            console.log(res)
        }
    } catch (ex) {
        console.error(ex)
    }
}


async function Init() {
    // Schedule to fill up the Accounts
    every(5000)
        .on('data', async () => {
            let freeAccounts = await Models.Account.count({
                free: true,
            })
            if (freeAccounts < config.accountManager.freeAccountsReserve) {
                makeAccount()
            }

            let oldAccounts = await Models.Account.find({
                active: true,
                free: false,
                lastLogin: { $lt: (new Date(new Date() - (1000 * 60 * 5))) }
            })
            for (let oldAccount of oldAccounts) {
                if (await login(oldAccount._id) === true) { // if login works
                    await removeAccount(oldAccount._id)
                }
            }
        })
    // mail stuff
    mailListener.on('server:connected', () => {
        console.log("imapConnected")
    })
    mailListener.on('server:disconnected', () => {
        console.log("imapDisconnected")
        mailListener.stop()
        mailListener.start()
    })
    mailListener.on('error', (err) => {
        console.log(err)
    })
    mailListener.on('mail', async (mail, seqno, attributes) => {
        if (mail.headers.from.indexOf('mobile.mcdonalds.de') > -1) {
            // console.log("emailParsed", mail.headers.subject, mail.headers.to)
            if (mail.headers.to.indexOf('-') > -1) return // TODO: remove
            await handleMail(mail.html, mail.subject, mail.headers.to, seqno)
        }
    })
    mailListener.start()
}

Init()