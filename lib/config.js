module.exports = {
	selenium: 'http://localhost:9515',
	platforms: {
		androidChrome: {
			
			urlPrefix: 'http://192.168.0.104:8080'
		},
		desktopChrome: {
			browsers: ['chrome'],
			preScript: function(browser) {
				return browser.setWindowSize(640, 1136);
			},
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
			urlPrefix: 'file:///android_asset/www'
		}
	}
};