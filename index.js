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

function generateFiles(components, versions, frameworkLibs) {
	console.log('Starting to generate files');

	rimraf.sync('./bin');
	fs.mkdirSync(path.join(__dirname, 'bin'))

	var queue = [];
	var versionDir = {};
	var template = _.template(fs.readFileSync(path.join(__dirname, 'test/template.html')));

	_.forEach(components, function(component) {
		_.forEach(versions, function(version) {

			var dir = path.join(__dirname, 'bin', 'v' + version);
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

	fs.writeFileSync(path.join(__dirname, 'bin/index.html'), _.template(fs.readFileSync(path.join(__dirname, 'test/index.html')))({
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

function defaultArgs(opts) {
	if (!Array.isArray(opts.components) || opts.components.length === 0) {
		opts.components = glob.sync(path.join(__dirname, 'test/components/*.html')).map(function(component) {
			return path.basename(component, '.html');
		});
	}
	opts.versions = _.filter(_.keys(opts.frameworkLibs), function(version) {
		return semver.satisfies(version, opts.versions || '*');
	});
}

function main(opts) {
	defaultArgs(opts);
	var files = generateFiles(opts.components, opts.versions, opts.frameworkLibs);

	// Start Web Server
	var server = require('http').createServer(function(request, response) {
		request.addListener('end', function() {
			new static.Server(path.join(__dirname, 'bin')).serve(request, response);
		}).resume();
	}).listen(8080);

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

program
	.version(pkg.version)
	.description(pkg.description)
	.usage('[options] component1 component2 ...')
	.option('-v, --versions <versions>', 'Versions of bootstrap to run tests against, specified as a semver range', '*')
	.parse(process.argv);

main({
	components: program.args,
	versions: program.versions,
	frameworkLibs: require('./test/versions.json')
});