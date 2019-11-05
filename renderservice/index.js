const config = require('../config')

const express = require('../node_modules/express')
const bodyParser = require('../node_modules/body-parser')
const fs = require('fs')
const Jimp = require('jimp')
const sha1 = require('sha1')
const microService = express()
microService.use(bodyParser.json(true))

let AndroidAppImg
Jimp.read('./app.png').then((img) => AndroidAppImg = img)
let IOSAppImg
Jimp.read('./app-ios.png').then((img) => IOSAppImg = img)
let OverviewImg
Jimp.read('./overview.png').then((img) => OverviewImg = img)
microService
    /**
     * Putting the QR Code into a Screenshot
     */
    .post('/qrcode', async (req, res) => {
        const returnImage = !!req.body.ios
            ? IOSAppImg.clone()
            : AndroidAppImg.clone();

        const qrCodeImage = await Jimp.read(Buffer.from(req.body.QrCode, 'base64'))
        await qrCodeImage.crop(37, 37, 165, 165)
        if (!!req.body.ios) {
            /*
                198, 635
                397, 835
            */
            await qrCodeImage.resize(200, 200, Jimp.RESIZE_NEAREST_NEIGHBOR)
            await returnImage.composite(qrCodeImage, 198, 635)
            const font = await Jimp.loadFont(Jimp.FONT_SANS_64_BLACK)
            await returnImage.print(font, 0, 868,
                {
                    text: req.body.RandomCode,
                    alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
                    alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE
                },
                591,
                915 - 868
            );
        } else {
            await qrCodeImage.resize(421, 421, Jimp.RESIZE_NEAREST_NEIGHBOR)
            await returnImage.composite(qrCodeImage, 329, 780)
            const font = await Jimp.loadFont(Jimp.FONT_SANS_128_BLACK)
            await returnImage.print(font, 0, 1212,
                {
                    text: req.body.RandomCode,
                    alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
                    alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE
                },
                1080,
                146
            );
        }
        res.set('Content-Type', 'image/png')
        return res.send(await returnImage.getBufferAsync('image/png'))
    })
    /**
     * Putting the Offer Pics into a single Image
     */
    .post('/overview', async (req, res) => {
        let i = 0
        const finalHash = req.body.reduce((complete, url) => sha1(complete + url), '')
        const finalHashPath = `./.cache/${ finalHash }.png`
        if (fs.existsSync('./.cache') === false)
            fs.mkdirSync('./.cache')
        console.log(req.body.length, finalHash)

        if (fs.existsSync(finalHashPath) === false) {
            const returnImage = OverviewImg.clone();
            await returnImage.resize(
                Math.min(req.body.length, 3) * 500,
                Math.ceil(req.body.length / 3) * 500
            )
            for (let inUrl of req.body) {
                const cachePath = `./.cache/${ sha1(inUrl) }.png`
                const url = config.mcdEndpointOfferImage + inUrl
                console.log(cachePath, url)
                let image
                const x = i % 3, y = Math.floor(i / 3)
                console.log(`${ i } at x=${ x }, y=${ y }`)
                if (fs.existsSync(cachePath) === false) {
                    let httpImage = await Jimp.read(url)
                    console.log('downloading')
                    await httpImage.writeAsync(cachePath)
                    image = httpImage
                } else  {
                    let cacheImage = await Jimp.read(cachePath)
                    console.log('cache')
                    image = cacheImage
                }
                await image.resize(450, 450)
                await returnImage.composite(image, 25 + x * 500, 25 + y * 500)
                i++
            }
            await returnImage.writeAsync(finalHashPath)
            res.set('Cache-ID', finalHash)
            res.set('Content-Type', 'image/png')
            return res.send(await returnImage.getBufferAsync('image/png'))
        } else {
            const cacheImage = await Jimp.read(finalHashPath)
            console.log('loading overview from cache')
            res.set('Cache-ID', finalHash)
            res.set('Content-Type', 'image/png')
            return res.send(await cacheImage.getBufferAsync('image/png'))
        }
    })
    ;
/*

329, 780
750, 1201
*/

microService.listen(config.renderService.port, config.renderService.host)