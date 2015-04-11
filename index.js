#!/usr/bin/env node

var fs = require('fs');
var path = require('path');
var _ = require('lodash');
var rimraf = require('rimraf');
var static = require('node-static');
var semver = require('semver');
var perfjankie = require('perfjankie');
var program = require('commander');
var glob = require('glob');
var wget = require('wget');

var pkg = require('./package.json')

// Change this object for tweaking the tests
var CONFIG = {
	couch: {
		server: 'http://admin_user:admin_pass@localhost:5984',
		database: pkg.name
	},
	selenium: 'http://localhost:9515',
	repeat: 1,
	browsers: ['chrome']
};

function generateFiles(components, versions, frameworkLibs, bin) {
	console.log('Starting to generate files');

	var queue = [];
	var versionDir = {};
	var template = _.template(fs.readFileSync(path.join(__dirname, 'test/template.html')));

	_.forEach(components, function(component) {
		_.forEach(versions, function(version) {

			var dir = path.join(bin, 'v' + version);
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
				componentHTML: fs.readFileSync(path.join(__dirname, 'test/components', component + '.html')),
				css: frameworkLibs[version].css,
				javascript: frameworkLibs[version].js
			}));
			queue.push({
				component: component,
				version: version,
				seq: frameworkLibs[version].seq,
				url: ['/v', version, '/', component, '.html'].join('')
			});
		});
	});

	fs.writeFileSync(path.join(bin, '/index.html'), _.template(fs.readFileSync(path.join(__dirname, 'test/index.html')))({
		components: components,
		versions: versions
	}));
	console.log('All files generated');
	return queue;
}


function runPerfTests(queue, cb) {

	(function runQueue(i) {
		if (i < queue.length) {
			var job = queue[i];
			console.log('Running [%d/%d] %s@%s ', i, queue.length, job.component, job.version);
			perfjankie({
				suite: pkg.name,
				url: 'http://localhost:8080' + job.url,
				name: job.component,
				run: job.version,
				time: job.seq,
				callback: function(err, res) {
					if (err) {
						console.error(err);
					}
					runQueue(i + 1);
				},
				preScript: function(browser) {
					return browser.setWindowSize(640, 1136);
				},
				actions: [require('perfjankie/node_modules/browser-perf').actions.scroll({
					scrollElement: "document.getElementsByTagName('ion-content')[0]"
				})],
				repeat: CONFIG.repeat,
				selenium: CONFIG.selenium,
				couch: CONFIG.couch,
				browsers: CONFIG.browsers
			});
		} else {
			cb();
		}
	}(0));
}

function main(opts) {
	// Start Web Server
	var server = require('http').createServer(function(request, response) {
		request.addListener('end', function() {
			new static.Server(opts.bin).serve(request, response);
		}).resume();
	}).listen(8080);

	var files = generateFiles(opts.components, opts.versions, opts.frameworkLibs, opts.bin);
	// Start tests
	perfjankie({
		couch: _.assign({
			updateSite: true,
			onlyUpdateSite: true
		}, CONFIG.couch),
		callback: function() {
			console.log('Metadata updated, now starting tests');
			runPerfTests(files, function() {
				console.log('All done, view results at %s/%s/_design/site/index.html', CONFIG.couch.server, CONFIG.couch.database);
				server.close();
			});
		}
	});
};

module.exports = main;

function defaultArgs(program, cb) {
	var binDir = path.join(__dirname, 'bin');
	rimraf.sync('./bin');
	fs.mkdirSync(binDir);

	var opts = {
		components: program.args,
		versions: program.versions,
		frameworkLibs: require('./test/versions.json'),
		bin: binDir
	};

	if (!Array.isArray(opts.components) || opts.components.length === 0) {
		opts.components = glob.sync(path.join(__dirname, 'test/components/*.html')).map(function(component) {
			return path.basename(component, '.html');
		});
	}
	opts.versions = _.filter(_.keys(opts.frameworkLibs), function(version) {
		return semver.satisfies(version, opts.versions || '*');
	});

	if (program.offline) {
		var downloadQueue = [];
		var libDir = path.join(binDir, 'lib')
		fs.mkdirSync(libDir);
		_.forEach(opts.versions, function(version) {
			var destDir = path.join(libDir, 'v' + version);
			fs.mkdirSync(destDir);
			downloadQueue.push([opts.frameworkLibs[version].css, path.join(destDir, 'ionic.min.css')]);
			downloadQueue.push([opts.frameworkLibs[version].js, path.join(destDir, 'ionic.min.js')]);
			opts.frameworkLibs[version].css = path.join('../lib/', 'v' + version, 'ionic.min.css');
			opts.frameworkLibs[version].js = path.join('../lib/', 'v' + version, 'ionic.min.js');
		});

		(function download(i) {
			if (i >= downloadQueue.length) {
				cb(opts);
				return;
			}
			var dwld = wget.download(downloadQueue[i][0], downloadQueue[i][1]);
			dwld.on('error', function(err) {
				console.log(err);
				download(i + 1);
			});
			dwld.on('end', function(output) {
				console.log(output);
				download(i + 1);
			});
		}(0));
	} else {
		cb(opts);
	}
}

program
	.version(pkg.version)
	.description(pkg.description)
	.usage('[options] component1 component2 ...')
	.option('-v, --versions <versions>', 'Versions of bootstrap to run tests against, specified as a semver range', '*')
	.option('-o, --offline', 'Download the framework files')
	.parse(process.argv);

defaultArgs(program, main);