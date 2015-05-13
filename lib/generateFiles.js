var fs = require('fs');
var path = require('path');

var wget = require('wget');
var rimraf = require('rimraf');
var _ = require('lodash');
var ProgressBar = require('progress');

var frameworkLibs = require('../test/versions.json');
var binDir = path.join(__dirname, '../bin');

function initializeDirs() {
	rimraf.sync(binDir);
	fs.mkdirSync(binDir);
}

function generateFiles(components, versions) {
	var bar = new ProgressBar('Generating files [:bar] (:current/:total)', {
		total: components.length * versions.length,
		width: 50
	});
	var versionDir = {};
	var template = _.template(fs.readFileSync(path.join(__dirname, '../test/template.html')));

	_.forEach(components, function(component) {
		_.forEach(versions, function(version) {
			var dir = path.join(binDir, 'v' + version);
			// Create a dir if it does not exist for version
			if (!versionDir[dir]) {
				fs.mkdirSync(dir);
				versionDir[dir] = true;
			}

			var file = path.join(dir, component + '.html');

			fs.writeFileSync(file, template({
				repeat: 200,
				version: version,
				component: component,
				componentHTML: fs.readFileSync(path.join(__dirname, '../test/components', component + '.html'))
			}));
			bar.tick();
		});
	});

	fs.writeFileSync(path.join(binDir, '/index.html'), _.template(fs.readFileSync(path.join(__dirname, '../test/index.html')))({
		components: components,
		versions: versions
	}));
}

function downloadLibs(versions, cb) {
	var downloadQueue = [];
	var libDir = path.join(binDir, 'lib');
	fs.mkdirSync(libDir);
	_.forEach(versions, function(version) {
		var destDir = path.join(libDir, 'v' + version);
		fs.mkdirSync(destDir);
		downloadQueue.push([frameworkLibs[version].css, path.join(destDir, 'ionic.min.css')]);
		downloadQueue.push([frameworkLibs[version].js, path.join(destDir, 'ionic.min.js')]);
	});

	fs.mkdirSync(path.join(libDir, 'fonts'));
	downloadQueue.push(['http://code.ionicframework.com/1.0.0/fonts/ionicons.eot?v=2.0.1', path.join(libDir, 'fonts/ionicons.eot')]);
	downloadQueue.push(['http://code.ionicframework.com/1.0.0/fonts/ionicons.ttf?v=2.0.1', path.join(libDir, 'fonts/ionicons.ttf')]);

	var bar = new ProgressBar('Downloading files [:bar] (:current/:total)', {
		total: downloadQueue.length + 1,
		width: 50
	});
	(function download(i) {
		bar.tick();
		if (i >= downloadQueue.length) {
			cb();
			return;
		}
		var dwld = wget.download(downloadQueue[i][0], downloadQueue[i][1]);
		dwld.on('error', function(err) {
			console.log(err);
			download(i + 1);
		});
		dwld.on('end', function(output) {
			download(i + 1);
		});
	}(0));
}

module.exports = function(components, versions, cb, cached) {
	if (cached) {
		cb();
		return;
	}
	initializeDirs();
	generateFiles(components, versions);
	downloadLibs(versions, function() {
		cb();
	});
}