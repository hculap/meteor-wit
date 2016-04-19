const log = (message, label) => {
  console.log(
    label ? `[${label}] ${message}` : message
  );
};

class Logger {
  constructor(lvl) {
    this.level = lvl === undefined ? Logger.LEVELS.LOG : lvl;
  }
  debug(message) {
    if (Logger.LEVELS.DEBUG >= this.level) {
      log(message, 'debug');
    }
  }
  log(message) {
    if (Logger.LEVELS.LOG >= this.level) {
      log(message);
    }
  }
  warn(message) {
    if (Logger.LEVELS.WARN >= this.level) {
      log(message, 'warn');
    }
  }
  error(message) {
    if (Logger.LEVELS.ERROR >= this.level) {
      log(message, 'error');
    }
  }
}

Logger.LEVELS = {
  DEBUG: 0,
  LOG: 1,
  WARN: 2,
  ERROR: 3,
};

export { Logger };
