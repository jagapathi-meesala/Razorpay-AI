const util = require('util');
if (!util.styleText) {
  util.styleText = (_format, text) => text;
}
