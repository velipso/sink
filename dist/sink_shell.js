//
// sink - Minimal programming language for embedding small scripts in larger programs
// by Sean Connelly (@velipso), https://sean.fun
// Project Home: https://github.com/velipso/sink
// SPDX-License-Identifier: 0BSD
//
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
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
    exports.scr = scr;
    exports.ctx = ctx;
    var sink = require("./sink.js");
    var VERSION_MAJ = 1;
    var VERSION_MIN = 0;
    var VERSION_PAT = 0;
    var isBrowser = typeof window === 'object';
    function L_version(ctx, args) {
        return __awaiter(this, void 0, void 0, function () {
            var reqmaj, reqmin, reqpat;
            return __generator(this, function (_a) {
                reqmaj = 0, reqmin = 0, reqpat = 0;
                if (args.length >= 1) {
                    if (!sink.isnum(args[0]))
                        return [2 /*return*/, sink.abortstr(ctx, 'Expecting number')];
                    reqmaj = args[0] | 0;
                }
                if (args.length >= 2) {
                    if (!sink.isnum(args[1]))
                        return [2 /*return*/, sink.abortstr(ctx, 'Expecting number')];
                    reqmin = args[1] | 0;
                }
                if (args.length >= 3) {
                    if (!sink.isnum(args[2]))
                        return [2 /*return*/, sink.abortstr(ctx, 'Expecting number')];
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
                    return [2 /*return*/, new sink.list(VERSION_MAJ, VERSION_MIN, VERSION_PAT)];
                }
                return [2 /*return*/, sink.abortstr(ctx, 'Script requires version ' + reqmaj + '.' + reqmin + '.' + reqpat + ', but sink is ' +
                        'version ' + VERSION_MAJ + '.' + VERSION_MIN + '.' + VERSION_PAT)];
            });
        });
    }
    function L_args(ctx, args, pargs) {
        return __awaiter(this, void 0, void 0, function () {
            var v, i;
            return __generator(this, function (_a) {
                v = new sink.list();
                for (i = 0; i < pargs.length; i++)
                    v.push(pargs[i]);
                return [2 /*return*/, v];
            });
        });
    }
    function L_dir_work(ctx, args) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, isBrowser ?
                        window.location.href
                            .replace(/^.*:/, '') // remove protocol
                            .replace(/\?.*$/, '') // remove query params
                            .replace(/\/[^\/]*$/, '') : // remove trailing file and slash
                        process.cwd()];
            });
        });
    }
    function scr(scr) {
        sink.scr_incbody(scr, 'shell', "declare version  'sink.shell.version' ;" +
            "declare args     'sink.shell.args'    ;" +
            "declare dir.work 'sink.shell.dir.work';");
    }
    function ctx(ctx, args) {
        sink.ctx_native(ctx, 'sink.shell.version', null, L_version);
        sink.ctx_native(ctx, 'sink.shell.args', args, L_args);
        sink.ctx_native(ctx, 'sink.shell.dir.work', null, L_dir_work);
    }
});
