const http = require("http");
const https = require("https");

var config = require("./config.js");
var compression = require("./compression");
var ep = require("./ep");

const MAX_DEFAULT_REQUEST_SIZE = 10 * 1024 * 1024; // 10 KiB
const MAX_REDIRECTION_DEPTH = 5;

exports.Resource = class {
    constructor(buffer, status, mimetype) {
        this.buffer = buffer;
        this.status = status;
        this.mimetype = mimetype;

        this.compressedBuffer = null;
    }
};

exports.performResourceRequest = function(url, redirectionDepth = 0) {
    if (redirectionDepth > MAX_REDIRECTION_DEPTH) {
        return Promise.reject("Max redirection depth exceeded");
    }

    if (!url.startsWith("http://") && !url.startsWith("https://")) {
        return Promise.reject("URL must include a protocol identifier of either HTTP or HTTPS");
    }

    return new Promise(function(resolve, reject) {
        (url.startsWith("https://") ? https : http).get(url, function(response) {
            var data = [];
            var size = 0;

            if (Number(response.headers["content-length"]) > (config.data.size || MAX_DEFAULT_REQUEST_SIZE)) {
                response.destroy();

                reject("Resource has exceeded maximum request size");
            }

            response.on("data", function(chunk) {
                data.push(chunk);

                size += Buffer.from(chunk).length;

                if (size > (config.data.size || MAX_DEFAULT_REQUEST_SIZE)) {
                    response.destroy();

                    reject("Resource has exceeded maximum request size");
                }
            });

            response.on("end", function() {
                if ([301, 302, 303, 304, 307, 308].includes(response.statusCode)) {
                    exports.performResourceRequest(response.headers["location"] || url, redirectionDepth + 1).then(resolve).catch(reject);

                    return;
                }

                resolve(new exports.Resource(
                    Buffer.concat(data),
                    response.statusCode,
                    response.headers["content-type"]
                ));
            });

            response.on("error", function(error) {
                reject(error);
            });
        });
    });
};

exports.retrieveResource = function(url) {
    var resource;

    return exports.performResourceRequest(url).then(function(returnedResource) {
        resource = returnedResource;

        return compression.compress(resource.buffer);
    }).then(function(compressedByteArray) {
        resource.compressedBuffer = Buffer.from(compressedByteArray);

        return resource;
    });
};