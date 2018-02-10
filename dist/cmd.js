var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = y[op[0] & 2 ? "return" : op[0] ? "throw" : "next"]) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [0, t.value];
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
        define(["require", "exports", "./sink.js", "./sink_shell.js", "fs", "path", "readline"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var sink = require("./sink.js");
    var sink_shell = require("./sink_shell.js");
    var fs = require("fs");
    var path = require("path");
    var readline = require("readline");
    function io_say(ctx, str, iouser) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                console.log(str);
                return [2, sink.NIL];
            });
        });
    }
    function io_warn(ctx, str, iouser) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                console.error(str);
                return [2, sink.NIL];
            });
        });
    }
    function io_ask(ctx, str, iouser) {
        return __awaiter(this, void 0, void 0, function () {
            var rl;
            return __generator(this, function (_a) {
                rl = readline.createInterface({
                    input: process.stdin,
                    output: process.stdout
                });
                return [2, new Promise(function (resolve, reject) {
                        rl.question(str, function (ans) {
                            rl.close();
                            resolve(ans);
                        });
                    })];
            });
        });
    }
    var io = {
        f_say: io_say,
        f_warn: io_warn,
        f_ask: io_ask
    };
    function nodeStat(file) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2, new Promise(function (resolve, reject) {
                        fs.stat(file, function (err, st) {
                            if (err) {
                                if (err.code == 'ENOENT')
                                    resolve(null);
                                else
                                    reject(err);
                            }
                            else
                                resolve(st);
                        });
                    })];
            });
        });
    }
    function fstype(scr, file) {
        return __awaiter(this, void 0, void 0, function () {
            var st;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4, nodeStat(file)];
                    case 1:
                        st = _a.sent();
                        if (st !== null) {
                            if (st.isFile())
                                return [2, sink.fstype.FILE];
                            else if (st.isDirectory())
                                return [2, sink.fstype.DIR];
                        }
                        return [2, sink.fstype.NONE];
                }
            });
        });
    }
    function nodeRead(file) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2, new Promise(function (resolve, reject) {
                        fs.readFile(file, 'binary', function (err, data) {
                            if (err) {
                                console.error(err);
                                resolve(null);
                            }
                            else
                                resolve(data);
                        });
                    })];
            });
        });
    }
    function fsread(scr, file) {
        return __awaiter(this, void 0, void 0, function () {
            var data;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4, nodeRead(file)];
                    case 1:
                        data = _a.sent();
                        if (data === null)
                            return [2, false];
                        return [4, sink.scr_write(scr, data)];
                    case 2:
                        _a.sent();
                        return [2, true];
                }
            });
        });
    }
    var inc = {
        f_fstype: fstype,
        f_fsread: fsread
    };
    function newctx(scr, argv) {
        var ctx = sink.ctx_new(scr, io);
        sink_shell.ctx(ctx, argv);
        return ctx;
    }
    function printscrerr(scr) {
        console.error(sink.scr_geterr(scr));
    }
    function printctxerr(ctx) {
        var err = sink.ctx_geterr(ctx);
        if (err === null)
            return;
        console.error(err);
    }
    function readPrompt(p) {
        return __awaiter(this, void 0, void 0, function () {
            var rl;
            return __generator(this, function (_a) {
                rl = readline.createInterface({
                    input: process.stdin,
                    output: process.stdout
                });
                return [2, new Promise(function (resolve) {
                        rl.question(p, function (ans) {
                            rl.close();
                            resolve(ans);
                        });
                    })];
            });
        });
    }
    function main_repl(scr, argv) {
        return __awaiter(this, void 0, void 0, function () {
            var ctx, line, levels, p, ans, buf;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        ctx = newctx(scr, argv);
                        line = 1;
                        _a.label = 1;
                    case 1:
                        if (!true) return [3, 6];
                        levels = sink.scr_level(scr);
                        p = ': ';
                        if (levels > 0)
                            p = (new Array(levels + 1)).join('..') + '. ';
                        if (line < 10)
                            p = ' ' + line + p;
                        else
                            p = line + p;
                        return [4, readPrompt(p)];
                    case 2:
                        ans = _a.sent();
                        line++;
                        buf = ans + '\n';
                        return [4, sink.scr_write(scr, buf)];
                    case 3:
                        if (!(_a.sent()))
                            printscrerr(scr);
                        if (!(sink.scr_level(scr) <= 0)) return [3, 5];
                        return [4, sink.ctx_run(ctx)];
                    case 4:
                        switch (_a.sent()) {
                            case sink.run.PASS:
                                return [2, true];
                            case sink.run.FAIL:
                                printctxerr(ctx);
                                break;
                            case sink.run.ASYNC:
                                console.error('REPL returned async (impossible)');
                                return [2, false];
                            case sink.run.TIMEOUT:
                                console.error('REPL returned timeout (impossible)');
                                return [2, false];
                            case sink.run.REPLMORE:
                                break;
                        }
                        _a.label = 5;
                    case 5: return [3, 1];
                    case 6: return [2];
                }
            });
        });
    }
    function main_run(scr, file, argv) {
        return __awaiter(this, void 0, void 0, function () {
            var ctx, res;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4, sink.scr_loadfile(scr, file)];
                    case 1:
                        if (!(_a.sent())) {
                            printscrerr(scr);
                            return [2, false];
                        }
                        ctx = newctx(scr, argv);
                        return [4, sink.ctx_run(ctx)];
                    case 2:
                        res = _a.sent();
                        if (res == sink.run.FAIL)
                            printctxerr(ctx);
                        return [2, res == sink.run.PASS];
                }
            });
        });
    }
    function main_eval(scr, ev, argv) {
        return __awaiter(this, void 0, void 0, function () {
            var ctx, res;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4, sink.scr_write(scr, ev)];
                    case 1:
                        if (!(_a.sent())) {
                            printscrerr(scr);
                            return [2, false];
                        }
                        ctx = newctx(scr, argv);
                        return [4, sink.ctx_run(ctx)];
                    case 2:
                        res = _a.sent();
                        if (res == sink.run.FAIL)
                            printctxerr(ctx);
                        return [2, res == sink.run.PASS];
                }
            });
        });
    }
    function perform_dump(scr, debug) {
        var dump_data = '';
        function dump(data) {
            dump_data += data;
        }
        sink.scr_dump(scr, debug, null, dump);
        process.stdout.write(dump_data, 'binary');
    }
    function main_compile_file(scr, file, debug) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4, sink.scr_loadfile(scr, file)];
                    case 1:
                        if (!(_a.sent())) {
                            printscrerr(scr);
                            return [2, false];
                        }
                        perform_dump(scr, debug);
                        return [2, true];
                }
            });
        });
    }
    function main_compile_eval(scr, ev, debug) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4, sink.scr_write(scr, ev)];
                    case 1:
                        if (!(_a.sent())) {
                            printscrerr(scr);
                            return [2, false];
                        }
                        perform_dump(scr, debug);
                        return [2, true];
                }
            });
        });
    }
    function print_version() {
        console.log('Sink v1.0\n' +
            'Copyright (c) 2016-2018 Sean Connelly (@voidqk), MIT License\n' +
            'https://github.com/voidqk/sink  http://sean.cm');
    }
    function print_help() {
        print_version();
        console.log('\nUsage:\n' +
            '  sink [options] [ -e \'<code>\' | <file> ] [arguments]\n' +
            '\n' +
            'With no arguments, sink will enter interactive mode (REPL).\n' +
            '\n' +
            'Option           Description\n' +
            '  -v               Display version information and exit\n' +
            '  -h, --help       Display help information and exit\n' +
            '  -I <path>        Add <path> to the include search path\n' +
            '  -c               Compile input and output bytecode to stdout\n' +
            '  -d               If compiling, output bytecode with debug info\n' +
            '  -D <key> <file>  If compiling, add <file> declarations when including <key>\n' +
            '\n' +
            '  The -D option is useful for providing declarations so that compilation can\n' +
            '  succeed for other host environments.\n' +
            '\n' +
            '  For example, a host might provide declarations for native commands via:\n' +
            '\n' +
            '    include \'shapes\'\n' +
            '\n' +
            '  The host could provide a declaration file, which can be used during\n' +
            '  compilation using a `-D shapes shapes_decl.sink` option.  This means when the\n' +
            '  script executes `include \'shapes\'`, the compiler will load `shapes_decl.sink`.\n' +
            '  Even though the compiler doesn\'t know how to execute the host commands, it can\n' +
            '  still compile the file for use in the host environment.');
    }
    function main() {
        return __awaiter(this, void 0, void 0, function () {
            var argv, argc, compile, compile_debug, input_type, input_content, i, a, s_argv, cwd, scr, a;
            return __generator(this, function (_a) {
                argv = process.argv.splice(1);
                argc = argv.length;
                compile = false;
                compile_debug = false;
                input_type = 'repl';
                input_content = '';
                i = 1;
                for (; i < argc; i++) {
                    a = argv[i];
                    if (a === '-v') {
                        if (i + 1 < argc) {
                            print_help();
                            return [2, false];
                        }
                        print_version();
                        return [2, true];
                    }
                    else if (a === '-h' || a === '--help') {
                        print_help();
                        return [2, i + 1 < argc ? false : true];
                    }
                    else if (a === '-I') {
                        if (i + 1 >= argc) {
                            print_help();
                            return [2, false];
                        }
                        i++;
                    }
                    else if (a === '-c')
                        compile = true;
                    else if (a === '-d')
                        compile_debug = true;
                    else if (a === '-D') {
                        if (i + 2 >= argc) {
                            print_help();
                            return [2, false];
                        }
                        i += 2;
                    }
                    else if (a === '-e') {
                        if (i + 1 >= argc) {
                            print_help();
                            return [2, false];
                        }
                        input_content = argv[i + 1];
                        i += 2;
                        input_type = 'eval';
                        break;
                    }
                    else if (a === '--') {
                        i++;
                        break;
                    }
                    else {
                        if (a.charAt(0) === '-') {
                            print_help();
                            return [2, false];
                        }
                        input_content = a;
                        i++;
                        input_type = 'file';
                        break;
                    }
                }
                if (compile && input_type == 'repl') {
                    print_help();
                    return [2, false];
                }
                s_argv = argv.slice(i);
                cwd = process.cwd();
                scr = sink.scr_new(inc, cwd, path.sep === '/', input_type === 'repl');
                sink.scr_addpath(scr, '.');
                sink_shell.scr(scr);
                for (i = 1; argv[i] !== input_content && i < argv.length; i++) {
                    a = argv[i];
                    if (a === '-I') {
                        sink.scr_addpath(scr, argv[i + 1]);
                        i++;
                    }
                    else if (a === '-D') {
                        sink.scr_incfile(scr, argv[i + 1], argv[i + 2]);
                        i += 2;
                    }
                }
                if (input_type === 'file') {
                    if (compile)
                        return [2, main_compile_file(scr, input_content, compile_debug)];
                    return [2, main_run(scr, input_content, s_argv)];
                }
                else if (input_type === 'repl')
                    return [2, main_repl(scr, s_argv)];
                else if (input_type === 'eval') {
                    if (compile)
                        return [2, main_compile_eval(scr, input_content, compile_debug)];
                    return [2, main_eval(scr, input_content, s_argv)];
                }
                throw new Error('Bad input type');
            });
        });
    }
    exports.main = main;
});
