'use strict';

var path = require('path');
var typescript = require('broccoli-typescript-compiler');
var concat = require('broccoli-concat');
var merge = require('broccoli-merge-trees');
var stew = require('broccoli-stew');
var mv = stew.mv;
var find = stew.find;
var map = stew.map;
var log = stew.log;
var alias = require('rollup-plugin-alias');
var babel = require('broccoli-babel-transpiler');
var RollupWithDependencies = require('./broccoli/rollup-with-dependencies');
var GlimmerTemplatePrecompiler = require('./broccoli/glimmer-template-precompiler');
var buildGlimmerEngine = require('glimmer-engine/ember-cli-build');
//var assetRev = require('broccoli-asset-rev');
var uglify = require('broccoli-uglify-sourcemap');
//var appcache = require('broccoli-appcache');

function GlimmerApp (defaults, options) {
  if (!defaults.project) {
    throw new Error('you must pass the ember-cli provided defaults to the GlimmerApp constructor');
  }

  this.project = defaults.project;
  this.options = options;
  this._setupInputTrees();
}

GlimmerApp.prototype = {
  constructor: GlimmerApp,
  _setupInputTrees: function() {
    this.trees = {
      app: path.join(this.project.root, 'app'),
      styles: path.join(this.project.root, 'app/styles'),
      public: path.join(this.project.root, 'public')
    };
  },

  typescriptOptions: function() {
    var glimmerPath = path.join(require.resolve('glimmer-engine'), '../../../../packages');

    return {
      tsconfig: {
        compilerOptions: {
          target: "es2015",
          module: "es2015",
          inlineSourceMap: true,
          inlineSources: true,
          moduleResolution: "node",
          "rootDirs": [path.join(this.project.root, 'app'), glimmerPath],
          "baseUrl" : "./",
          "paths": {
            "*": [
              "packages/*",
              "node_modules/glimmer-engine/packages/*"
            ]
          }
        }
      }
    };
  },

  _compileJavascript: function() {
    var app = this.trees.app;
    var glimmerSystemInfra = mv(path.join(__dirname, 'glimmer-app-infra'), 'system');

    var mergedApp = merge([app, glimmerSystemInfra]);

    var tsTree = find(mergedApp, {
      include: ['**/*.ts', '**/*.js'],
      exclude: ['**/*.d.ts']
    });

    var jsTree = typescript(tsTree, this.typescriptOptions());

    return jsTree;
  },

  _compileTemplates: function() {
    var hbsTree = find(this.trees.app, {
      include: ['**/*.hbs']
    });

    hbsTree = new GlimmerTemplatePrecompiler(hbsTree);

    return hbsTree;
  },

  _compileGlimmer: function() {
    var glimmer = buildGlimmerEngine();

    return mv(glimmer, 'glimmer');
  },

  _indexHtml: function() {
    return find(this.trees.app, { include: ['index.html']});
  },

  _combinedJavascriptTree: function() {
    var compiledApp = this._compileJavascript();
    var compiledTemplates = this._compileTemplates();
    var glimmerEngine = this._compileGlimmer();

    var combinedJsTree = merge([
      compiledApp,
      compiledTemplates,
      glimmerEngine
    ]);

    return combinedJsTree;
  },

  _finalJavascriptTree: function() {
    var combinedJsTree = this._combinedJavascriptTree();

    var rolledUp;
    rolledUp = new RollupWithDependencies(combinedJsTree, {
      inputFiles: ['**/*.js'],
      rollup: {
        entry: 'app.js',
        dest: 'app.js',
        sourceMap: 'inline'
      }
    });

    rolledUp = babel(rolledUp, {
      sourceMaps: 'inline'
    });

    if (process.env.EMBER_ENV === 'production') {
      rolledUp = uglify(rolledUp, {
        compress: {
          screw_ie8: true
        },
        sourceMapConfig: {
          enabled: false
        }
      });
    }

    return rolledUp;
  },

  toTree: function() {
    var finalJavascript = this._finalJavascriptTree();
    var index = this._indexHtml();
    var publicTree = this.trees.public;

    return merge([finalJavascript, index, publicTree]);
  }
};

module.exports = GlimmerApp;
/*
// ember-cli-build.js of including application
var GlimmerApp = require('experimental-glimmer-app');

module.exports = function(defaults) {
  var app = new GlimmerApp(defaults, {
    // app config/overrides go here
  });

  return app.toTree();
};
 */
