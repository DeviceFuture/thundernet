const crypto = require("crypto").webcrypto;

const ALGORITHM = {
    name: "AES-CTR",
    length: 64
};

const KEY_ALGORITHM = {
    name: "AES-CTR",
    length: 256
};

exports.EncryptionData = class {
    constructor(buffer, counter) {
        this.buffer = buffer;
        this.counter = counter;
    }
};

function importKey(jwk) {
    return crypto.subtle.importKey("jwk", jwk, KEY_ALGORITHM, true, ["encrypt", "decrypt"]);
}

exports.generateKey = function() {
    return crypto.subtle.generateKey(KEY_ALGORITHM, true, ["encrypt", "decrypt"]).then(function(key) {
        return crypto.subtle.exportKey("jwk", key);
    });
};

exports.encrypt = function(data, jwk) {
    var counter = crypto.getRandomValues(new Uint8Array(16));

    return importKey(jwk).then(function(key) {
        return crypto.subtle.encrypt({...ALGORITHM, counter}, key, data);
    }).then(function(encryptedData) {
        return new exports.EncryptionData(encryptedData, counter);
    });
};

exports.hash = function(data) {
    return crypto.subtle.digest("SHA-256", data).then(function(digest) {
        return Buffer.from(digest).toString("hex");
    });
};