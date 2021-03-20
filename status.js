const config = require("./config");
const state = require("./state");

exports.status = "off";
exports.until = null;

exports.load = function() {
    exports.until = null;

    config.load();

    if (["off", "decommissioned"].includes(config.data.status)) {
        exports.status = config.data.status;

        return;
    }

    state.load();

    if (state.data.status == "tempoff") {
        exports.status = "tempoff";
        exports.until = !!state.data.until ? new Date(state.data.until) : null;

        return;
    }

    exports.status = "active";
};