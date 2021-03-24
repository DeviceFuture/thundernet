/*
    This code simplifies given resources so that non-essential information is
    stripped. For more details, see:

    https://github.com/DeviceFuture/spec/blob/main/0001-0999/0003-thundernet-html-semantics.md
*/

const jsdom = require("jsdom");

const DENY_HEADER_KEYWORDS = ["signin", "sign-in", "login", "log-in", "signout", "sign-out", "logout", "log-out", "account", "continue", "search", "join", "signup", "sign-up", "register", "session"];

exports.createNavigation = function(document) {
    var navigationElement = document.createElement("nav");
    var logoImageAvailable = true;

    console.log(document.querySelectorAll("header, nav"));

    if (document.querySelectorAll("header, nav").length == 0) {
        var homeLink = document.createElement("a");

        homeLink.href = "/";
        homeLink.textContent = document.title;

        navigationElement.appendChild(homeLink);

        return navigationElement;
    }

    document.querySelectorAll("header, nav")[0].querySelectorAll("a").forEach(function(element) {
        if (
            element.href.match(/#/g) || // Jump links
            (String(element.style.width).endsWith("px") && parseInt(element.style.width) < 10) // Visually hidden links (but screen reader accessible)
        ) {
            return;
        }

        var shouldCancel = false;

        navigationElement.childNodes.forEach(function(match) {
            shouldCancel ||= match.textContent.toLowerCase() == element.textContent.trim().replace(/s+(?=\s)/g, "").toLowerCase();
        });

        DENY_HEADER_KEYWORDS.forEach(function(keyword) {
            shouldCancel ||= element.href.toLowerCase().match(new RegExp(keyword));
        });

        if (shouldCancel) {
            return;
        }

        var newLink = document.createElement("a");

        newLink.href = element.href;
        newLink.textContent = element.textContent.trim().replace(/\s+(?=\s)/g, "");

        var newLinkImage = document.createElement("img");
        var newLinkImageInUse = false;

        newLinkImage.alt = newLink.textContent;

        if (element.style.background.match(/url/g)) {
            newLinkImage.src = element.style.background.match(/url\(["']([^)]+)["']\)/)[1]

            newLinkImageInUse = true;
        }

        if (element.style.backgroundImage.match(/url/g)) {
            newLinkImage.src = element.style.backgroundImage.match(/url\(["']([^)]+)["']\)/)[1]

            newLinkImageInUse = true;
        }

        if (element.querySelectorAll("img").length > 0) {
            newLinkImage.src = element.querySelectorAll("img")[0].src;
            newLinkImage.alt = element.querySelectorAll("img")[0].alt;

            newLinkImageInUse = true;
        }

        if (element.querySelectorAll("svg").length > 0) {
            if (element.querySelectorAll("svg")[0].outerHTML.match(/xmlns/)) {
                newLinkImage.src = "data:image/svg+xml," + encodeURIComponent(element.querySelectorAll("svg")[0].outerHTML);
            } else {
                newLinkImage.src = "data:image/svg+xml," + encodeURIComponent(element.querySelectorAll("svg")[0].outerHTML.replace(`<svg `, `<svg xmlns="http://www.w3.org/2000/svg" `));
            }

            newLinkImageInUse = true;
        }

        if (newLinkImageInUse && logoImageAvailable) {
            navigationElement.innerHTML = ""; // Disregard previous links since navigation logo must be first link
            newLink.innerHTML = "";

            newLink.appendChild(newLinkImage);

            logoImageAvailable = false;
        }

        navigationElement.appendChild(newLink);
    });

    return navigationElement;
};

exports.simplifyHtml = function(html, url) {
    var currentDocument = new jsdom.JSDOM(html, {
        url,
        contentType: "text/html",
        resources: "usable"
    }).window.document;

    var newDocument = new jsdom.JSDOM(`<body></body>`, {
        url,
        contentType: "text/html",
        resources: "usable"
    }).window.document;

    newDocument.body.appendChild(exports.createNavigation(currentDocument));

    return newDocument.body.innerHTML;
};

exports.simplifyResource = function(resource, url) {
    if (resource.mimetype != "text/html".split(";")[0]) {
        return resource; // Nothing to do if resource is not HTML-formatted
    }

    resource.buffer = Buffer.from(exports.simplifyHtml(resource.buffer.toString(), url));

    return resource;
};