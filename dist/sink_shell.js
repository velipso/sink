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
    var VERSION_MAJ = 1;
    var VERSION_MIN = 0;
    var VERSION_PAT = 0;
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
    function L_version(ctx, args) {
        var reqmaj = 0, reqmin = 0, reqpat = 0;
        if (args.length >= 1) {
            if (!sink.isnum(args[0]))
                return sink.abortstr(ctx, 'Expecting number');
            reqmaj = args[0] | 0;
        }
        if (args.length >= 2) {
            if (!sink.isnum(args[1]))
                return sink.abortstr(ctx, 'Expecting number');
            reqmin = args[1] | 0;
        }
        if (args.length >= 3) {
            if (!sink.isnum(args[2]))
                return sink.abortstr(ctx, 'Expecting number');
            reqpat = args[2] | 0;
        }
        while (true) {
            if (reqmaj > VERSION_MAJ)
                break;
            else if (reqmaj == VERSION_MAJ) {
                if (reqmin > VERSION_MIN)
                    break;
                else if (reqmin == VERSION_MIN) {
                    if (reqpat > VERSION_PAT)
                        break;
                }
            }
            return new sink.list(VERSION_MAJ, VERSION_MIN, VERSION_PAT);
        }
        return sink.abortstr(ctx, 'Script requires version ' + reqmaj + '.' + reqmin + '.' + reqpat + ', but sink is ' +
            'version ' + VERSION_MAJ + '.' + VERSION_MIN + '.' + VERSION_PAT);
    }
    function L_args(ctx, args, pargs) {
        var v = new sink.list();
        for (var i = 0; i < pargs.length; i++)
            v.push(pargs[i]);
        return v;
    }
    function scr(scr) {
        sink.scr_incbody(scr, 'shell', "declare version 'sink.shell.version';" +
            "declare args    'sink.shell.args'   ;");
    }
    exports.scr = scr;
    function ctx(ctx, args) {
        sink.ctx_native(ctx, 'sink.shell.version', null, L_version);
        sink.ctx_native(ctx, 'sink.shell.args', args, L_args);
    }
    exports.ctx = ctx;
});
