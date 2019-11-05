const config = require('../config')

const express = require('../node_modules/express')
const bodyParser = require('../node_modules/body-parser')
// MCD API
const rqt = require('../node_modules/rqt')
const MCDSession = new rqt.Session({
    host: config.mcdEndpointLegacy,
    headers: config.mcdHeadersLegacy,
})
const querystring = require('../node_modules/querystring')

const microService = express()
microService.use(bodyParser.json(true))
// MongoDB
const { mongoose, Models } = require('../database')

const ortSuche = (query) => {
    return rqt('https://nominatim.openstreetmap.org/search?format=json&q=' + encodeURIComponent(query + ', Deutschland'))
}
const ortSucheGoogle = async (query) => {
    return rqt.jqt('https://maps.googleapis.com/maps/api/place/textsearch/json?' + querystring.stringify({
        key: config.storeFinder.googlePlacesKey,
        query: query,
    }))
}

microService
    .post('/fillialsuche', async (req, res) => {
        let lon, lat, searchfield, place_id
        let correlationQuery = {}
        
        if (!!req.body.query) {
            let query = req.body.query.toString()
            console.log('Searching with Query')
            if (await Models.GoogleCacheResult.count({ query }) === 0) {
                let orte = await ortSucheGoogle(query)
                orte = orte.results
                if (orte.length > 0) {
                    /*orte = orte.sort((a,b) => {
                        a = a.importance * (a.type === 'city' ? 2 : 1)
                        b = b.importance * (b.type === 'city' ? 2 : 1)
                        return a > b
                    })*/
                    const ort = orte[0]
                    lon = parseFloat(ort.geometry.location.lng)
                    lat = parseFloat(ort.geometry.location.lat)
                    searchfield = ort.name
                    place_id = ort.place_id
                    correlationQuery = {
                        place_id: ort.place_id,
                        longitude: lon,
                        latitude: lat,
                    }
                    await Models.GoogleCacheResult.create({
                        query,
                        name: searchfield,
                        place_id: place_id,
                        longitude: lon,
                        latitude: lat,
                    })
                    console.log('Google Result', lon, lat, searchfield, place_id)
                } else {
                    console.log('Keine Orte von #1 gefunden')
                    return res.status(400).json('Keine Orte gefunden')
                }
            } else {
                let cachedResult = await Models.GoogleCacheResult.findOne({ query })
                lon = cachedResult.longitude
                lat = cachedResult.latitude
                searchfield = cachedResult.name
                place_id = cachedResult.place_id
                correlationQuery = {
                    place_id: place_id,
                    longitude: lon,
                    latitude: lat,
                }
                console.log('Cache Result', lon, lat, searchfield, place_id)

            }
        } else if (!!req.body.lat) {
            console.log('Searching with Location', req.body)
            lon = parseFloat(req.body.lon)
            lat = parseFloat(req.body.lat)
            correlationQuery = {
                longitude: parseInt(lon * 10000) / 10000,
                latitude:  parseInt(lat * 10000) / 10000,
            }
            searchfield = ''
            place_id = false
        } else {
            console.log('Invalid Search')
            return res.status(400).json(false)
        }
        
        let restaurants = []
        if (!!correlationQuery) {
            let correlationCount = await Models.StoreFinderCorrelation.count(correlationQuery)
            console.log('correlationCount', correlationCount)
            if (correlationCount === 0) {
                console.log('No Correlations found, asking API')
                console.time('MCD Search')
                const restaurants = await rqt.jqt('https://www.mcdonalds.de/search', {
                    method: 'POST',
                    type: 'application/x-www-form-urlencoded; charset=UTF-8',
                    data: querystring.stringify({
                        longitude: lon,
                        latitude: lat,
                        searchfield: searchfield,
                        radius: 12, // 12km umkreis suche
                        coupon: true,
                    }),
                    timeout: 6000,
                })
                .then(($res) => {
                    if ($res.unfilteredCount === 0) throw 'Keine Restaurants gefunden'
                    $res.restaurantList = $res.restaurantList.sort((a, b) => a.distance - b.distance)
                    return $res.restaurantList.map((entry) => {
                        return entry.restaurant
                    })
                })
                .then(async ($res) => {
                    console.log('retaurants', $res)
                    let restaurants = []
                    for (let restaurant of $res) {
                        let seoCount = await Models.Store.count({ seoURL: restaurant.seoURL })
                        if (seoCount == 0) {
                            let ecpStore = await MCDSession.jqt('/v3/restaurant/location?' + querystring.stringify({
                                filter: 'search',
                                query: JSON.stringify({
                                    market: 'DE',
                                    pageSize: 1,
                                    local: 'de-DE',
                                    generalStoreStatusCode: 'OPEN,TEMPCLOSE,RENOVATION',
                                    locationCriteria: {
                                        longitude: lon,
                                        latitude: lat,
                                        distance: 22000
                                    }
                                }),
                            }), { method: 'GET', type: 'json', })
                            if (ecpStore.length === 0) continue; // Skip Restaurants, we dont have the ECPId for
                            console.log(ecpStore)
                            ecpStore = ecpStore[0]
                            if (ecpStore.identifiers.storeIdentifier.filter((a) => a.identifierType == 'ECPID').length == 0) continue

                            await Models.Store.create({
                                id: restaurant.id,
                                externalId: restaurant.externalId,
        
                                storeId: ecpStore.id,
                                storeECPId: ecpStore.identifiers.storeIdentifier.filter((a) => a.identifierType == 'ECPID')[0].identifierValue,
                    
                                latitude: restaurant.latitude,
                                longitude: restaurant.longitude,
        
                                city: restaurant.city,
                                postalCode: restaurant.postalCode,
                                address: restaurant.address,
                                street: restaurant.street,
                                phone: restaurant.phone,
                                seoURL: restaurant.seoURL,
                                name1: restaurant.name1,
                                name2: restaurant.name2,
        
                                lastRefresh: new Date(),
                            })
                        }
                        let dbRestaurant = await Models.Store.findOne({ seoURL: restaurant.seoURL })
                        restaurants.push(dbRestaurant)
                    }
                    console.timeEnd('MCD Search')
                    return restaurants
                })
                .catch(($err) => {
                    console.timeEnd('MCD Search')
                    console.error($err)
                    return false
                })
                if (!!restaurants) {
                    for (let restaurant of restaurants) {
                        if (await Models.StoreFinderCorrelation.count({
                            ...correlationQuery,
                            store: restaurant._id,
                        }) === 0) {
                            await Models.StoreFinderCorrelation.create({
                                ...correlationQuery,
                                store: restaurant._id,
                                lastRefresh: new Date(),
                            })
                        }
                    }
                    return res.json(restaurants)
                } else {
                    return res.json(false)
                }
            } else {
                console.time('Correlation Search')
                console.log('Correlations found, returning them...')
                let restaurantsDB = await Models.StoreFinderCorrelation
                    .find(correlationQuery)
                    .select('store')
                    .populate('store');
                restaurants = restaurantsDB.map(corr => corr.store)
                console.timeEnd('Correlation Search')
                return res.json(restaurants)
            }
        }

        return res.json(false)
    })

microService.listen(config.storeFinder.port, config.storeFinder.host)