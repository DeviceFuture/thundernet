const simplifier = require("./simplifier");
const resources = require("./resources");

var url = "https://about.google.com/";

resources.retrieveResource(url, true).then(function(resource) {
    console.log("Downloaded. Parsing...");
    console.log(simplifier.simplifyHtml(resource.buffer.toString(), url));

    process.exit(0);
});