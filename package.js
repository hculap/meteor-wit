Package.describe({
  name: 'hculap:meteor-wit',
  version: '1.0.0',
  // Brief, one-line summary of the package.
  summary: 'Wit.ai package, wrapped and adapt for Meteor.',
  // URL to the Git repository containing the source code for this package.
  git: '',
  // By default, Meteor will default to using README.md for documentation.
  // To avoid submitting documentation, set this field to null.
  documentation: 'README.md'
});

Package.onUse(function(api) {
  api.versionsFrom('1.3.1');
  api.use('ecmascript');
  api.use('http');
  api.mainModule('Wit.js', 'server');
});

Package.onTest(function(api) {
  api.use('ecmascript');
  api.use('http');
  api.use('tinytest');
  api.use('hculap:meteor-wit');
  api.mainModule('meteor-wit-tests.js');
});
