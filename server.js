// Implementation follows spec: https://github.com/DeviceFuture/spec/blob/main/0001-0999/0002-thundernet-api.md

const package = require("./package.json");
const os = require("os");
const express = require("express");

var config = require("./config");
var status = require("./status");
var ep = require("./ep");
var resources = require("./resources");
var compression = require("./compression");

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

app.use(function(req, res, next) {
    res.set("X-Powered-By", "ThunderNet");
    next();
});

app.get("/", function(req, res) {
    res.redirect(config.data.defaultRedirect || "https://devicefuture.org");
});

app.get("/about", function(req, res) {
    res.json({
        "version": package.version,
        "apiLevel": API_LEVEL,
        "status": status.status,
        "info": !!config.data.about ? String(config.data.about).substring(0, 256) : undefined // Info string is limited to 256 chars to ensure performance
    });
});

app.get("/register", function(req, res) {
    ep.createNew().then(function(epObject) {
        res.json(epObject);
    });
});

app.get("/access", function(req, res) {
    if (
        typeof(req.query["url"]) != "string" ||
        typeof(req.query["epid"]) != "string"
    ) {
        res.status(400).json({"error": "unsatisfiedRestriction"});

        return;
    }

    var resource;

    resources.retrieveResource(req.query["url"]).then(function(retrievedResource) {
        resource = retrievedResource;

        return ep.encryptUsingEpid(resource.compressedBuffer, req.query["epid"]).catch(function(error) {
            console.error(error);

            res.status(400).json({"error": "unsatisfiedRestriction"});

            return Promise.reject();
        });
    }).then(function(encryptionData) {
        res
            .status(resource.status == 200 ? 200 : 504)
            .type(resource.mimetype)
            .set("Tn-Encryption-Counter", Buffer.from(encryptionData.counter).toString("hex"))
            .send(Buffer.from(encryptionData.buffer))
        ;
    });
});

exports.start = function(port = DEFAULT_PORT) {
    status.load();

    app.listen(port, function() {
        console.log(`Node server started: ${os.hostname()}:${port}`);
    });
};