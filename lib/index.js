#!/usr/bin/env node

var fs = require('fs');
var path = require('path');
var _ = require('lodash');
var static = require('node-static');
var semver = require('semver');
var program = require('commander');
var glob = require('glob');

var pkg = require('../package.json');
var frameworkLibs = require('../test/versions.json');
var generateFiles = require('./generateFiles');
var runTest = require('./runTest');

function main(opts) {
	// Start Web Server
	var server = require('http').createServer(function(request, response) {
		request.addListener('end', function() {
			new static.Server('./bin').serve(request, response);
		}).resume();
	}).listen(8080);

	generateFiles(opts.components, opts.versions, function() {
		console.log('Metadata updated, now starting tests');
		runTest(opts.components, opts.versions, opts.platform, function() {
			server.close();
			console.log('All done, view results at /_design/site/index.html');
		});
	}, opts.cached);

};

function defaultArgs(program, cb) {
	var components = program.args;
	if (!Array.isArray(components) || components.length === 0) {
		components = glob.sync(path.join(__dirname, '../test/components/*.html')).map(function(component) {
			return path.basename(component, '.html');
		});
	}

	return {
		versions: _.filter(_.keys(frameworkLibs), function(version) {
			return semver.satisfies(version, program.versions || '*');
		}),
		cached: program.cached,
		components: components,
		platform: program.platform || 'desktopChrome'
	};
}

program
	.version(pkg.version)
	.description(pkg.description)
	.usage('[options] component1 component2 ...')
	.option('-v, --versions <versions>', 'Versions of bootstrap to run tests against, specified as a semver range', '*')
	.option('-c, --cached', 'Do not generate test files, use cached version of files')
	.option('-p, --platform <platform>', 'One of desktopChrome|androidChrome|cordova')
	.parse(process.argv);

main(defaultArgs(program));