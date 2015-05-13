var fs = require('fs');
var FILE = '_data.json';

module.exports = {
	save: function(component, version, platform, res) {
		var data = {};
		try {
			data = JSON.parse(fs.readFileSync(FILE));
		} catch (e) {}
		initialize(data, [platform, component, version]);
		for (var key in res) {
			if (typeof data[platform][component][version][key] === 'undefined') {
				data[platform][component][version][key] = [];
			}
			data[platform][component][version][key].push(res[key]);
		}

		fs.writeFileSync(FILE, JSON.stringify(data));
	}
}

function initialize(global, props) {
	var obj = global;
	props.forEach(function(prop) {
		if (typeof obj[prop] === 'undefined') {
			obj[prop] = {};
		}
		obj = obj[prop];
	});
	return global;
}