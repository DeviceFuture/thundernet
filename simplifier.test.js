const simplifier = require("./simplifier");
const resources = require("./resources");

var url = "https://edition.cnn.com/2021/03/24/world/mass-shootings-international-response-intl/index.html";

resources.retrieveResource(url, true).then(function(resource) {
    console.log("Downloaded. Parsing...");
    console.log(simplifier.simplifyHtml(resource.buffer.toString(), url));

    process.exit(0);
});