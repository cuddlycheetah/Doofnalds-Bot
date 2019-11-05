const config = require('../config')
const rqt = require('../node_modules/rqt')
const MCDSession = new rqt.Session({
    host: config.mcdEndpoint,
    headers: config.mcdHeaders,
})

const Telegraf = require('telegraf')
const Markup = require('telegraf/markup')
const Extra = require('telegraf/extra')
const Stage = require('telegraf/stage')
const { leave } = Stage
const Scene = require('telegraf/scenes/base')
const rateLimit = require('telegraf-ratelimit')

// MongoDB
const { mongoose, Models } = require('../database')

const bot = new Telegraf(config.telegramBot.token)

/* Redis Stuff */ 
const Redis = require('redisng')
const redis = new Redis()
redis.connect(config.redisHost, config.redisPort)
const memorysession = require('telegraf/session')
const RedisSession = require('telegraf-session-redis')
const session = new RedisSession({
    store: {
        host: config.redisHost,
        port: config.redisPort,
    },
    getSessionKey: (ctx) => {
        if (!ctx.from) return console.log('fail redis key', ctx);
        return ctx.from.id.toString();
    }
})
bot.use(memorysession())
//bot.use(session)
bot.use(rateLimit({
    window: 3000,
    limit: 10,
    onLimitExceeded: (ctx, next) => ctx.reply('Sie haben zuviele Anfragen geschickt, bitte warten Sie')
}))
bot.use(async (ctx, next) => {
  const start = new Date()
  //console.log(ctx)
  await next()
  const ms = new Date() - start
  console.log('Response time: %sms', ms)
})
// bot.use(Telegraf.log())

const cancelText = '\n\nZum abbrechen /cancel schicken!'
const restartText = '\n\nZum neustarten /start schicken!'
const errorTextSessionManager = 'Tut mir leid, der SessionManager ist gerade nicht erreichbar. Bitte kontaktiere den Entwickler'
const errorTextRenderService = 'Tut mir leid, der RenderService ist gerade nicht erreichbar. Bitte kontaktiere den Entwickler'
const errorTextStoreFinder = 'Tut mir leid, der StoreFinder ist gerade nicht erreichbar. Bitte kontaktiere den Entwickler'


// Setup 1 Stage
const setup0Stage = new Scene('setup')
setup0Stage.enter(async (ctx) => {
    await ctx.reply('Willkommen! Bevor wir loslegen können, setze bitte einige Einstellungen.',
        Markup
            .keyboard([
                ['Ich nutze Android', 'Ich nutze ein iPhone'],
                ['❌ Überspringen'],
                ])
            .resize()
            .extra()
    )
})
setup0Stage.hears('Ich nutze Android', async (ctx) => {
    console.log('android')
    await ctx.replyWithChatAction('typing')
    await ctx.reply('Du hast dich für ein Android entschieden', Markup.removeKeyboard())
    await Models.User.create({
        id: ctx.from.id,
        ios: false,
        screenWidth: 591,
        screenHeight: 1280,
    })
    let userExists = await Models.User.count({ id: ctx.from.id })
    if (userExists === 0) {
        await Models.User.create({
            id: ctx.from.id,
            ios: false,
            screenWidth: 1080,
            screenHeight: 1920,
        })
    } else {
        await Models.User.findOneAndUpdate({
            id: ctx.from.id
        }, {
            ios: false,
            screenWidth: 1080,
            screenHeight: 1920,
        })
    }
    await ctx.scene.enter('setup1')
})
setup0Stage.hears('Ich nutze ein iPhone', async (ctx) => {
    await ctx.replyWithChatAction('typing')
    await ctx.reply('Du hast dich für ein iPhone entschieden', Markup.removeKeyboard())
    let userExists = await Models.User.count({ id: ctx.from.id })
    if (userExists === 0) {
        await Models.User.create({
            id: ctx.from.id,
            ios: true,
            screenWidth: 591,
            screenHeight: 1280,
        })
    } else {
        await Models.User.findOneAndUpdate({
            id: ctx.from.id
        }, {
            ios: true,
            screenWidth: 591,
            screenHeight: 1280,
        })
    }
    await ctx.scene.enter('setup1')
})
setup0Stage.hears('❌ Überspringen', async (ctx) => {
    await ctx.replyWithChatAction('typing')
    await ctx.reply('Du hast dich für ein Android-Smartphone mit 1080x1920px entschieden', Markup.removeKeyboard())
    let userExists = await Models.User.count({ id: ctx.from.id })
    if (userExists === 0) {
        await Models.User.create({
            id: ctx.from.id,
            ios: false,
            screenWidth: 1080,
            screenHeight: 1920,
        })
    } else {
        await Models.User.findOneAndUpdate({
            id: ctx.from.id
        }, {
            id: ctx.from.id,
            ios: false,
            screenWidth: 1080,
            screenHeight: 1920,
        })
    }
    return ctx.scene.enter('main')
})

// Setup 2 Stage
const setup1Stage = new Scene('setup1')
setup1Stage.enter(
    (ctx) => ctx.reply('Um ein perfekten Code-Screenshot zu erzeugen benötige ich deine Bildschirmgröße. Dafür musst du mir einfach nur einen Screenshot schicken.',
        Markup
            .keyboard([
                ['❌ Überspringen'],
              ])
            .forceReply()
            .resize()
            .oneTime()
            .extra()
    )
)
setup1Stage.hears('❌ Überspringen', async (ctx) => {
    return ctx.scene.enter('main')
})
setup1Stage.on('message', async (ctx) => {
    await ctx.replyWithChatAction('typing')
    if (!!ctx.message && !!ctx.message.photo) {
        let resPhoto = ctx.message.photo.reverse()[0]
        await Models.User.findOneAndUpdate({
            id: ctx.from.id
        }, {
            screenWidth: resPhoto.width,
            screenHeight: resPhoto.height,
        })
        ctx.reply('Deine Bildschirmauflösung wurde gesetzt.')
    } else {
        return ctx.reply('Bitte schick mir einen Screenshot als Bild oder wähle "Überspringen"!')
    }
    return ctx.scene.enter('main')
})


// Main Stage
const mainStage = new Scene('main')
mainStage.enter(
    (ctx) => ctx.reply('Willkommen! Schicke mir einen Standort über 📎 oder einen Ort(z.B. Berlin)' + cancelText, Extra.markup((markup) => {
        return markup.resize()
            .keyboard([
                markup.locationRequestButton('Aktuellen Standort senden')
            ])
    }))
)
mainStage.on('message', async (ctx) => {
    await ctx.replyWithChatAction('typing')
    let results = []
    let url = `http://${ config.storeFinder.host }:${ config.storeFinder.port }/fillialsuche`
    try {
        if (!!ctx.message.location) {
            results = await rqt.jqt(url, {
                method: 'POST',
                type: 'json',
                data: {
                    lon: ctx.message.location.longitude,
                    lat: ctx.message.location.latitude,
                },
                timeout: 15000,
            })
        } else if (!!ctx.message.text) {
            results = await rqt.jqt(url, {
                method: 'POST',
                type: 'json',
                data: {
                    query: ctx.message.text,
                },
                timeout: 15000,
            })
        } else {
            return ctx.reply('Schicke mir einen Standort über 📎 oder einen Ort(z.B. Berlin)' + cancelText)
        }
    } catch (e) {
        console.error(e)
        return ctx.reply(errorTextStoreFinder + cancelText)
    }

    if (typeof(results) == 'object' && (!!results || results.length > 0)) {
        await ctx.reply('Bitte wähle eine Filliale aus' + cancelText,
            Markup.inlineKeyboard(
                results.map(restaurant => {
                    return [Markup.callbackButton(`${ restaurant.street } ${ restaurant.address }`, restaurant._id)]
                })
            ).oneTime().extra()
        )
    } else {
        return ctx.reply('Ort nicht gefunden') 
    }
})
mainStage.action(/([0-9a-z]{12,24})/, async (ctx) => {
    await ctx.replyWithChatAction('typing')
    let dbId = mongoose.Types.ObjectId(ctx.match[1])
    ctx.deleteMessage()
    ctx.session.fillialSelection = dbId
    try {
        ctx.answerCbQuery('Lade Angebote...')
        let url = `http://${ config.sessionManager.host }:${ config.sessionManager.port }/sitzung/${ ctx.from.id }`
        let session = await rqt.jqt(url, { method: 'POST', timeout: 15000 })
        ctx.session.id = session._id
        ctx.scene.enter('angebotSelect')
    } catch (e) {
        console.error(e)
        return ctx.reply(errorTextSessionManager + cancelText)
    }
})
// Offer Selection
const angebotSelectStage = new Scene('angebotSelect')
angebotSelectStage.enter(async (ctx) => {
    let loadMsg = await ctx.reply('Lade Angebote...', Markup.removeKeyboard().extra())
    let offers = []
    await ctx.replyWithChatAction('upload_photo')
    try {
        let url = `http://${ config.sessionManager.host }:${ config.sessionManager.port }/sitzung/${ ctx.from.id }/restaurant/${ ctx.session.fillialSelection }`
        offers = await rqt.jqt(url, { method: 'POST', timeout: 15000 })
        offers = offers.filter((offer) => offer.OfferType !== 9)
    } catch (e) {
        console.error(e)
        return ctx.reply(errorTextSessionManager + restartText)
    }
    await ctx.deleteMessage(loadMsg.message_id)
    let overviewImage, cacheId
    try {
        let url = `http://${ config.renderService.host }:${ config.renderService.port }/overview`
        let response = await rqt.aqt(url, { 
            data: offers.map(offer => offer.ImageBaseName),
            type: 'json', method: 'POST', timeout: 15000, binary: true
        })
        cacheId = response.headers['cache-id']
        overviewImage = response.body
    } catch (e) {
        console.error(e)
        return ctx.reply(errorTextRenderService + restartText)
    }
    let fileId = await redis.get('render-' + cacheId)
    let selectMsg
    let selectMsgKeyboard = Markup.inlineKeyboard(
        offers.map(offer => {
            return [Markup.callbackButton(`[${ offer.Id }] ${ offer.Name }`, offer.Id)]
        })
        .concat([
            [ Markup.callbackButton('Abbrechen', 'abort') ]
        ])
    ).extra()
    if (!fileId) {
        selectMsg = await ctx.replyWithPhoto({ source: overviewImage }, selectMsgKeyboard)
        await redis.set('render-' + cacheId, selectMsg.photo.reverse()[0].file_id)
    } else {
        console.log('using cached file id')
        selectMsg = await ctx.replyWithPhoto(fileId, selectMsgKeyboard)
    }
    await redis.set('msg-' + ctx.from.id, selectMsg.message_id)
    // ctx.scene.state.selectMsg = selectMsg.message_id // doesnt work because of #reason
})
angebotSelectStage.leave(async (ctx) => {
    let msgToDelete = await redis.get('msg-' + ctx.from.id)
    if (!!msgToDelete)
        try {
            await ctx.deleteMessage(msgToDelete)
        } catch (e) {}
})
angebotSelectStage.action('abort', (ctx) => ctx.scene.enter('main'))
angebotSelectStage.action('back', (ctx) => ctx.scene.leave())
angebotSelectStage.action(/(.*)/, async (ctx) => {
    const offerId = parseInt(ctx.match[1])
    try {
        ctx.answerCbQuery('Lade Angebot...')
        let url = `http://${ config.sessionManager.host }:${ config.sessionManager.port }/sitzung/${ ctx.from.id }/angebot/${ offerId }`
        let code = await rqt.jqt(url, { method: 'GET', timeout: 15000, type: 'json' })
        if (!code) throw 'Kein Code vorhanden'
        ctx.session.code = code
        console.log('entering code stage', !!code)
        ctx.scene.enter('angebotCode')
    } catch (e) {
        console.error(e)
        return ctx.reply(errorTextSessionManager + cancelText)
    }
})
// Offer Code
const angebotCodeStage = new Scene('angebotCode')
angebotCodeStage.enter(async (ctx) => {
    await ctx.replyWithChatAction('upload_photo')
    //let loadMsg = await ctx.reply('Lade Code...' + cancelText)
    let codeImage
    try {
        let code = ctx.session.code
        let user = await Models.User.findOne({ id: ctx.from.id })
        code.ios = !!user.ios
        code.screenWidth = user.screenWidth
        code.screenHeight = user.screenHeight
        let url = `http://${ config.renderService.host }:${ config.renderService.port }/qrcode`
        codeImage = await rqt.bqt(url, { data: code, type: 'json', method: 'POST', timeout: 6000 })
    } catch (e) {
        console.error(e)
        return ctx.reply(errorTextRenderService + cancelText)
    }
    //await ctx.deleteMessage(loadMsg.message_id)
    let codeMsg = await ctx.replyWithPhoto({ source: codeImage }, Markup.inlineKeyboard([
        [
            Markup.callbackButton('Zurück', 'back'),
            Markup.callbackButton('Nächster Code', 'next')
        ],
        [
            Markup.callbackButton('Sitzung beenden', 'abort')
        ]
    ]).extra())
    ctx.session.codeMsg = codeMsg.message_id
})
angebotCodeStage.leave(async (ctx) => {
    if (!!ctx.session.codeMsg)
        await ctx.deleteMessage(ctx.session.codeMsg)
})
angebotCodeStage.action('abort', async (ctx) => {
    await ctx.replyWithChatAction('typing')
    try {
        //TODO: call SessionManager to delete the session
    } catch(e) {
    }
    leaveFunc(ctx)
    ctx.scene.enter('main')
})
angebotCodeStage.action('back', (ctx) => {
    ctx.answerCbQuery('')
    ctx.scene.enter('angebotSelect')
})
angebotCodeStage.action('next', async (ctx) => {
    ctx.answerCbQuery('')
    ctx.scene.enter('angebotCode')
})
angebotCodeStage.action(/(.*)/, async (ctx) => {
    ctx.answerCbQuery('')
    console.log(ctx.match[1])
})

const startFunc = async (ctx) => {
    let userExists = await Models.User.count({ id: ctx.from.id })
    if (userExists === 0) {
        ctx.scene.enter('setup')
    } else {
        ctx.scene.enter('main')
    }
}
// Create scene manager
const stage = new Stage()
const leaveFunc = leave()
stage.command('cancel', (ctx) => {
    leaveFunc(ctx)
    ctx.reply('Aktion erfolgreich abgebrochen, nutze /start um nochmal neu anzufangen')
})
stage.command('start', (ctx) => {
    leaveFunc(ctx)
    startFunc(ctx)
})

// Scene registration
stage.register(setup0Stage)
stage.register(setup1Stage)
stage.register(mainStage)
stage.register(angebotSelectStage)
stage.register(angebotCodeStage)

bot.use(stage.middleware())
bot.command('start', startFunc)
bot.command('settings', (ctx) => ctx.scene.enter('setup'))
bot.launch()