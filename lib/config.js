module.exports = {
	couch: {
		server: 'http://admin_user:admin_pass@localhost:5984',
		database: require('../package.json').name
	},
	selenium: 'http://localhost:9515',
	repeat: 1,
	platforms: {
		androidChrome: {
			browsers: [{
				browserName: 'android'
			}],
			preScript: function(browser) {
				return browser.sleep(1000);
			},
			multiplier: 1000,
			urlPrefix: 'http://localhost:8080'
		},
		desktopChrome: {
			browsers: ['chrome'],
			preScript: function(browser) {
				return browser.setWindowSize(640, 1136);
			},
			multiplier: 2000,
			urlPrefix: 'http://localhost:8080'
		},
		cordova: {
			browsers: [{ // For Cordova
				browserName: 'android',
				chromeOptions: {
					androidActivity: 'io.cordova.hellocordova.MainActivity',
					androidPackage: 'io.cordova.hellocordova'
				},
			}],
			preScript: function(browser) {
				return browser.sleep(1000);
			},
			multiplier: 3000
		}
	}
};