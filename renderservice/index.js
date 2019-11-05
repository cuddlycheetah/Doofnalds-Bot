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

        const qrCodeImage = await Jimp.read(Buffer.from(req.body.QrCode, 'base64'))
        await qrCodeImage.crop(37, 37, 165, 165)
        if (!!req.body.ios_deprecated) {
            const returnImage = IOSAppImg.clone()
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
            res.set('Content-Type', 'image/png')
            return res.send(await returnImage.getBufferAsync('image/png'))
        } else {
            const screenWidth = req.body.screenWidth || 666
            const screenHeight = req.body.screenHeight || 1080

            let BaseAppImg = await Jimp.read('./android/base.png')
            const returnImage = BaseAppImg.clone()
            await returnImage.resize(screenWidth, screenHeight)
            let CropTop = 0
            let CropBottom = 0
            let globalY = 0
            { // Statuszeile
                const CStatusBarHeight = (screenHeight / 2220) * 63
                CropTop = CStatusBarHeight
                for (const { x, y } of returnImage.scanIterator(0, 0, screenWidth, CStatusBarHeight))
                    await returnImage.setPixelColor(0x2f2f2fff, x, y)
                const statusBarImage = await Jimp.read('./android/statusbarright.png')
                await statusBarImage.resize(Jimp.AUTO, CStatusBarHeight, Jimp.RESIZE_NEAREST_NEIGHBOR)
                await returnImage.composite(statusBarImage, (screenWidth - statusBarImage.bitmap.width) - 25, 0)
                globalY += CStatusBarHeight
            }
            { // Obere Zeile mit MCDLogo und dem Pfeil
                const CFirstBarHeight = (screenHeight / 2220) * 126
                const CFirstBarLineWidth = Math.round((screenHeight / 2220) * 3)
                for (const { x, y } of returnImage.scanIterator(0, globalY, screenWidth, CFirstBarHeight))
                    await returnImage.setPixelColor(
                        (CFirstBarLineWidth <= (CFirstBarHeight - (y - globalY)))
                            ? 0x666666ff
                            : 0x585858ff,
                    x, y)
                const firstBarLeftImage = await Jimp.read('./android/middleleftthingy.png')
                await firstBarLeftImage.resize(Jimp.AUTO, CFirstBarHeight - CFirstBarLineWidth, Jimp.RESIZE_NEAREST_NEIGHBOR)
                await returnImage.composite(firstBarLeftImage, 25, globalY)
                const firstBarCenterImage = await Jimp.read('./android/middlelogo.png')
                await firstBarCenterImage.resize(Jimp.AUTO, CFirstBarHeight - CFirstBarLineWidth, Jimp.RESIZE_NEAREST_NEIGHBOR)
                await returnImage.composite(firstBarCenterImage, (screenWidth - firstBarCenterImage.bitmap.width) / 2, globalY)
                globalY += CFirstBarHeight
            }
            { // Navigationsleiste
                const CNavBarHeight = (screenHeight / 2220) * 120
                CropBottom = CNavBarHeight
                for (const { x, y } of returnImage.scanIterator(0, screenHeight - CNavBarHeight, screenWidth, CNavBarHeight))
                    await returnImage.setPixelColor(0x616161ff, x, y)
                const navBarImage = await Jimp.read('./android/navbar.png')
                await navBarImage.resize(Jimp.AUTO, CNavBarHeight, Jimp.RESIZE_BILINEAR)
                await returnImage.composite(navBarImage, (screenWidth - navBarImage.bitmap.width) / 2, screenHeight - CNavBarHeight)
                globalY += CNavBarHeight
            }
            { // Coupon Ding
                const Padding = (screenHeight / 2220) * 65
                globalY += Padding
                const CNavBarHeight = (screenHeight / 2220) * 503
                const CCouponEckeHeight = (screenHeight / 2220) * 16
                const CCouponLineWidth = Math.round((screenHeight / 2220) * 5)
                const CCouponBoxWidth = (screenWidth / 1220) * 1090
                for (const { x, y } of returnImage.scanIterator((screenWidth - CCouponBoxWidth) / 2, globalY, CCouponBoxWidth, CCouponLineWidth))
                    await returnImage.setPixelColor(0x5c5c5cff, x, y)
                const lilaDingImage = await Jimp.read('./android/lilading.png')
                await lilaDingImage.resize(Jimp.AUTO, CNavBarHeight, Jimp.RESIZE_BILINEAR)
                await returnImage.composite(lilaDingImage, ((screenWidth - CCouponBoxWidth) / 2) - lilaDingImage.bitmap.width, globalY)
                const couponEckeImage = await Jimp.read('./android/kurvendingopenrechts.png')
                await couponEckeImage.resize(Jimp.AUTO, CCouponEckeHeight, Jimp.RESIZE_BILINEAR)
                await returnImage.composite(couponEckeImage, ((screenWidth - CCouponBoxWidth) / 2) + CCouponBoxWidth, globalY)
                for (const { x, y } of returnImage.scanIterator(((screenWidth - CCouponBoxWidth) / 2) + CCouponBoxWidth + couponEckeImage.bitmap.width - CCouponLineWidth, globalY + couponEckeImage.bitmap.height, CCouponLineWidth, lilaDingImage.bitmap.height))
                    await returnImage.setPixelColor(0x5c5c5cff, x, y)
            }
            { // QRCodeBox
                const CQrCodeBoxWidth = (screenWidth / 1220) * 996
                const CQrCodeBoxHeight = (screenHeight / 2220) * 1220
                const CQrCodeScanTextHeight = (screenHeight / 2220) * 168
                const CQrCodeCloseHeight = (screenHeight / 2220) * 45
                globalY = (screenHeight - CQrCodeBoxHeight) / 2
                for (const { x, y } of returnImage.scanIterator((screenWidth - CQrCodeBoxWidth) / 2, (screenHeight - CQrCodeBoxHeight) / 2, CQrCodeBoxWidth, CQrCodeBoxHeight))
                    await returnImage.setPixelColor(0xffffffff, x, y)
                const closeImage = await Jimp.read('./android/close.png')
                await closeImage.resize(Jimp.AUTO, CQrCodeCloseHeight, Jimp.RESIZE_BILINEAR)
                await returnImage.composite(closeImage,
                    ((screenWidth + CQrCodeBoxWidth) / 2) - closeImage.bitmap.width * 2,
                    ((screenHeight - CQrCodeBoxHeight) / 2) + closeImage.bitmap.height
                )
                const scanCodeImage = await Jimp.read('./android/code.png')
                await scanCodeImage.resize(Jimp.AUTO, CQrCodeScanTextHeight, Jimp.RESIZE_BILINEAR)
                await returnImage.composite(scanCodeImage,
                    ((screenWidth - scanCodeImage.bitmap.width) / 2),
                    ((screenHeight - CQrCodeBoxHeight / 1.5) / 2)
                )
                globalY += CQrCodeBoxHeight
            }
            { // Bottomshit
                const Padding = (screenHeight / 2220) * 60
                globalY += Padding
                const CBottomShitHeight = (screenHeight / 2220) * 103
                const CBottomShitLineWidth = Math.round((screenHeight / 2220) * 5)
                const bottomShitImage = await Jimp.read('./android/bottomshit.png')
                await bottomShitImage.resize(Jimp.AUTO, CBottomShitHeight, Jimp.RESIZE_BILINEAR)
                await returnImage.composite(bottomShitImage, (screenWidth - bottomShitImage.bitmap.width) / 2, globalY)
                globalY += CBottomShitHeight
                for (const { x, y } of returnImage.scanIterator(0, globalY, screenWidth, CBottomShitLineWidth))
                    await returnImage.setPixelColor(0x585858ff, x, y)
            }
            const CQrCodeImageWidth = (screenWidth / 1220) * 464
            const CQrCodeImageHeight = (screenHeight / 2220) * 464
            const CQrCodeTextHeight = (screenHeight / 2220) * 72
            await qrCodeImage.resize(CQrCodeImageWidth, CQrCodeImageWidth, Jimp.RESIZE_NEAREST_NEIGHBOR)
            await returnImage.composite(qrCodeImage, (screenWidth - CQrCodeImageWidth) / 2, (screenHeight - CQrCodeImageHeight) / 2)
            const font = await Jimp.loadFont(Jimp.FONT_SANS_64_BLACK)
            await returnImage.print(font, 0, ((screenHeight - CQrCodeImageHeight) / 2) + CQrCodeImageHeight + CQrCodeTextHeight,
                {
                    text: req.body.RandomCode,
                    alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
                    alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE
                },
                screenWidth,
                CQrCodeTextHeight
            );
            CropTop = 0
            await returnImage.crop(0, CropTop, screenWidth, screenHeight - (CropTop + CropBottom))
            res.set('Content-Type', 'image/png')
            return res.send(await returnImage.getBufferAsync('image/png'))
        }
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