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
	repeat: 10,
	browser: ['chrome']
};

var frameworkLibs = require('./test/versions.json');


function generateFiles(components, versions) {
	var template = _.template(fs.readFileSync(path.join(__dirname, 'test/template.html')));

	rimraf.sync('./bin');
	fs.mkdirSync(path.join(__dirname, 'bin'))

	_.forEach(versions, function(version) {
		var dir = path.join(__dirname, 'bin', 'v' + version);
		fs.mkdirSync(dir);
		_.forEach(components, function(component) {
			var file = path.join(dir, component + '.html');
			fs.writeFileSync(file, template({
				repeat: 200,
				version: version,
				component: component,
				componentHTML: fs.readFileSync(path.join(__dirname, 'test/components', component + '.html')),
				css: frameworkLibs[version].css,
				javascript: frameworkLibs[version].js
			}));
		});
	});
}


function runPerfTests(components, versions, cb) {
	var queue = [];

	_.forEach(components, function(component) {
		_.forEach(versions, function(version) {
			queue.push({
				component: component,
				version: version,
				seq: frameworkLibs[version].seq,
				url: ['http://localhost:8080/v', version, '/', component, '.html'].join('')
			});
		});
	});

	(function runQueue(i) {
		if (i < queue.length) {
			var job = queue[i];
			console.log('Running [%d/%d] %s@%s ', i, queue.length, job.component, job.version);
			perfjankie({
				suite: pkg.name,
				url: job.url,
				name: job.component,
				run: job.version,
				time: job.seq,
				callback: function(err, res) {
					if (err) {
						console.error(err);
					}
					runQueue(i + 1);
				},
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
	opts.versions = _.filter(_.keys(frameworkLibs), function(version) {
		return semver.satisfies(version, opts.versions || '*');
	});
}

function main(opts) {

	defaultArgs(opts);
	generateFiles(opts.components, opts.versions);
	return;

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
			runPerfTests(components, versions, function() {
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
	versions: program.versions
});