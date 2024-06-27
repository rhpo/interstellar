
const colors = require('colors');

function s(sub = false) {
    return sub ? "  ↳ " : "";

}

function info(msg, sub = false) {
    console.log(s(sub) + colors.green("ℹ️ " + msg));
}

function error(msg, sub = false) {
    console.log(s(sub) + colors.red("⚠️ " + msg));
}

function warn(msg, sub = false) {
    console.log(s(sub) + colors.yellow("~ " + msg));
}

function tell(msg, fn, sub) {
    console.log(s(sub) + (fn ? fn(colors.dim("🔔 " + msg)) : colors.dim("🔔 " + msg)));
}

module.exports = {
    info,
    error,
    warn,
    tell
};
