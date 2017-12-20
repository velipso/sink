(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports", "./sink.js", "./sink_shell.js", "fs", "readline"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var sink = require("./sink.js");
    var sink_shell = require("./sink_shell.js");
    var fs = require("fs");
    var readline = require("readline");
    function io_say(ctx, str, iouser) {
        console.log(str);
    }
    function io_warn(ctx, str, iouser) {
        console.error(str);
    }
    function io_ask(ctx, str, iouser) {
        var rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        return new Promise(function (resolve, reject) {
            rl.question(str, function (ans) {
                rl.close();
                resolve(ans);
            });
        });
    }
    var io = {
        f_say: io_say,
        f_warn: io_warn,
        f_ask: io_ask
    };
    function fstype(file) {
        return new Promise(function (resolve, reject) {
            fs.stat(file, function (err, st) {
                if (err) {
                    if (err.code == 'ENOENT')
                        return resolve(sink.fstype.NONE);
                    return reject(err);
                }
                if (st.isFile())
                    return resolve(sink.fstype.FILE);
                else if (st.isDirectory())
                    return resolve(sink.fstype.DIR);
                resolve(sink.fstype.NONE);
            });
        });
    }
    function fsread(scr, file) {
        return new Promise(function (resolve, reject) {
            fs.readFile(file, 'binary', function (err, data) {
                if (err) {
                    console.error(err);
                    resolve(false);
                }
                else {
                    sink.checkPromise(sink.scr_write(scr, data), function (err) {
                        resolve(true);
                    });
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
        sink_shell.ctx(ctx);
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
    function main_repl(scr, argv) {
        return new Promise(function (resolve) {
            var ctx = newctx(scr, argv);
            var line = 1;
            nextLine();
            function nextLine() {
                var rl = readline.createInterface({
                    input: process.stdin,
                    output: process.stdout
                });
                var levels = sink.scr_level(scr);
                var p = ': ';
                if (levels > 0)
                    p = (new Array(levels + 1)).join('..') + '. ';
                if (line < 10)
                    p = ' ' + line + p;
                else
                    p = line + p;
                rl.question(p, function (ans) {
                    line++;
                    rl.close();
                    var buf = ans + '\n';
                    sink.checkPromise(sink.scr_write(scr, buf), function (written) {
                        if (!written)
                            printscrerr(scr);
                        if (sink.scr_level(scr) <= 0) {
                            sink.checkPromise(sink.ctx_run(ctx), function (res) {
                                switch (res) {
                                    case sink.run.PASS:
                                        resolve(true);
                                        return;
                                    case sink.run.FAIL:
                                        printctxerr(ctx);
                                        break;
                                    case sink.run.ASYNC:
                                        console.error('REPL invoked async function');
                                        resolve(false);
                                        return;
                                    case sink.run.TIMEOUT:
                                        console.error('REPL returned timeout (impossible)');
                                        resolve(false);
                                        return;
                                    case sink.run.REPLMORE:
                                        break;
                                }
                                nextLine();
                            });
                        }
                        else
                            nextLine();
                    });
                });
            }
        });
    }
    function main_run(scr, file, argv) {
        return sink.checkPromise(sink.scr_loadfile(scr, file), function (loaded) {
            if (!loaded) {
                printscrerr(scr);
                return false;
            }
            var ctx = newctx(scr, argv);
            return sink.checkPromise(sink.ctx_run(ctx), function (res) {
                if (res == sink.run.FAIL)
                    printctxerr(ctx);
                return res == sink.run.PASS;
            });
        });
    }
    function main_eval(scr, ev, argv) {
        return sink.checkPromise(sink.scr_write(scr, ev), function (written) {
            if (!written) {
                printscrerr(scr);
                return false;
            }
            var ctx = newctx(scr, argv);
            return sink.checkPromise(sink.ctx_run(ctx), function (res) {
                if (res == sink.run.FAIL)
                    printctxerr(ctx);
                return res == sink.run.PASS;
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
        return sink.checkPromise(sink.scr_loadfile(scr, file), function (loaded) {
            if (!loaded) {
                printscrerr(scr);
                return false;
            }
            perform_dump(scr, debug);
            return true;
        });
    }
    function main_compile_eval(scr, ev, debug) {
        return sink.checkPromise(sink.scr_write(scr, ev), function (written) {
            if (!written) {
                printscrerr(scr);
                return false;
            }
            perform_dump(scr, debug);
            return true;
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
        var argv = process.argv.splice(1);
        var argc = argv.length;
        var compile = false;
        var compile_debug = false;
        var input_type = 'repl';
        var input_content = '';
        var i = 1;
        for (; i < argc; i++) {
            var a = argv[i];
            if (a === '-v') {
                if (i + 1 < argc) {
                    print_help();
                    return false;
                }
                print_version();
                return true;
            }
            else if (a === '-h' || a === '--help') {
                print_help();
                return i + 1 < argc ? false : true;
            }
            else if (a === '-I') {
                if (i + 1 >= argc) {
                    print_help();
                    return false;
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
                    return false;
                }
                i += 2;
            }
            else if (a === '-e') {
                if (i + 1 >= argc) {
                    print_help();
                    return false;
                }
                input_content = argv[i + 1];
                i += 2;
                input_type = 'eval';
                break;
            }
            else {
                if (a.charAt(0) === '-') {
                    print_help();
                    return false;
                }
                input_content = a;
                i++;
                input_type = 'file';
                break;
            }
        }
        if (compile && input_type == 'repl') {
            print_help();
            return false;
        }
        var s_argv = argv.slice(i);
        var cwd = process.cwd();
        var scr = sink.scr_new(inc, cwd, input_type === 'repl');
        sink.scr_addpath(scr, '.');
        sink_shell.scr(scr);
        for (i = 1; argv[i] !== input_content && i < argv.length; i++) {
            var a = argv[i];
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
                return main_compile_file(scr, input_content, compile_debug);
            return main_run(scr, input_content, s_argv);
        }
        else if (input_type === 'repl')
            return main_repl(scr, s_argv);
        else if (input_type === 'eval') {
            if (compile)
                return main_compile_eval(scr, input_content, compile_debug);
            return main_eval(scr, input_content, s_argv);
        }
        throw new Error('Bad input type');
    }
    exports.main = main;
});
