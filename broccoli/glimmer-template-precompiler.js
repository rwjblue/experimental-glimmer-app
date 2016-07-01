var Filter = require('broccoli-persistent-filter');
var compiler = require('glimmer-engine/dist/node_modules/glimmer-compiler');

GlimmerTemplatePrecompiler.prototype = Object.create(Filter.prototype);
GlimmerTemplatePrecompiler.prototype.constructor = GlimmerTemplatePrecompiler;

function GlimmerTemplatePrecompiler(inputNode, search, replace, options) {
  options = options || {};
  Filter.call(this, inputNode, {
    annotation: options.annotation
  });
}

GlimmerTemplatePrecompiler.prototype.extensions = ['hbs'];
GlimmerTemplatePrecompiler.prototype.targetExtension = 'hbs.js';

GlimmerTemplatePrecompiler.prototype.processString = function(content, relativePath) {
  return 'export default ' + compiler.compileSpec(content);
};

module.exports = GlimmerTemplatePrecompiler;
