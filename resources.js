const http = require("http");
const https = require("https");
const os = require("os");
const path = require("path");
const fs = require("fs");
const mkdirp = require("mkdirp");

var config = require("./config.js");
var compression = require("./compression");
var encryption = require("./encryption");
var db = require("./db");
var tools = require("./tools");

const MAX_DEFAULT_REQUEST_SIZE = 10 * 1024 * 1024; // 10 KiB
const MAX_REDIRECTION_DEPTH = 5;
const RESOURCE_CACHE_PATH = config.data.resourceCachePath || path.join(os.homedir(), ".config", "thundernet", "resourcecache");
const CACHE_CLEAN_MAX_TIME = config.data.cacheCleanMaxTime || 7 * 24 * 60 * 60 * 1000; // 7 days
const CACHE_CLEAN_MAX_RETRIEVALS = config.data.cacheCleanMaxRetrievals || 1000; // 1,000 retrievals

exports.Resource = class {
    constructor(buffer, status, mimetype, fromCache = false, lastUpdated = null) {
        this.buffer = buffer;
        this.status = status;
        this.mimetype = mimetype;
        this.fromCache = fromCache;
        this.lastUpdated = lastUpdated;

        this.compressedBuffer = null;
    }
};

exports.ResourceVersion = class {
    constructor(resource, hash) {
        this.resource = resource;
        this.hash = hash;
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
                    response.headers["content-type"],
                    false,
                    new Date()
                ));
            });

            response.on("error", function(error) {
                reject(error);
            });
        });
    });
};

exports.findInCache = function(url) {
    return new Promise(function(resolve, reject) { // `resolve` called on cache hit with returned data, or `reject` called on cache miss
        db.collections.resourceCache.findOne({url}, function(error, doc) {
            if (error) {
                reject(error);

                return;
            }

            if (doc == null) {
                reject("Cache miss");

                return;
            }

            try {
                var data = fs.readFileSync(path.join(RESOURCE_CACHE_PATH, doc.resourceId), {
                    encoding: null
                });

                var resource = new exports.Resource(
                    null,
                    doc.status,
                    doc.mimetype,
                    true,
                    new Date(doc.firstRetrieved)
                );

                resource.compressedBuffer = Buffer.from(data);

                db.collections.resourceCache.update({url}, {
                    $set: {lastRetrieved: new Date().getTime()},
                    $inc: {timesRetrieved: 1}
                }, {multi: true}, function() {
                    resolve(resource);
                });
            } catch (e) {
                reject(e);
            }
        });
    });
};

exports.cleanCache = function() {
    return new Promise(function(resolve, reject) {
        db.collections.resourceCache.remove({$or: [
            {
                lastRetrieved: {$lt: new Date().getTime() - CACHE_CLEAN_MAX_TIME}
            },
            {
                timesRetrieved: {$gt: CACHE_CLEAN_MAX_RETRIEVALS}
            }
        ]}, {multi: true}, function(error, removed) {
            if (error) {
                console.warn("Couldn't clean cache:", error);
            }

            if (removed > 0) {
                console.log(`Cache cleaned, ${removed} removed`);
            }

            resolve();
        });
    });
};

exports.addToCache = function(resource, url) {
    return new Promise(function(resolve, reject) {
        try {
            mkdirp.sync(RESOURCE_CACHE_PATH);
        } catch (e) {
            console.warn(`Cannot cache resource: path ${RESOURCE_CACHE_PATH} could not be created`);

            return;
        }

        var resourceId = tools.generateKey();

        try {
            fs.writeFileSync(path.join(RESOURCE_CACHE_PATH, resourceId), resource.compressedBuffer);
        } catch (e) {
            console.warn(`Cannot cache resource: file ${path.join(RESOURCE_CACHE_PATH, resourceId)} could not be created`);

            return;
        }

        db.collections.resourceCache.insert({
            url,
            resourceId,
            status: resource.status,
            mimetype: resource.mimetype,
            firstRetrieved: new Date().getTime(),
            lastRetrieved: new Date().getTime(),
            timesRetrieved: 1
        }, function(error) {
            if (error) {
                console.warn("Could not update cache index", error);
            }

            resolve();
        });
    });
};

exports.retrieveResource = function(url, forceCacheRefresh = false) {
    var resource;

    return exports.cleanCache().then(function() {
        return (
            !forceCacheRefresh ?
            exports.findInCache(url) :
            Promise.reject()
        ).catch(function() {
            return exports.performResourceRequest(url).then(function(returnedResource) {
                resource = returnedResource;

                return compression.compress(resource.buffer);
            }).then(function(compressedByteArray) {
                resource.compressedBuffer = Buffer.from(compressedByteArray);

                return resource;
            });
        }).then(function(resource) {
            if (!resource.fromCache) {
                return exports.addToCache(resource, url).then(function() {
                    return Promise.resolve(resource);
                });
            }

            return Promise.resolve(resource);
        });
    });
};

exports.retrieveResourceVersion = function(url) {
    var resource;

    return exports.retrieveResource(url).then(function(retrievedResource) {
        resource = retrievedResource;

        return encryption.hash(resource.compressedBuffer);
    }).then(function(hash) {
        return new exports.ResourceVersion(resource, hash);
    })
};