module.exports = {
    // MongoDB
    mongodbURI: 'mongodb://localhost:27017',
    mongodbName: 'doofnalds',
    // Redis
    redisHost: '127.0.0.1',
    redisPort: 6379,
    // Microservice specific Configurations
    accountManager: {
        imapAuth: {
            username: 'catchall@emailhost.tld', // catchall email account
            password: 'PASSWORD', // email pw
            host: 'imap.emailhost.tld', // imap host
            port: 993,
            tls: true,
        },
        imapMailbox: 'INBOX',
        mailSuffix: '.mcd@emailhost.tld',
        freeAccountsReserve: 10, // keep 10 accounts ready for use
        mcdSubjectVerified: 'Dein McDonald’s App-Account ist freigeschaltet',
        mcdSubjectVerify: "Deine Registrierung in der McDonald's App",
        mcdVerifyLink: 'https://www.mcdonalds.com/de/de-de/gmaredirect.html',
        mcdRegFirstName: 'John',
        mcdRegLastName: 'Teig',
        mcdRegZipCode: '10115', // Default to Berlin
    },
    storeFinder: {
        // dont change if you dont know, what youre doing
        port: 30495,
        host: '127.0.0.1',
        googlePlacesKey: 'API KEY FROM GOOGLE', // get it from google cloud console
    },
    sessionManager: {
        // dont change if you dont know, what youre doing
        port: 30496,
        host: '127.0.0.1',
        accountsPerSession: 2,
    },
    renderService: {
        // dont change if you dont know, what youre doing
        port: 30497,
        host: '127.0.0.1',
    },
    telegramBot: {
        token: 'GET TOKEN FROM BOT FATHER',
        texts: {
            start: 'Hallo, willkommen beim Doofnalds Bot, mit diesen Bot kannst du',
        }
    },
    // MC Donalds API Configuration
    mcdEndpoint: 'https://eu-prod.api.mcd.com',
    mcdEndpointLegacy: 'https://europe.api.mcd.com',
    mcdEndpointOfferImage: 'https://de-prod-us-cds-oceofferimages.s3.amazonaws.com/oce2-de-prod/',
    mcdHeaders: {
        'User-Agent': 'MCDSDK/1.3.20 (Android; 28; de-DE) GMA/5.0',
        'mcd-clientid': '6DEUyJOKaBoz8QR' + 'Fm49qqVIVPj0GUzoH',
        'mcd-marketid': 'DE',
        'mcd_apikey': 'DEDCUSANDPILOT919541' + '4' + 'I4J5M2D4CSJR45D500DE', // prevent easy search of this key
        'MarketId': 'DE.PROD2',
        'mcd-sourceapp': 'GMA',
        'accept-language': 'de-DE',
        'accept-charset': 'UTF-8',
        'mcd-uuid': 'e48468ce-71f9-45e3' +'-' + '9b3d-333d3b32d028', // prevent easy search of this key
    },
    mcdHeadersLegacy: {
        'User-Agent': 'Dalvik/2.1.0 (Linux; U; Android 9; XT1685 Build/PQ2A.190405.003)',
        'mcd-marketid': 'DE',
        'mcd_apikey': 'DEDCUSANDPILOT91954' + '14I4J5M2D4CSJR45D500DE',
        'MarketId': 'DE.PROD2',
        'mcd-sourceapp': 'MOT',
        'mcd-locale': 'de-DE',
        'mcd-apiuid': '644e1dd7-2a7f-18fb' +'-' + 'b8ed-ed78c3f92c2b',
    }
}