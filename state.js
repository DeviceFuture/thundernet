const fs = require("fs");
const mkdirp = require("mkdirp");
const os = require("os");
const path = require("path");

const STATE_PATH = path.join(os.homedir(), ".config", "thundernet", "state.json");

exports.data = {};

exports.save = function(file = STATE_PATH) {
    try {
        mkdirp.sync(path.dirname(file));
    } catch (e) {
        throw new ReferenceError("Cannot create config directory; ensure that permissions are set correctly");
    }

    try {
        fs.writeFileSync(file, JSON.stringify(exports.data));
    } catch (e) {
        throw new ReferenceError("Unable to write new state file; ensure that permissions for parent directory are set correctly");
    }
};

exports.load = function(file = STATE_PATH) {
    if (!fs.existsSync(file)) {
        throw new ReferenceError("No state file found");
    }

    try {
        exports.data = JSON.parse(fs.readFileSync(file));
    } catch (e) {
        throw new SyntaxError("Unable to parse state file; ensure that file is readable and correctly formatted");
    }
};

exports.init = function(file = STATE_PATH) {
    if (!fs.existsSync(file)) {
        exports.save(file);
    }

    exports.load(file);
};