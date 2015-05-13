var ProgressBar = require('progress');
var perfjankie = require('perfjankie');
var _ = require('lodash');

var config = require('./config');
var pkg = require('../package.json');

module.exports = function(queue, platform, cb) {
	perfjankie({
		couch: _.assign({
			updateSite: true,
			onlyUpdateSite: true
		}, config.couch),
		callback: function() {
			runQueue(0, cb);
		}
	});

	var device = config.platforms[platform];

	var bar = new ProgressBar('Running tests [:bar] (:current/:total). Time: (:elapsed/:eta)', {
		total: queue.length,
		width: 50
	});

	function runQueue(i, cb) {
		bar.tick()
		if (i < queue.length) {
			var job = queue[i];
			perfjankie({
				suite: pkg.name,
				name: job.component,
				run: job.version,
				callback: function(err, res) {
					if (err) {
						console.error(err);
					}
					runQueue(i + 1, cb);
				},
				actions: [require('perfjankie/node_modules/browser-perf').actions.scroll({
					scrollElement: 'document.getElementsByTagName("ion-content")[0]'
				})],
				repeat: config.repeat,
				selenium: config.selenium,
				couch: config.couch,
				time: job.seq * device.multiplier,
				browsers: device.browsers,
				url: device.urlPrefix + job.url,
				preScript: device.preScript
			});
		} else {
			cb();
		}
	}
}