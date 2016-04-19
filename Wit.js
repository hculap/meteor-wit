import { Meteor } from 'meteor/meteor';
import { HTTP } from 'meteor/http';
import { Logger } from './logger';

class Wit {
  constructor(token, actions, logger = new Logger(Logger.LEVELS.LOG)) {
    this.l = logger;
    this.token = token;
    this.actions = this._validateActions(actions);
    this.httpDefaultOptions = {
      baseUrl: 'https://api.wit.ai',
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    };
  }
  message(message, cb) {
    const options = {
      uri: 'message',
      method: 'GET',
      query: `q=${message}`,
    };

    HTTP.call(options.method, `${this.httpDefaultOptions.baseUrl}/${options.uri}`, {
      headers: this.httpDefaultOptions.headers,
      query: options.query,
    }, this._makeResponseHandler(options.uri, cb));
  }
  converse(sessionId, message, context, cb) {
    const options = {
      uri: 'converse',
      method: 'POST',
      query: `session_id=${sessionId}`,
      data: context,
    };

    if (message) {
      options.query = `${options.query}&q=${message}`;
    }

    HTTP.call(options.method, `${this.httpDefaultOptions.baseUrl}/${options.uri}`, {
      headers: this.httpDefaultOptions.headers,
      data: options.data,
      query: options.query,
    }, this._makeResponseHandler(options.uri, cb));
  }
  _makeResponseHandler(endpoint, cb) {
    return (error, response) => {
      const data = response.data;
      const err = error ||
        data.error ||
        response.statusCode !== 200 && `${data.body} (${response.statusCode})`
      ;
      if (err) {
        this.l.error(`[${endpoint}] Error: ${err}`);
        if (cb) {
          cb(err);
        }
        return;
      }
      this.l.debug(`[${endpoint}] Response: ${JSON.stringify(data)}`);
      if (cb) {
        cb(null, data);
      }
    };
  }
  _makeCallback(_i, sessionId, context, cb) {
    let i = _i;
    return (_error, json) => {
      let timeoutID;
      this.l.debug(`Context: ${JSON.stringify(context)}`);
      const error = _error || !json.type && 'Couldn\'t find type in Wit response';
      if (error) {
        if (cb) {
          cb(error, context);
        }
        return;
      }

      // TODO(jodent) refactor
      if (json.type === 'stop') {
        // End of turn
        if (cb) {
          cb(null, context);
        }
        return;
      } else if (json.type === 'msg') {
        if (!this.actions.say) {
          if (cb) {
            cb('No \'say\' action found.');
          }
          return;
        }
        timeoutID = this._makeCallbackTimeout(Wit.CALLBACK_TIMEOUT_MS);
        this.l.debug(`Executing say with message: ${json.msg}`);
        this.actions.say(sessionId, json.msg, () => {
          if (timeoutID) {
            clearTimeout(timeoutID);
            timeoutID = null;
          }
          if (i <= 0) {
            this.l.warn('Max steps reached, halting.');
            if (cb) {
              cb(null, context);
            }
            return;
          }

          // Retrieving action sequence
          this.converse(
            sessionId,
            null,
            context,
            this._makeCallback(--i, sessionId, context, cb)
          );
        });
      } else if (json.type === 'merge') {
        if (!this.actions.merge) {
          if (cb) {
            cb('No \'merge\' action found.');
          }
          return;
        }
        this.l.debug('Executing merge action');
        timeoutID = this._makeCallbackTimeout(Wit.CALLBACK_TIMEOUT_MS);
        this.actions.merge(context, json.entities, (newContext) => {
          if (timeoutID) {
            clearTimeout(timeoutID);
            timeoutID = null;
          }
          const context = newContext || {};
          this.l.debug(`Context: ${JSON.stringify(context)}`);

          if (i <= 0) {
            this.l.warn('Max steps reached, halting.');
            if (cb) {
              cb(null, context);
            }
            return;
          }

          // Retrieving action sequence
          this.converse(
            sessionId,
            null,
            context,
            this._makeCallback(--i, sessionId, context, cb)
          );
        });
      } else if (json.type === 'action') {
        const action = json.action;
        if (!this.actions.hasOwnProperty(action)) {
          if (cb) {
            cb(`No '${action}' action found.`, context);
          }
          return;
        }

        // Context might be updated in action call
        this.l.debug(`Executing action: ${action}`);
        timeoutID = this._makeCallbackTimeout(Wit.CALLBACK_TIMEOUT_MS);
        this.actions[action](context, (newContext) => {
          if (timeoutID) {
            clearTimeout(timeoutID);
            timeoutID = null;
          }
          const context = newContext || {};
          this.l.debug(`Context: ${JSON.stringify(context)}`);

          if (i <= 0) {
            this.l.warn('Max steps reached, halting.');
            if (cb) {
              cb(null, context);
            }
            return;
          }

          // Retrieving action sequence
          this.converse(
            sessionId,
            null,
            context,
            this._makeCallback(--i, sessionId, context, cb)
          );
        });
      } else { // error
        if (!this.actions.error) {
          if (cb) {
            cb('No \'error\' action found.');
          }
          return;
        }
        this.l.debug('Executing error action');
        this.actions.error(sessionId, 'No \'error\' action found.');
        return;
      }
    };
  }
  runActions(sessionId, message, context, cb, maxSteps = Wit.DEFAULT_MAX_STEPS) {
    this.converse(
      sessionId,
      message,
      context,
      this._makeCallback(maxSteps, sessionId, context, cb)
    );
  }
  _makeCallbackTimeout(ms) {
    return Meteor.setTimeout(() => {
      this.l.warn(`I didn't get the callback after ${(ms / 1000)} seconds.
        Did you forget to call me back?`);
    }, ms);
  }
  _validateActions(actions) {
    const learnMore = 'Learn more at https://wit.ai/docs/quickstart';
    if (typeof actions !== 'object') {
      throw new Error('The second parameter should be an Object.');
    }
    if (!actions.say) {
      throw new Error(`The 'say' action is missing. ${learnMore}`);
    }
    if (!actions.merge) {
      throw new Error(`The 'merge' action is missing. ${learnMore}`);
    }
    if (!actions.error) {
      throw new Error(`The 'error' action is missing. ${learnMore}`);
    }
    Object.keys(actions).forEach(key => {
      if (typeof actions[key] !== 'function') {
        throw new Error(`The '${key}' action should be a function.`);
      }
      if (key === 'say' && actions.say.length !== 3) {
        throw new Error(`The 'say' action should accept 3 arguments:
          sessionId, message, callback. ${learnMore}`);
      } else if (key === 'merge' && actions.merge.length !== 3) {
        throw new Error(`The 'merge' action should accept 3 arguments:
          context, entities, callback. ${learnMore}`);
      } else if (key === 'error' && actions.error.length !== 2) {
        throw new Error(`The 'error' action should accept 2 arguments:
          sessionId, callback. ${learnMore}`);
      } else if (key !== 'say' && key !== 'merge' && actions[key].length !== 2) {
        throw new Error(`The ${key} action should accept 2 arguments:
          context, callback. ${learnMore}`);
      }
    });
    return actions;
  }
}

Wit.DEFAULT_MAX_STEPS = 5;
Wit.CALLBACK_TIMEOUT_MS = 10000;

export { Wit, Logger };
