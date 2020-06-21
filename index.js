///// API STUFF /////

const api_url = 'https://api.hypem.com/v2'

const deviceID = () => {
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
		var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8)
		return v.toString(16)
	})
}

const apiRequest = (method, url, params, callback) => {

	if (settings.hypem.token) params.hm_token = settings.hypem.token

	let urlParameters = Object.keys(params).map((i) => typeof params[i] !== 'object' ? i+'='+params[i]+'&' : '' ).join('') // transforms to url format everything except objects

	let requestOptions = { url: api_url+url+'?'+urlParameters, method: method, json: true}

	if (method === 'POST') requestOptions.form = params

    console.log('jason', requestOptions)

	request(requestOptions, (err, result, body) => {
        console.log('Request made', req, body, body && body.error)
		if (body && body.error) callback(body.error, body)
		else callback(err, body)
	})
}

const convertTrack = (rawTrack) => {

	return {
		'service': 'hypem',
		'title': rawTrack.title,
		'share_url': 'http://hypem.com/track/'+rawTrack.itemid,
		'artist': {
			'name': rawTrack.artist,
			'id': rawTrack.artist
		},
		'album': {
			'name': '',
			'id': ''
		},
		'id': rawTrack.itemid,
		'duration': rawTrack.time * 1000,
		'artwork': rawTrack.thumb_url
	}

}

////////////////////////////////
////////////////////////////////

class Hypemachine {
	/**
	* Fetch data
	*
	* @returns {Promise}
	*/
	static fetchData (callback) {

		if (!settings.hypem.token) return callback(['No access token', true])

		apiRequest('GET', '/me/favorites', {count: 400}, (err, result) => {
			if (err) return callback([err])

			let tempFavTracks = []

			for (let i of result)
				tempFavTracks.push(convertTrack(i))

			Data.addPlaylist({
				service: 'hypem',
				id: 'favs',
				title: 'Liked tracks',
				icon: 'heart',
				artwork: '',
				tracks: tempFavTracks
			})

		})

		apiRequest('GET', '/popular', {count: 100}, (err, result) => {
			if (err) return callback([err])

			let tempPopularTracks = []

			for (let i of result)
				tempPopularTracks.push(convertTrack(i))

			Data.addPlaylist({
				service: 'hypem',
				id: 'chart3days',
				title: 'Popular now',
				icon: 'trophy',
				artwork: '',
				tracks: tempPopularTracks
			})


			apiRequest('GET', '/popular', {count: 100, mode: 'lastweek'}, (err, result) => {
				if (err) return callback([err])

				let tempLastweekTracks = []

				for (let i of result)
					tempLastweekTracks.push(convertTrack(i))

				Data.addPlaylist({
					service: 'hypem',
					id: 'chartweek',
					title: 'Popular last week',
					icon: 'trophy',
					artwork: '',
					tracks: tempLastweekTracks
				})

				callback()
			})

		})
	}

	/**
	 * Get the streamable URL
	 *
	 * @param track {Object} The track object
	 * @param callback {Function} Callback function
	 */
	static getStreamUrl (track, callback) {
		callback(null, 'https://hypem.com/serve/public/'+track.id, track.id)
	}

	static login (callback) {

		let fields = [
			{
				description: 'Username',
				placeholder: 'Username',
				id: 'user',
				type: 'text'
			},
			{
				description: 'Password',
				placeholder: 'Password',
				id: 'password',
				type: 'password'
			},
		]

        console.log('jason', 'login', fields)

		manualLogin(fields, (creds) => {

			if (!creds || !creds.user || !creds.password) return callback('stopped')

			settings.hypem.user = creds.user

            console.log('jason', settings)

			apiRequest('POST', '/get_token', {username: creds.user, password: creds.password, device_id: deviceID()}, (err, result) => {
                console.log('jason', 'get_token', err, result)
				if (err) return callback(err)

				if (result.status == "error") return callback(result.error_msg)

				settings.hypem.token = result.hm_token

				callback()
			})

		})

	}

	/**
	* Search
	* @param query {String}: the query of the search
	* @param callback
	*/
	static searchTracks (query, callback) {
		apiRequest('GET', '/tracks', {q: query}, (err, result) => {

			if (err) return console.error(err)
			let tracks = []

			for (let tr of result)
				if (tr) tracks.push(convertTrack(tr))

			callback(tracks, query)

		})
	}

	/**
	 * Like a song
	 *
	 * @param track {Object} The track object
	 */
	static like (track, callback) {

		apiRequest('POST', '/me/favorites', {type: 'item', val: track.id}, (err, res) => {
			callback(err)
		})

	}

	/**
	 * UnLike a song
	 *
	 * @param track {Object} The track object
	 */
	static unlike (track, callback) {
		this.like(track, callback) // This is the same method to like/unlike
	}

	/*
	* Returns the settings items of this plugin
	*
	*/
	static settingsItems () {
		return [
			{
				type: 'activate',
				id: 'active'
			}
		]
	}

}

Hypemachine.favsPlaylistId = "favs"
Hypemachine.scrobbling = true

Hypemachine.settings = {
	active: false
}

module.exports = Hypemachine
