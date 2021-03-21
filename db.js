const path = require("path");
const os = require("os");
const Datastore = require("nedb");

var config = require("./config");

const DB_ROOT_PATH = config.data.dbRoot || path.join(os.homedir(), ".config", "thundernet", "db");
const ENDPOINT_PROFILES_COLLECTION_PATH = path.join(DB_ROOT_PATH, "ep.db");

exports.collections = {};

exports.collections.endpointProfiles = new Datastore({
    "filename": ENDPOINT_PROFILES_COLLECTION_PATH
});

exports.collections.endpointProfiles.persistence.setAutocompactionInterval(60 * 60 * 1000); // Every hour
exports.collections.endpointProfiles.loadDatabase();