const fs = require("fs");
const mkdirp = require("mkdirp");
const os = require("os");
const path = require("path");

const CONFIG_PATH = path.join(os.homedir(), ".config", "thundernet", "config.json");
const CONFIG_DEFAULT_PATH = path.join(__dirname, "defaultconfig.json");

exports.data = {};

exports.create = function(file = CONFIG_PATH) {
    var defaultConfig;

    try {
        mkdirp.sync(path.dirname(file));
    } catch (e) {
        throw new ReferenceError("Cannot create config directory; ensure that permissions are set correctly");
    }

    try {
        defaultConfig = fs.readFileSync(CONFIG_DEFAULT_PATH);
    } catch (e) {
        throw new ReferenceError("Unable to read default configuration data; file may not exist");
    }

    try {
        fs.writeFileSync(file, defaultConfig);
    } catch (e) {
        throw new ReferenceError("Unable to write new configuration file; ensure that permissions for parent directory are set correctly");
    }
};

exports.load = function(file = CONFIG_PATH) {
    if (!fs.existsSync(file)) {
        throw new ReferenceError("No configuration file found, please create one");
    }

    try {
        exports.data = JSON.parse(fs.readFileSync(file));
    } catch (e) {
        throw new SyntaxError("Unable to parse configuration file; ensure that file is readable and correctly formatted");
    }
};

exports.init = function(file = CONFIG_PATH) {
    if (!fs.existsSync(file)) {
        exports.create(file);
    }

    exports.load(file);
};