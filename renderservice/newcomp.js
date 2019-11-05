
const Jimp = require('jimp')
let test = async () => {
    //const screenWidth = 1220, screenHeight = 2220
    const screenWidth = 666, screenHeight = 1080
    let BaseAppImg = await Jimp.read('./android/base.png')
    const returnImage = BaseAppImg.clone()
    await returnImage.resize(screenWidth, screenHeight)
    let globalY = 0
    { // Statuszeile
        const CStatusBarHeight = (screenHeight / 2220) * 63
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

    await returnImage.writeAsync('test.png')
}
test()