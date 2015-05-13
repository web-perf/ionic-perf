var ProgressBar = require('progress');
var browserPerf = require('browser-perf');
var _ = require('lodash');

var results = require('./results');
var config = require('./config');
var pkg = require('../package.json');

module.exports = function(components, versions, platform, cb) {

	var device = config.platforms[platform];
	var queue = [];
	_.forEach(components, function(component) {
		_.forEach(versions, function(version) {
			queue.push({
				component: component,
				version: version,
				url: [device.urlPrefix, '/v', version, '/', component, '.html'].join('')
			});
		});
	});

	var bar = new ProgressBar('Running tests [:bar] (:current/:total). Time: (:elapsed/:eta)', {
		total: queue.length,
		width: 50
	});

	(function runQueue(i, cb) {
		bar.tick()
		if (i < queue.length) {
			browserPerf(queue[i].url, function(err, res) {
				if (err) {
					console.log(err);
				} else {
					results.save(queue[i].component, queue[i].version, platform, res[0]);
				}
				bar.tick();
				runQueue(i + 1);
			}, {
				actions: [browserPerf.actions.scroll({
					scrollElement: 'document.getElementsByTagName("ion-content")[0]'
				})],
				selenium: config.selenium,
				browsers: device.browsers,
				preScript: device.preScript
			});
		} else {
			cb();
		}
	}(0));
}