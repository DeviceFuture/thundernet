/*
    This code simplifies given resources so that non-essential information is
    stripped. For more details, see:

    https://github.com/DeviceFuture/spec/blob/main/0001-0999/0003-thundernet-html-semantics.md
*/

const jsdom = require("jsdom");

const DENY_HEADER_KEYWORDS = ["signin", "sign-in", "login", "log-in", "signout", "sign-out", "logout", "log-out", "account", "continue", "search", "join", "signup", "sign-up", "register", "session"];
const DENY_ELEMENT_ATTRIBUTES = ["id", "class", "style"];

function findClosestElementDescendent(element, candidateParents) {
    var parentElement = element.parentNode;

    while (parentElement) {
        for (var i = 0; i < candidateParents.length; i++) {
            if (parentElement.isEqualNode(candidateParents[i])) {
                return parentElement;
            }
        }

        parentElement = parentElement.parentNode;
    }

    return null;
}

function isInElementOf(element, parentTagName) {
    var parentElement = element.parentNode;

    while (parentElement) {
        if (parentElement.tagName == parentTagName) {
            return true;
        }

        parentElement = parentElement.parentNode;
    }

    return false;
}

exports.createNavigation = function(document) {
    var navigationElement = document.createElement("nav");
    var logoImageAvailable = true;

    if (document.querySelectorAll("header, nav").length == 0) {
        var homeLink = document.createElement("a");

        homeLink.href = "/";
        homeLink.textContent = document.title;

        navigationElement.appendChild(homeLink);

        return navigationElement;
    }

    document.querySelectorAll("header, nav")[0].querySelectorAll("a").forEach(function(element) {
        if (element.href.match(/#/g)) { // Jump links
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
            if (element.querySelectorAll("svg")[0].getAttribute("xmlns") != null) {
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

exports.createArticle = function(document) {
    var mainElement = document.createElement("main");
    var sectionElements = [document.createElement("section")];
    var asideElements = [];

    document.querySelectorAll("h1, h2, h3, h4, h5, h6, p, figure, blockquote, img, table, pre, input, select, button").forEach(function(element) {
        var lastSection = sectionElements[sectionElements.length - 1];

        if (isInElementOf(element, "NAV") || isInElementOf(element, "FOOTER") || isInElementOf(element, "BLOCKQUOTE")) {
            return;
        }

        if (["H1", "H2", "H3", "H4", "H5", "H6"].includes(element.tagName)) {
            var newSection = document.createElement("section");

            newSection.appendChild(element);
            sectionElements.push(newSection);

            return;
        }

        if (["INPUT", "SELECT", "BUTTON"].includes(element.tagName)) {
            sectionElements.pop();
            sectionElements.push(document.createElement("section"));

            return;
        }

        var possibleLinkParent = findClosestElementDescendent(element, document.querySelectorAll("a"));

        if (possibleLinkParent != null) {
            lastSection.appendChild(possibleLinkParent);

            return;
        }

        if (element.tagName == "IMG" && isInElementOf(element, "FIGURE")) {
            return; // If image is in a figure, then the figure should be in the article at some point
        }

        if (element.tagName == "FIGURE") {
            var newFigure = document.createElement("figure");
            var newImage = document.createElement("img");
            var newCaption = document.createElement("figcaption");

            if (element.querySelectorAll("img").length > 0) {
                newImage.src = element.querySelectorAll("img")[0].src;
                newImage.alt = element.querySelectorAll("img")[0].alt;
            } else {
                return;
            }

            if (element.querySelectorAll("figcaption p, figcaption").length > 0) {
                newCaption.textContent = element.querySelectorAll("figcaption p, figcaption")[0].textContent;
                newCaption.textContent = element.querySelectorAll("figcaption p, figcaption")[0].textContent;
            } else {
                return;
            }

            newFigure.appendChild(newImage);
            newFigure.appendChild(newCaption);

            lastSection.appendChild(newFigure);

            return;
        }

        lastSection.append(element);
    });

    sectionElements.forEach(function(sectionElement) {
        var encounteredParagraphs = false;

        if (sectionElement.textContent.trim() == "") { // Redundant section
            return;
        }

        sectionElement.querySelectorAll("p").forEach(function(element) {
            if (!isInElementOf(element, "A")) {
                encounteredParagraphs = true;
            }
        });

        if (!encounteredParagraphs) {
            var linkElements = [];
            var imageBeforeLinkMode = false;
            var imageToInsert = null;

            sectionElement.querySelectorAll("a, img").forEach(function(element) {
                if (linkElements.length == 0 && element.tagName == "IMG") {
                    imageBeforeLinkMode = true;
                }

                if (element.tagName == "IMG" && imageBeforeLinkMode) {
                    imageToInsert = element;
                }

                if (element.tagName == "A") {
                    if (imageBeforeLinkMode && imageToInsert != null) {
                        element.prepend(imageToInsert);
                        linkElements.push(element);
                    }
                }
            });

            var asideElement = document.createElement("aside");

            asideElement.setAttribute("list", "");

            if (linkElements.length > 0) {
                if (sectionElement.querySelectorAll("h1, h2, h3, h4, h5, h6").length > 0) {
                    asideElement.appendChild(sectionElement.querySelectorAll("h1, h2, h3, h4, h5, h6")[0]);
                }

                linkElements.forEach(function(linkElement) {
                    asideElement.appendChild(linkElement);
                });
    
                asideElements.push(asideElement);
            }

            return;
        }

        mainElement.appendChild(sectionElement);
    });

    return {
        mainElement,
        asideElements
    };
};

exports.createFooter = function(document) {
    var footerElement = document.createElement("footer");

    if (document.querySelectorAll("footer").length == 0) {
        return footerElement;
    }

    document.querySelectorAll("footer")[0].querySelectorAll("a, p, small").forEach(function(element) {
        if (element.tagName == "A" && (isInElementOf(element, "P") || isInElementOf(element, "SMALL"))) {
            return; // If link is in a paragraph or small element, then the link should be in the article at some point
        }

        footerElement.appendChild(element);
    });

    return footerElement;
};

exports.determineTheme = function(document) {
    var themeData = {
        "tn:accent1": document.querySelectorAll("meta[name='theme-color']")[0].getAttribute("content") || "#ebebeb"
    };

    return themeData;
};

exports.createHeadElements = function(document) {
    var elements = [];
    var metas = {...exports.determineTheme(document)};

    if (document.querySelectorAll("title").length != 0) {
        elements.push(document.querySelectorAll("title")[0]);
    }

    for (var meta in metas) {
        var metaElement = document.createElement("meta");

        metaElement.name = meta;
        metaElement.content = metas[meta];

        elements.push(metaElement);
    }

    return elements;
}

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

    currentDocument.querySelectorAll("*").forEach(function(element) {
        DENY_ELEMENT_ATTRIBUTES.forEach((attribute) => element.removeAttribute(attribute));

        for (var i = 0; i < element.attributes.length; i++) {
            if (element.attributes[i].name.startsWith("data-") || element.attributes[i].name.startsWith("on")) {
                element.removeAttribute(element.attributes[i]);
            }
        }

        if (element.tagName == "IMG" && (element.getAttribute("src") || "").startsWith("//")) {
            element.setAttribute("src", "https:" + element.getAttribute("src"));
        }
    });

    exports.createHeadElements(currentDocument).forEach(function(headElement) {
        newDocument.body.appendChild(headElement);
    });

    newDocument.body.appendChild(exports.createNavigation(currentDocument));

    var article = exports.createArticle(currentDocument);

    newDocument.body.appendChild(article.mainElement);

    article.asideElements.forEach(function(asideElement) {
        newDocument.body.appendChild(asideElement);
    });

    newDocument.body.appendChild(exports.createFooter(currentDocument));

    return newDocument.body.innerHTML;
};

exports.simplifyResource = function(resource, url) {
    if (resource.mimetype != "text/html".split(";")[0]) {
        return resource; // Nothing to do if resource is not HTML-formatted
    }

    resource.buffer = Buffer.from(exports.simplifyHtml(resource.buffer.toString(), url));

    return resource;
};