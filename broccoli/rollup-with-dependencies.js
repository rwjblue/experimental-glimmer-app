"use strict";

const Rollup = require('broccoli-rollup');
const fs = require('fs');
const path = require('path');

RollupWithDependencies.prototype = Object.create(Rollup.prototype);
RollupWithDependencies.prototype.constructor = RollupWithDependencies;

function RollupWithDependencies(inputNode, options) {
  if (!(this instanceof RollupWithDependencies)) {
    return new RollupWithDependencies(inputNode, options);
  }

  Rollup.call(this, inputNode, options);
}

RollupWithDependencies.prototype.build = function() {
  let plugins = this.rollupOptions.plugins || [];
  let inputPath = this.inputPaths[0];

  plugins.push({
    resolveId(importee, importer) {
      let modulePath = path.join(inputPath, 'glimmer', 'es6', importee, 'index.js');
      if (fs.existsSync(modulePath)) {
        return modulePath;
      }

      modulePath = path.join(inputPath, 'glimmer', 'es6', importee + '.js');
      if (fs.existsSync(modulePath)) {
        return modulePath;
      }
    }
  });

  this.rollupOptions.plugins = plugins;

  return Rollup.prototype.build.apply(this, arguments);
};

module.exports = RollupWithDependencies;
