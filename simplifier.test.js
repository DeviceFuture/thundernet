const simplifier = require("./simplifier");
const resources = require("./resources");

// TODO: Remove this script once simplification code is complete

var url = "";

resources.retrieveResource(url, true).then(function(resource) {
    console.log("Downloaded. Parsing...");
    console.log(simplifier.simplifyHtml(resource.buffer.toString(), url));

    process.exit(0);
});