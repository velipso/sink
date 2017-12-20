(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports", "./sink.js"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var sink = require("./sink.js");
    var isBrowser = typeof window === 'object';
    function L_pwd__b() {
        return window.location.href
            .replace(/^.*:/, '')
            .replace(/\?.*$/, '')
            .replace(/\/[^\/]*$/, '');
    }
    function L_pwd__n() {
        return process.cwd();
    }
    function scr(scr) {
        sink.scr_incbody(scr, 'shell', "declare args  'sink.shell.args' ;" +
            "declare cat   'sink.shell.cat'  ;" +
            "declare cd    'sink.shell.cd'   ;" +
            "declare cp    'sink.shell.cp'   ;" +
            "declare env   'sink.shell.env'  ;" +
            "declare exec  'sink.shell.exec' ;" +
            "declare glob  'sink.shell.glob' ;" +
            "declare head  'sink.shell.head' ;" +
            "declare ls    'sink.shell.ls'   ;" +
            "declare mv    'sink.shell.mv'   ;" +
            "declare mkdir 'sink.shell.mkdir';" +
            "declare pushd 'sink.shell.pushd';" +
            "declare popd  'sink.shell.popd' ;" +
            "declare pwd   'sink.shell.pwd'  ;" +
            "declare rm    'sink.shell.rm'   ;" +
            "declare tail  'sink.shell.tail' ;" +
            "declare test  'sink.shell.test' ;" +
            "declare which 'sink.shell.which';");
    }
    exports.scr = scr;
    function ctx(ctx) {
        sink.ctx_native(ctx, 'sink.shell.pwd', null, L_pwd__n);
    }
    exports.ctx = ctx;
});
