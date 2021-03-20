const package = require("./package.json");
const os = require("os");
const express = require("express");

var config = require("./config");
var status = require("./status");

const app = express();

const DEFAULT_PORT = 44444;
const API_LEVEL = 0;

function statusBlocked(res) {
    if (status.status != "active") {
        res.status(503).json({"error": "statusNotActive"});

        return true;
    }

    return false;
}

app.get("/", function(req, res) {
    res.redirect("https://devicefuture.org");
});

app.get("/about", function(req, res) {
    res.json({
        "version": package.version,
        "apiLevel": API_LEVEL,
        "status": status.status,
        "info": !!config.data.about ? String(config.data.about).substring(0, 256) : undefined // Info string is limited to 256 chars to ensure performance
    });
});

exports.start = function(port = DEFAULT_PORT) {
    status.load();

    app.listen(port, function() {
        console.log(`Node server started: ${os.hostname()}:${port}`);
    });
};