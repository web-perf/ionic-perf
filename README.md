# Ionic - Performance Analysis

This repository is for analyzing the rendering performance of various versions and components of the [ionic framework](http://ionicframework.com/) using [browser-perf](http://github.com/axemclion/browser-perf). 

> View results at http://axemclion.github.io/bootstrap-perf

## Running the tests

1. Download and install [CouchDB](http://couchdb.apache.org/) and [Selenium](https://github.com/axemclion/browser-perf/wiki/Setup-Instructions#installing-and-running-selenium). 
2. Clone the repository and install all dependencies `npm install`
3. Run `node index.js`. 
4. All tests are run against selenium running at `http://localhost:4444/wd/hub` and results are stored in a CouchDB server at `http://localhost:5984/<package-name>`. To change any of these, edit the `index.js` file appropriately. 

Run `node index.js --help` to view other options to run the tests. Test can be run against specific versions and specific components.  

## How does it work ? 
This repository runs scroll tests on each component of framework. It creates a simple HTML file for each component, where each component is repeated 200 times. This webpage is opened in a browser and the page is scrolled to see the impact of CSS/JS by the Framework. Look at [browser-perf](https://github.com/axemclion/browser-perf/wiki) for more information about the tests, and [perfjankie](http://github.com/axemclion/perfjankie) to see how the UI/Graphs are plotted. 

_ Inspired by the awesome perf done in the [Topcoat.io](https://github.com/topcoat/topcoat/tree/master/dev/test/perf/telemetry) repository. Trying to do the same thing for bootstrap _
