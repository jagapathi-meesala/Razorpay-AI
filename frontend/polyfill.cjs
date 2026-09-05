const util = require('node:util');
if (!util.styleText) {
  util.styleText = (_format, text) => text;
}
if (!util.parseEnv) {
  util.parseEnv = () => ({});
}
if (!util.stripVTControlCharacters) {
  util.stripVTControlCharacters = (str) => str;
}

if (typeof globalThis.CustomEvent === 'undefined') {
  class CustomEvent extends Event {
    constructor(event, params = {}) {
      super(event, params);
      this.detail = params ? params.detail : null;
    }
  }
  globalThis.CustomEvent = CustomEvent;
}
