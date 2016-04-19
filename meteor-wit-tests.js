// Import Tinytest from the tinytest Meteor package.
import { Tinytest } from "meteor/tinytest";

// Import and rename a variable exported by meteor-wit.js.
import { name as packageName } from "meteor/meteor-wit";

// Write your tests here!
// Here is an example.
Tinytest.add('meteor-wit - example', function (test) {
  test.equal(packageName, "meteor-wit");
});
