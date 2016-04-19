Wit
=========================

*hculap:meteor-wit*

[Wit.ai](https://wit.ai) is natural language for developers service, which allows you to create your own Bot Engine. See the [docs](https://wit.ai/docs) for more information.

This package is wrapper for npm node-wit Node.js SDK. Package has been adapted for meteor, npm deps has been removed,
request package has beend replaced by meteor HTTP package and old ES5 code has beed migrated to ES6.

## Installation

In your Meteor app directory, enter:

```
$ meteor add hculap:meteor-wit
```


## API

### Overview

The Wit module provides a Wit class with the following methods:
* `message` - the Wit [message](https://wit.ai/docs/http/20160330#get-intent-via-text-link) API
* `converse` - the low-level Wit [converse](https://wit.ai/docs/http/20160330#converse-link) API
* `runActions` - a higher-level method to the Wit converse API
* `interactive` - starts an interactive conversation with your bot

### Wit class

The Wit constructor takes the following parameters:
* `token` - the access token of your Wit instance
* `actions` - the object with your actions
* `logger` - (optional) the object handling the logging.

The `actions` object has action names as properties, and action implementations as values.
You need to provide at least an implementation for the special actions `say`, `merge` and `error`.

A minimal `actions` object looks like this:
```js
const actions = {
  say: (sessionId, context, message, cb) => {
    console.log(message);
    cb();
  },
  merge: (sessionId, context, entities, message, cb) => {
    cb(context);
  },
  error: (sessionId, context, error) => {
    console.log(error.message);
  },
};
```

A custom action takes the following parameters:
* `sessionId` - a unique identifier describing the user session
* `context` - the object representing the session state
* `cb(context)` - a callback function to fire at the end of your action with the updated context.

Example:
```js
import { Wit } from 'meteor/hculap:node-wit';
const client = new Wit(token, actions);
```

The `logger` object should implement the methods `debug`, `log`, `warn` and `error`.
All methods take a single parameter `message`.

For convenience, we provide a `Logger`, taking a log level parameter (provided as `Loger.LEVELS`).
The following levels are defined: `DEBUG`, `LOG`, `WARN`, `ERROR`.

Example:
```js
import { Wit, Logger } from 'meteor/hculap:node-wit';

const logger = new Logger(Logger.LEVELS.DEBUG);
const client = new Wit(token, actions, logger);
```

### message

The Wit [message](https://wit.ai/docs/http/20160330#get-intent-via-text-link) API.

Takes the following parameters:
* `message` - the text you want Wit.ai to extract the information from
* `cb(error, data)` - a callback function with the JSON response

Example:
```js
client.message('what is the weather in London?', (error, data) => {
  if (error) {
    console.log('Oops! Got an error: ' + error);
  } else {
    console.log('Yay, got Wit.ai response: ' + JSON.stringify(data));
  }
});
```

### runActions

A higher-level method to the Wit converse API.

Takes the following parameters:
* `sessionId` - a unique identifier describing the user session
* `message` - the text received from the user
* `context` - the object representing the session state
* `cb(error, context)` - a callback function with the updated context
* `maxSteps` - (optional) the maximum number of actions to execute (defaults to 5)

Example:
```js
const session = 'my-user-session-42';
const context0 = {};
client.runActions(session, 'what is the weather in London?', context0, (e, context1) => {
  if (e) {
    console.log('Oops! Got an error: ' + e);
    return;
  }
  console.log('The session state is now: ' + JSON.stringify(context1));
  client.runActions(session, 'and in Brussels?', context1, (e, context2) => {
    if (e) {
      console.log('Oops! Got an error: ' + e);
      return;
    }
    console.log('The session state is now: ' + JSON.stringify(context2));
  });
});
```

### converse

The low-level Wit [converse](https://wit.ai/docs/http/20160330#converse-link) API.

Takes the following parameters:
* `sessionId` - a unique identifier describing the user session
* `message` - the text received from the user
* `context` - the object representing the session state
* `cb(error, data)` - a callback function with the JSON response

Example:
```js
client.converse('my-user-session-42', 'what is the weather in London?', {}, (error, data) => {
  if (error) {
    console.log('Oops! Got an error: ' + error);
  } else {
    console.log('Yay, got Wit.ai response: ' + JSON.stringify(data));
  }
});
```


