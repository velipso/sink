var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
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
        define(["require", "exports"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var type;
    (function (type) {
        type[type["NIL"] = 0] = "NIL";
        type[type["NUM"] = 1] = "NUM";
        type[type["STR"] = 2] = "STR";
        type[type["LIST"] = 3] = "LIST";
    })(type = exports.type || (exports.type = {}));
    var list = (function (_super) {
        __extends(list, _super);
        function list() {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            var _this = _super.call(this) || this;
            args.unshift(0);
            args.unshift(0);
            _this.splice.apply(_this, args);
            _this.usertype = -1;
            _this.user = null;
            return _this;
        }
        return list;
    }(Array));
    exports.list = list;
    function u64_equ(a, b) {
        return a[0] === b[0] && a[1] === b[1];
    }
    var fstype;
    (function (fstype) {
        fstype[fstype["NONE"] = 0] = "NONE";
        fstype[fstype["FILE"] = 1] = "FILE";
        fstype[fstype["DIR"] = 2] = "DIR";
    })(fstype = exports.fstype || (exports.fstype = {}));
    var gc_level;
    (function (gc_level) {
        gc_level[gc_level["NONE"] = 0] = "NONE";
        gc_level[gc_level["DEFAULT"] = 1] = "DEFAULT";
        gc_level[gc_level["LOWMEM"] = 2] = "LOWMEM";
    })(gc_level = exports.gc_level || (exports.gc_level = {}));
    var run;
    (function (run) {
        run[run["PASS"] = 0] = "PASS";
        run[run["FAIL"] = 1] = "FAIL";
        run[run["ASYNC"] = 2] = "ASYNC";
        run[run["TIMEOUT"] = 3] = "TIMEOUT";
        run[run["REPLMORE"] = 4] = "REPLMORE";
    })(run = exports.run || (exports.run = {}));
    var status;
    (function (status) {
        status[status["READY"] = 0] = "READY";
        status[status["WAITING"] = 1] = "WAITING";
        status[status["PASSED"] = 2] = "PASSED";
        status[status["FAILED"] = 3] = "FAILED";
    })(status = exports.status || (exports.status = {}));
    var NAN = Number.NaN;
    exports.NIL = null;
    function bool(f) { return f ? 1 : exports.NIL; }
    exports.bool = bool;
    function istrue(v) { return v !== exports.NIL; }
    exports.istrue = istrue;
    function isfalse(v) { return v === exports.NIL; }
    exports.isfalse = isfalse;
    function isnil(v) { return v === exports.NIL; }
    exports.isnil = isnil;
    function isstr(v) { return typeof v === 'string'; }
    exports.isstr = isstr;
    function islist(v) {
        return typeof v === 'object' && v !== null;
    }
    exports.islist = islist;
    function isnum(v) { return typeof v === 'number'; }
    exports.isnum = isnum;
    function sink_typeof(v) {
        if (isnil(v))
            return type.NIL;
        else if (isstr(v))
            return type.STR;
        else if (islist(v))
            return type.LIST;
        else
            return type.NUM;
    }
    exports.sink_typeof = sink_typeof;
    function num_nan() { return NAN; }
    exports.num_nan = num_nan;
    function num_inf() { return Infinity; }
    exports.num_inf = num_inf;
    function num_isnan(v) { return typeof v === 'number' && isNaN(v); }
    exports.num_isnan = num_isnan;
    function num_isfinite(v) {
        return typeof v === 'number' && isFinite(v);
    }
    exports.num_isfinite = num_isfinite;
    function num_e() { return Math.E; }
    exports.num_e = num_e;
    function num_pi() { return Math.PI; }
    exports.num_pi = num_pi;
    function num_tau() { return Math.PI * 2; }
    exports.num_tau = num_tau;
    function user_new(ctx, usertype, user) {
        var hint = ctx_getuserhint(ctx, usertype);
        var ls = new list(hint);
        list_setuser(ctx, ls, usertype, user);
        return ls;
    }
    exports.user_new = user_new;
    function wrap_clock() { return (new Date()).getTime(); }
    exports.seedauto_src = wrap_clock;
    var list_u64 = (function (_super) {
        __extends(list_u64, _super);
        function list_u64() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        return list_u64;
    }(Array));
    function varloc_new(frame, index) {
        return { frame: frame, index: index };
    }
    var VARLOC_NULL = { frame: -1, index: -1 };
    function varloc_isnull(vlc) {
        return vlc.frame < 0;
    }
    function native_hash(bytes) {
        var hash = str_hashplain(bytes, 0);
        return [hash[0], hash[1]];
    }
    var op_enum;
    (function (op_enum) {
        op_enum[op_enum["NOP"] = 0] = "NOP";
        op_enum[op_enum["MOVE"] = 1] = "MOVE";
        op_enum[op_enum["INC"] = 2] = "INC";
        op_enum[op_enum["NIL"] = 3] = "NIL";
        op_enum[op_enum["NUMP8"] = 4] = "NUMP8";
        op_enum[op_enum["NUMN8"] = 5] = "NUMN8";
        op_enum[op_enum["NUMP16"] = 6] = "NUMP16";
        op_enum[op_enum["NUMN16"] = 7] = "NUMN16";
        op_enum[op_enum["NUMP32"] = 8] = "NUMP32";
        op_enum[op_enum["NUMN32"] = 9] = "NUMN32";
        op_enum[op_enum["NUMDBL"] = 10] = "NUMDBL";
        op_enum[op_enum["STR"] = 11] = "STR";
        op_enum[op_enum["LIST"] = 12] = "LIST";
        op_enum[op_enum["ISNUM"] = 13] = "ISNUM";
        op_enum[op_enum["ISSTR"] = 14] = "ISSTR";
        op_enum[op_enum["ISLIST"] = 15] = "ISLIST";
        op_enum[op_enum["NOT"] = 16] = "NOT";
        op_enum[op_enum["SIZE"] = 17] = "SIZE";
        op_enum[op_enum["TONUM"] = 18] = "TONUM";
        op_enum[op_enum["CAT"] = 19] = "CAT";
        op_enum[op_enum["LT"] = 20] = "LT";
        op_enum[op_enum["LTE"] = 21] = "LTE";
        op_enum[op_enum["NEQ"] = 22] = "NEQ";
        op_enum[op_enum["EQU"] = 23] = "EQU";
        op_enum[op_enum["GETAT"] = 24] = "GETAT";
        op_enum[op_enum["SLICE"] = 25] = "SLICE";
        op_enum[op_enum["SETAT"] = 26] = "SETAT";
        op_enum[op_enum["SPLICE"] = 27] = "SPLICE";
        op_enum[op_enum["JUMP"] = 28] = "JUMP";
        op_enum[op_enum["JUMPTRUE"] = 29] = "JUMPTRUE";
        op_enum[op_enum["JUMPFALSE"] = 30] = "JUMPFALSE";
        op_enum[op_enum["CMDHEAD"] = 31] = "CMDHEAD";
        op_enum[op_enum["CMDTAIL"] = 32] = "CMDTAIL";
        op_enum[op_enum["CALL"] = 33] = "CALL";
        op_enum[op_enum["NATIVE"] = 34] = "NATIVE";
        op_enum[op_enum["RETURN"] = 35] = "RETURN";
        op_enum[op_enum["RETURNTAIL"] = 36] = "RETURNTAIL";
        op_enum[op_enum["RANGE"] = 37] = "RANGE";
        op_enum[op_enum["ORDER"] = 38] = "ORDER";
        op_enum[op_enum["SAY"] = 39] = "SAY";
        op_enum[op_enum["WARN"] = 40] = "WARN";
        op_enum[op_enum["ASK"] = 41] = "ASK";
        op_enum[op_enum["EXIT"] = 42] = "EXIT";
        op_enum[op_enum["ABORT"] = 43] = "ABORT";
        op_enum[op_enum["STACKTRACE"] = 44] = "STACKTRACE";
        op_enum[op_enum["NUM_NEG"] = 45] = "NUM_NEG";
        op_enum[op_enum["NUM_ADD"] = 46] = "NUM_ADD";
        op_enum[op_enum["NUM_SUB"] = 47] = "NUM_SUB";
        op_enum[op_enum["NUM_MUL"] = 48] = "NUM_MUL";
        op_enum[op_enum["NUM_DIV"] = 49] = "NUM_DIV";
        op_enum[op_enum["NUM_MOD"] = 50] = "NUM_MOD";
        op_enum[op_enum["NUM_POW"] = 51] = "NUM_POW";
        op_enum[op_enum["NUM_ABS"] = 52] = "NUM_ABS";
        op_enum[op_enum["NUM_SIGN"] = 53] = "NUM_SIGN";
        op_enum[op_enum["NUM_MAX"] = 54] = "NUM_MAX";
        op_enum[op_enum["NUM_MIN"] = 55] = "NUM_MIN";
        op_enum[op_enum["NUM_CLAMP"] = 56] = "NUM_CLAMP";
        op_enum[op_enum["NUM_FLOOR"] = 57] = "NUM_FLOOR";
        op_enum[op_enum["NUM_CEIL"] = 58] = "NUM_CEIL";
        op_enum[op_enum["NUM_ROUND"] = 59] = "NUM_ROUND";
        op_enum[op_enum["NUM_TRUNC"] = 60] = "NUM_TRUNC";
        op_enum[op_enum["NUM_NAN"] = 61] = "NUM_NAN";
        op_enum[op_enum["NUM_INF"] = 62] = "NUM_INF";
        op_enum[op_enum["NUM_ISNAN"] = 63] = "NUM_ISNAN";
        op_enum[op_enum["NUM_ISFINITE"] = 64] = "NUM_ISFINITE";
        op_enum[op_enum["NUM_SIN"] = 65] = "NUM_SIN";
        op_enum[op_enum["NUM_COS"] = 66] = "NUM_COS";
        op_enum[op_enum["NUM_TAN"] = 67] = "NUM_TAN";
        op_enum[op_enum["NUM_ASIN"] = 68] = "NUM_ASIN";
        op_enum[op_enum["NUM_ACOS"] = 69] = "NUM_ACOS";
        op_enum[op_enum["NUM_ATAN"] = 70] = "NUM_ATAN";
        op_enum[op_enum["NUM_ATAN2"] = 71] = "NUM_ATAN2";
        op_enum[op_enum["NUM_LOG"] = 72] = "NUM_LOG";
        op_enum[op_enum["NUM_LOG2"] = 73] = "NUM_LOG2";
        op_enum[op_enum["NUM_LOG10"] = 74] = "NUM_LOG10";
        op_enum[op_enum["NUM_EXP"] = 75] = "NUM_EXP";
        op_enum[op_enum["NUM_LERP"] = 76] = "NUM_LERP";
        op_enum[op_enum["NUM_HEX"] = 77] = "NUM_HEX";
        op_enum[op_enum["NUM_OCT"] = 78] = "NUM_OCT";
        op_enum[op_enum["NUM_BIN"] = 79] = "NUM_BIN";
        op_enum[op_enum["INT_NEW"] = 80] = "INT_NEW";
        op_enum[op_enum["INT_NOT"] = 81] = "INT_NOT";
        op_enum[op_enum["INT_AND"] = 82] = "INT_AND";
        op_enum[op_enum["INT_OR"] = 83] = "INT_OR";
        op_enum[op_enum["INT_XOR"] = 84] = "INT_XOR";
        op_enum[op_enum["INT_SHL"] = 85] = "INT_SHL";
        op_enum[op_enum["INT_SHR"] = 86] = "INT_SHR";
        op_enum[op_enum["INT_SAR"] = 87] = "INT_SAR";
        op_enum[op_enum["INT_ADD"] = 88] = "INT_ADD";
        op_enum[op_enum["INT_SUB"] = 89] = "INT_SUB";
        op_enum[op_enum["INT_MUL"] = 90] = "INT_MUL";
        op_enum[op_enum["INT_DIV"] = 91] = "INT_DIV";
        op_enum[op_enum["INT_MOD"] = 92] = "INT_MOD";
        op_enum[op_enum["INT_CLZ"] = 93] = "INT_CLZ";
        op_enum[op_enum["INT_POP"] = 94] = "INT_POP";
        op_enum[op_enum["INT_BSWAP"] = 95] = "INT_BSWAP";
        op_enum[op_enum["RAND_SEED"] = 96] = "RAND_SEED";
        op_enum[op_enum["RAND_SEEDAUTO"] = 97] = "RAND_SEEDAUTO";
        op_enum[op_enum["RAND_INT"] = 98] = "RAND_INT";
        op_enum[op_enum["RAND_NUM"] = 99] = "RAND_NUM";
        op_enum[op_enum["RAND_GETSTATE"] = 100] = "RAND_GETSTATE";
        op_enum[op_enum["RAND_SETSTATE"] = 101] = "RAND_SETSTATE";
        op_enum[op_enum["RAND_PICK"] = 102] = "RAND_PICK";
        op_enum[op_enum["RAND_SHUFFLE"] = 103] = "RAND_SHUFFLE";
        op_enum[op_enum["STR_NEW"] = 104] = "STR_NEW";
        op_enum[op_enum["STR_SPLIT"] = 105] = "STR_SPLIT";
        op_enum[op_enum["STR_REPLACE"] = 106] = "STR_REPLACE";
        op_enum[op_enum["STR_BEGINS"] = 107] = "STR_BEGINS";
        op_enum[op_enum["STR_ENDS"] = 108] = "STR_ENDS";
        op_enum[op_enum["STR_PAD"] = 109] = "STR_PAD";
        op_enum[op_enum["STR_FIND"] = 110] = "STR_FIND";
        op_enum[op_enum["STR_RFIND"] = 111] = "STR_RFIND";
        op_enum[op_enum["STR_LOWER"] = 112] = "STR_LOWER";
        op_enum[op_enum["STR_UPPER"] = 113] = "STR_UPPER";
        op_enum[op_enum["STR_TRIM"] = 114] = "STR_TRIM";
        op_enum[op_enum["STR_REV"] = 115] = "STR_REV";
        op_enum[op_enum["STR_REP"] = 116] = "STR_REP";
        op_enum[op_enum["STR_LIST"] = 117] = "STR_LIST";
        op_enum[op_enum["STR_BYTE"] = 118] = "STR_BYTE";
        op_enum[op_enum["STR_HASH"] = 119] = "STR_HASH";
        op_enum[op_enum["UTF8_VALID"] = 120] = "UTF8_VALID";
        op_enum[op_enum["UTF8_LIST"] = 121] = "UTF8_LIST";
        op_enum[op_enum["UTF8_STR"] = 122] = "UTF8_STR";
        op_enum[op_enum["STRUCT_SIZE"] = 123] = "STRUCT_SIZE";
        op_enum[op_enum["STRUCT_STR"] = 124] = "STRUCT_STR";
        op_enum[op_enum["STRUCT_LIST"] = 125] = "STRUCT_LIST";
        op_enum[op_enum["STRUCT_ISLE"] = 126] = "STRUCT_ISLE";
        op_enum[op_enum["LIST_NEW"] = 127] = "LIST_NEW";
        op_enum[op_enum["LIST_SHIFT"] = 128] = "LIST_SHIFT";
        op_enum[op_enum["LIST_POP"] = 129] = "LIST_POP";
        op_enum[op_enum["LIST_PUSH"] = 130] = "LIST_PUSH";
        op_enum[op_enum["LIST_UNSHIFT"] = 131] = "LIST_UNSHIFT";
        op_enum[op_enum["LIST_APPEND"] = 132] = "LIST_APPEND";
        op_enum[op_enum["LIST_PREPEND"] = 133] = "LIST_PREPEND";
        op_enum[op_enum["LIST_FIND"] = 134] = "LIST_FIND";
        op_enum[op_enum["LIST_RFIND"] = 135] = "LIST_RFIND";
        op_enum[op_enum["LIST_JOIN"] = 136] = "LIST_JOIN";
        op_enum[op_enum["LIST_REV"] = 137] = "LIST_REV";
        op_enum[op_enum["LIST_STR"] = 138] = "LIST_STR";
        op_enum[op_enum["LIST_SORT"] = 139] = "LIST_SORT";
        op_enum[op_enum["LIST_RSORT"] = 140] = "LIST_RSORT";
        op_enum[op_enum["PICKLE_JSON"] = 141] = "PICKLE_JSON";
        op_enum[op_enum["PICKLE_BIN"] = 142] = "PICKLE_BIN";
        op_enum[op_enum["PICKLE_VAL"] = 143] = "PICKLE_VAL";
        op_enum[op_enum["PICKLE_VALID"] = 144] = "PICKLE_VALID";
        op_enum[op_enum["PICKLE_SIBLING"] = 145] = "PICKLE_SIBLING";
        op_enum[op_enum["PICKLE_CIRCULAR"] = 146] = "PICKLE_CIRCULAR";
        op_enum[op_enum["PICKLE_COPY"] = 147] = "PICKLE_COPY";
        op_enum[op_enum["GC_GETLEVEL"] = 148] = "GC_GETLEVEL";
        op_enum[op_enum["GC_SETLEVEL"] = 149] = "GC_SETLEVEL";
        op_enum[op_enum["GC_RUN"] = 150] = "GC_RUN";
        op_enum[op_enum["GT"] = 496] = "GT";
        op_enum[op_enum["GTE"] = 497] = "GTE";
        op_enum[op_enum["PICK"] = 498] = "PICK";
        op_enum[op_enum["EMBED"] = 499] = "EMBED";
        op_enum[op_enum["INVALID"] = 500] = "INVALID";
    })(op_enum || (op_enum = {}));
    var op_pcat;
    (function (op_pcat) {
        op_pcat[op_pcat["INVALID"] = 0] = "INVALID";
        op_pcat[op_pcat["STR"] = 1] = "STR";
        op_pcat[op_pcat["CMDHEAD"] = 2] = "CMDHEAD";
        op_pcat[op_pcat["CMDTAIL"] = 3] = "CMDTAIL";
        op_pcat[op_pcat["JUMP"] = 4] = "JUMP";
        op_pcat[op_pcat["VJUMP"] = 5] = "VJUMP";
        op_pcat[op_pcat["CALL"] = 6] = "CALL";
        op_pcat[op_pcat["NATIVE"] = 7] = "NATIVE";
        op_pcat[op_pcat["RETURNTAIL"] = 8] = "RETURNTAIL";
        op_pcat[op_pcat["VVVV"] = 9] = "VVVV";
        op_pcat[op_pcat["VVV"] = 10] = "VVV";
        op_pcat[op_pcat["VV"] = 11] = "VV";
        op_pcat[op_pcat["V"] = 12] = "V";
        op_pcat[op_pcat["EMPTY"] = 13] = "EMPTY";
        op_pcat[op_pcat["VA"] = 14] = "VA";
        op_pcat[op_pcat["VN"] = 15] = "VN";
        op_pcat[op_pcat["VNN"] = 16] = "VNN";
        op_pcat[op_pcat["VNNNN"] = 17] = "VNNNN";
        op_pcat[op_pcat["VNNNNNNNN"] = 18] = "VNNNNNNNN";
    })(op_pcat || (op_pcat = {}));
    function op_paramcat(op) {
        switch (op) {
            case op_enum.NOP: return op_pcat.EMPTY;
            case op_enum.MOVE: return op_pcat.VV;
            case op_enum.INC: return op_pcat.V;
            case op_enum.NIL: return op_pcat.V;
            case op_enum.NUMP8: return op_pcat.VN;
            case op_enum.NUMN8: return op_pcat.VN;
            case op_enum.NUMP16: return op_pcat.VNN;
            case op_enum.NUMN16: return op_pcat.VNN;
            case op_enum.NUMP32: return op_pcat.VNNNN;
            case op_enum.NUMN32: return op_pcat.VNNNN;
            case op_enum.NUMDBL: return op_pcat.VNNNNNNNN;
            case op_enum.STR: return op_pcat.STR;
            case op_enum.LIST: return op_pcat.VN;
            case op_enum.ISNUM: return op_pcat.VV;
            case op_enum.ISSTR: return op_pcat.VV;
            case op_enum.ISLIST: return op_pcat.VV;
            case op_enum.NOT: return op_pcat.VV;
            case op_enum.SIZE: return op_pcat.VV;
            case op_enum.TONUM: return op_pcat.VV;
            case op_enum.CAT: return op_pcat.VA;
            case op_enum.LT: return op_pcat.VVV;
            case op_enum.LTE: return op_pcat.VVV;
            case op_enum.NEQ: return op_pcat.VVV;
            case op_enum.EQU: return op_pcat.VVV;
            case op_enum.GETAT: return op_pcat.VVV;
            case op_enum.SLICE: return op_pcat.VVVV;
            case op_enum.SETAT: return op_pcat.VVV;
            case op_enum.SPLICE: return op_pcat.VVVV;
            case op_enum.JUMP: return op_pcat.JUMP;
            case op_enum.JUMPTRUE: return op_pcat.VJUMP;
            case op_enum.JUMPFALSE: return op_pcat.VJUMP;
            case op_enum.CMDHEAD: return op_pcat.CMDHEAD;
            case op_enum.CMDTAIL: return op_pcat.CMDTAIL;
            case op_enum.CALL: return op_pcat.CALL;
            case op_enum.NATIVE: return op_pcat.NATIVE;
            case op_enum.RETURN: return op_pcat.V;
            case op_enum.RETURNTAIL: return op_pcat.RETURNTAIL;
            case op_enum.RANGE: return op_pcat.VVVV;
            case op_enum.ORDER: return op_pcat.VVV;
            case op_enum.SAY: return op_pcat.VA;
            case op_enum.WARN: return op_pcat.VA;
            case op_enum.ASK: return op_pcat.VA;
            case op_enum.EXIT: return op_pcat.VA;
            case op_enum.ABORT: return op_pcat.VA;
            case op_enum.STACKTRACE: return op_pcat.V;
            case op_enum.NUM_NEG: return op_pcat.VV;
            case op_enum.NUM_ADD: return op_pcat.VVV;
            case op_enum.NUM_SUB: return op_pcat.VVV;
            case op_enum.NUM_MUL: return op_pcat.VVV;
            case op_enum.NUM_DIV: return op_pcat.VVV;
            case op_enum.NUM_MOD: return op_pcat.VVV;
            case op_enum.NUM_POW: return op_pcat.VVV;
            case op_enum.NUM_ABS: return op_pcat.VV;
            case op_enum.NUM_SIGN: return op_pcat.VV;
            case op_enum.NUM_MAX: return op_pcat.VA;
            case op_enum.NUM_MIN: return op_pcat.VA;
            case op_enum.NUM_CLAMP: return op_pcat.VVVV;
            case op_enum.NUM_FLOOR: return op_pcat.VV;
            case op_enum.NUM_CEIL: return op_pcat.VV;
            case op_enum.NUM_ROUND: return op_pcat.VV;
            case op_enum.NUM_TRUNC: return op_pcat.VV;
            case op_enum.NUM_NAN: return op_pcat.V;
            case op_enum.NUM_INF: return op_pcat.V;
            case op_enum.NUM_ISNAN: return op_pcat.VV;
            case op_enum.NUM_ISFINITE: return op_pcat.VV;
            case op_enum.NUM_SIN: return op_pcat.VV;
            case op_enum.NUM_COS: return op_pcat.VV;
            case op_enum.NUM_TAN: return op_pcat.VV;
            case op_enum.NUM_ASIN: return op_pcat.VV;
            case op_enum.NUM_ACOS: return op_pcat.VV;
            case op_enum.NUM_ATAN: return op_pcat.VV;
            case op_enum.NUM_ATAN2: return op_pcat.VVV;
            case op_enum.NUM_LOG: return op_pcat.VV;
            case op_enum.NUM_LOG2: return op_pcat.VV;
            case op_enum.NUM_LOG10: return op_pcat.VV;
            case op_enum.NUM_EXP: return op_pcat.VV;
            case op_enum.NUM_LERP: return op_pcat.VVVV;
            case op_enum.NUM_HEX: return op_pcat.VVV;
            case op_enum.NUM_OCT: return op_pcat.VVV;
            case op_enum.NUM_BIN: return op_pcat.VVV;
            case op_enum.INT_NEW: return op_pcat.VV;
            case op_enum.INT_NOT: return op_pcat.VV;
            case op_enum.INT_AND: return op_pcat.VA;
            case op_enum.INT_OR: return op_pcat.VA;
            case op_enum.INT_XOR: return op_pcat.VA;
            case op_enum.INT_SHL: return op_pcat.VVV;
            case op_enum.INT_SHR: return op_pcat.VVV;
            case op_enum.INT_SAR: return op_pcat.VVV;
            case op_enum.INT_ADD: return op_pcat.VVV;
            case op_enum.INT_SUB: return op_pcat.VVV;
            case op_enum.INT_MUL: return op_pcat.VVV;
            case op_enum.INT_DIV: return op_pcat.VVV;
            case op_enum.INT_MOD: return op_pcat.VVV;
            case op_enum.INT_CLZ: return op_pcat.VV;
            case op_enum.INT_POP: return op_pcat.VV;
            case op_enum.INT_BSWAP: return op_pcat.VV;
            case op_enum.RAND_SEED: return op_pcat.VV;
            case op_enum.RAND_SEEDAUTO: return op_pcat.V;
            case op_enum.RAND_INT: return op_pcat.V;
            case op_enum.RAND_NUM: return op_pcat.V;
            case op_enum.RAND_GETSTATE: return op_pcat.V;
            case op_enum.RAND_SETSTATE: return op_pcat.VV;
            case op_enum.RAND_PICK: return op_pcat.VV;
            case op_enum.RAND_SHUFFLE: return op_pcat.VV;
            case op_enum.STR_NEW: return op_pcat.VA;
            case op_enum.STR_SPLIT: return op_pcat.VVV;
            case op_enum.STR_REPLACE: return op_pcat.VVVV;
            case op_enum.STR_BEGINS: return op_pcat.VVV;
            case op_enum.STR_ENDS: return op_pcat.VVV;
            case op_enum.STR_PAD: return op_pcat.VVV;
            case op_enum.STR_FIND: return op_pcat.VVVV;
            case op_enum.STR_RFIND: return op_pcat.VVVV;
            case op_enum.STR_LOWER: return op_pcat.VV;
            case op_enum.STR_UPPER: return op_pcat.VV;
            case op_enum.STR_TRIM: return op_pcat.VV;
            case op_enum.STR_REV: return op_pcat.VV;
            case op_enum.STR_REP: return op_pcat.VVV;
            case op_enum.STR_LIST: return op_pcat.VV;
            case op_enum.STR_BYTE: return op_pcat.VVV;
            case op_enum.STR_HASH: return op_pcat.VVV;
            case op_enum.UTF8_VALID: return op_pcat.VV;
            case op_enum.UTF8_LIST: return op_pcat.VV;
            case op_enum.UTF8_STR: return op_pcat.VV;
            case op_enum.STRUCT_SIZE: return op_pcat.VV;
            case op_enum.STRUCT_STR: return op_pcat.VVV;
            case op_enum.STRUCT_LIST: return op_pcat.VVV;
            case op_enum.STRUCT_ISLE: return op_pcat.V;
            case op_enum.LIST_NEW: return op_pcat.VVV;
            case op_enum.LIST_SHIFT: return op_pcat.VV;
            case op_enum.LIST_POP: return op_pcat.VV;
            case op_enum.LIST_PUSH: return op_pcat.VVV;
            case op_enum.LIST_UNSHIFT: return op_pcat.VVV;
            case op_enum.LIST_APPEND: return op_pcat.VVV;
            case op_enum.LIST_PREPEND: return op_pcat.VVV;
            case op_enum.LIST_FIND: return op_pcat.VVVV;
            case op_enum.LIST_RFIND: return op_pcat.VVVV;
            case op_enum.LIST_JOIN: return op_pcat.VVV;
            case op_enum.LIST_REV: return op_pcat.VV;
            case op_enum.LIST_STR: return op_pcat.VV;
            case op_enum.LIST_SORT: return op_pcat.VV;
            case op_enum.LIST_RSORT: return op_pcat.VV;
            case op_enum.PICKLE_JSON: return op_pcat.VV;
            case op_enum.PICKLE_BIN: return op_pcat.VV;
            case op_enum.PICKLE_VAL: return op_pcat.VV;
            case op_enum.PICKLE_VALID: return op_pcat.VV;
            case op_enum.PICKLE_SIBLING: return op_pcat.VV;
            case op_enum.PICKLE_CIRCULAR: return op_pcat.VV;
            case op_enum.PICKLE_COPY: return op_pcat.VV;
            case op_enum.GC_GETLEVEL: return op_pcat.V;
            case op_enum.GC_SETLEVEL: return op_pcat.VV;
            case op_enum.GC_RUN: return op_pcat.V;
            case op_enum.GT: return op_pcat.INVALID;
            case op_enum.GTE: return op_pcat.INVALID;
            case op_enum.PICK: return op_pcat.INVALID;
            case op_enum.EMBED: return op_pcat.INVALID;
            case op_enum.INVALID: return op_pcat.INVALID;
        }
        return op_pcat.INVALID;
    }
    function op_move(b, tgt, src) {
        if (tgt.frame === src.frame && tgt.index === src.index)
            return;
        b.push(op_enum.MOVE, tgt.frame, tgt.index, src.frame, src.index);
    }
    function op_inc(b, src) {
        b.push(op_enum.INC, src.frame, src.index);
    }
    function op_nil(b, tgt) {
        b.push(op_enum.NIL, tgt.frame, tgt.index);
    }
    function op_numint(b, tgt, num) {
        if (num < 0) {
            if (num >= -256) {
                num += 256;
                b.push(op_enum.NUMN8, tgt.frame, tgt.index, num & 0xFF);
            }
            else if (num >= -65536) {
                num += 65536;
                b.push(op_enum.NUMN16, tgt.frame, tgt.index, num & 0xFF, num >>> 8);
            }
            else {
                num += 4294967296;
                b.push(op_enum.NUMN32, tgt.frame, tgt.index, num & 0xFF, (num >>> 8) & 0xFF, (num >>> 16) & 0xFF, (num >>> 24) & 0xFF);
            }
        }
        else {
            if (num < 256) {
                b.push(op_enum.NUMP8, tgt.frame, tgt.index, num & 0xFF);
            }
            else if (num < 65536) {
                b.push(op_enum.NUMP16, tgt.frame, tgt.index, num & 0xFF, num >>> 8);
            }
            else {
                b.push(op_enum.NUMP32, tgt.frame, tgt.index, num & 0xFF, (num >>> 8) & 0xFF, (num >>> 16) & 0xFF, (num >>> 24) & 0xFF);
            }
        }
    }
    var dview = new DataView(new ArrayBuffer(8));
    function op_numdbl(b, tgt, num) {
        dview.setFloat64(0, num, true);
        b.push(op_enum.NUMDBL, tgt.frame, tgt.index, dview.getUint8(0), dview.getUint8(1), dview.getUint8(2), dview.getUint8(3), dview.getUint8(4), dview.getUint8(5), dview.getUint8(6), dview.getUint8(7));
    }
    function op_num(b, tgt, num) {
        if (Math.floor(num) === num && num >= -4294967296 && num < 4294967296)
            op_numint(b, tgt, num);
        else
            op_numdbl(b, tgt, num);
    }
    function op_str(b, tgt, index) {
        b.push(op_enum.STR, tgt.frame, tgt.index, index % 256, Math.floor(index / 256) % 256, Math.floor(index / 65536) % 256, Math.floor(index / 16777216) % 256);
    }
    function op_list(b, tgt, hint) {
        if (hint > 255)
            hint = 255;
        b.push(op_enum.LIST, tgt.frame, tgt.index, hint);
    }
    function op_unop(b, opcode, tgt, src) {
        b.push(opcode, tgt.frame, tgt.index, src.frame, src.index);
    }
    function op_cat(b, tgt, argcount) {
        b.push(op_enum.CAT, tgt.frame, tgt.index, argcount);
    }
    function op_arg(b, arg) {
        b.push(arg.frame, arg.index);
    }
    function op_binop(b, opcode, tgt, src1, src2) {
        if (opcode === op_enum.CAT) {
            op_cat(b, tgt, 2);
            op_arg(b, src1);
            op_arg(b, src2);
            return;
        }
        if (opcode === op_enum.GT || opcode === op_enum.GTE) {
            opcode = opcode === op_enum.GT ? op_enum.LT : op_enum.LTE;
            var t = src1;
            src1 = src2;
            src2 = t;
        }
        b.push(opcode, tgt.frame, tgt.index, src1.frame, src1.index, src2.frame, src2.index);
    }
    function op_getat(b, tgt, src1, src2) {
        b.push(op_enum.GETAT, tgt.frame, tgt.index, src1.frame, src1.index, src2.frame, src2.index);
    }
    function op_slice(b, tgt, src1, src2, src3) {
        b.push(op_enum.SLICE, tgt.frame, tgt.index, src1.frame, src1.index, src2.frame, src2.index, src3.frame, src3.index);
    }
    function op_setat(b, src1, src2, src3) {
        b.push(op_enum.SETAT, src1.frame, src1.index, src2.frame, src2.index, src3.frame, src3.index);
    }
    function op_splice(b, src1, src2, src3, src4) {
        b.push(op_enum.SPLICE, src1.frame, src1.index, src2.frame, src2.index, src3.frame, src3.index, src4.frame, src4.index);
    }
    function op_jump(b, index, hint) {
        b.push(op_enum.JUMP, index % 256, Math.floor(index / 256) % 256, Math.floor(index / 65536) % 256, Math.floor(index / 16777216) % 256);
    }
    function op_jumptrue(b, src, index, hint) {
        b.push(op_enum.JUMPTRUE, src.frame, src.index, index % 256, Math.floor(index / 256) % 256, Math.floor(index / 65536) % 256, Math.floor(index / 16777216) % 256);
    }
    function op_jumpfalse(b, src, index, hint) {
        b.push(op_enum.JUMPFALSE, src.frame, src.index, index % 256, Math.floor(index / 256) % 256, Math.floor(index / 65536) % 256, Math.floor(index / 16777216) % 256);
    }
    function op_cmdhead(b, level, restpos) {
        b.push(op_enum.CMDHEAD, level, restpos);
    }
    function op_cmdtail(b) {
        b.push(op_enum.CMDTAIL);
    }
    function op_call(b, ret, index, argcount, hint) {
        b.push(op_enum.CALL, ret.frame, ret.index, index % 256, Math.floor(index / 256) % 256, Math.floor(index / 65536) % 256, Math.floor(index / 16777216) % 256, argcount);
    }
    function op_native(b, ret, index, argcount) {
        b.push(op_enum.NATIVE, ret.frame, ret.index, index % 256, Math.floor(index / 256) % 256, Math.floor(index / 65536) % 256, Math.floor(index / 16777216) % 256, argcount);
    }
    function op_return(b, src) {
        b.push(op_enum.RETURN, src.frame, src.index);
    }
    function op_returntail(b, index, argcount, hint) {
        b.push(op_enum.RETURNTAIL, index % 256, Math.floor(index / 256) % 256, Math.floor(index / 65536) % 256, Math.floor(index / 16777216) % 256, argcount);
    }
    function op_parama(b, opcode, tgt, argcount) {
        b.push(opcode, tgt.frame, tgt.index, argcount);
    }
    function op_param0(b, opcode, tgt) {
        b.push(opcode, tgt.frame, tgt.index);
    }
    function op_param1(b, opcode, tgt, src) {
        b.push(opcode, tgt.frame, tgt.index, src.frame, src.index);
    }
    function op_param2(b, opcode, tgt, src1, src2) {
        b.push(opcode, tgt.frame, tgt.index, src1.frame, src1.index, src2.frame, src2.index);
    }
    function op_param3(b, opcode, tgt, src1, src2, src3) {
        b.push(opcode, tgt.frame, tgt.index, src1.frame, src1.index, src2.frame, src2.index, src3.frame, src3.index);
    }
    var ks_enum;
    (function (ks_enum) {
        ks_enum[ks_enum["INVALID"] = 0] = "INVALID";
        ks_enum[ks_enum["PLUS"] = 1] = "PLUS";
        ks_enum[ks_enum["UNPLUS"] = 2] = "UNPLUS";
        ks_enum[ks_enum["MINUS"] = 3] = "MINUS";
        ks_enum[ks_enum["UNMINUS"] = 4] = "UNMINUS";
        ks_enum[ks_enum["PERCENT"] = 5] = "PERCENT";
        ks_enum[ks_enum["STAR"] = 6] = "STAR";
        ks_enum[ks_enum["SLASH"] = 7] = "SLASH";
        ks_enum[ks_enum["CARET"] = 8] = "CARET";
        ks_enum[ks_enum["AMP"] = 9] = "AMP";
        ks_enum[ks_enum["LT"] = 10] = "LT";
        ks_enum[ks_enum["GT"] = 11] = "GT";
        ks_enum[ks_enum["BANG"] = 12] = "BANG";
        ks_enum[ks_enum["EQU"] = 13] = "EQU";
        ks_enum[ks_enum["TILDE"] = 14] = "TILDE";
        ks_enum[ks_enum["COLON"] = 15] = "COLON";
        ks_enum[ks_enum["COMMA"] = 16] = "COMMA";
        ks_enum[ks_enum["PERIOD"] = 17] = "PERIOD";
        ks_enum[ks_enum["PIPE"] = 18] = "PIPE";
        ks_enum[ks_enum["LPAREN"] = 19] = "LPAREN";
        ks_enum[ks_enum["LBRACKET"] = 20] = "LBRACKET";
        ks_enum[ks_enum["LBRACE"] = 21] = "LBRACE";
        ks_enum[ks_enum["RPAREN"] = 22] = "RPAREN";
        ks_enum[ks_enum["RBRACKET"] = 23] = "RBRACKET";
        ks_enum[ks_enum["RBRACE"] = 24] = "RBRACE";
        ks_enum[ks_enum["PLUSEQU"] = 25] = "PLUSEQU";
        ks_enum[ks_enum["MINUSEQU"] = 26] = "MINUSEQU";
        ks_enum[ks_enum["PERCENTEQU"] = 27] = "PERCENTEQU";
        ks_enum[ks_enum["STAREQU"] = 28] = "STAREQU";
        ks_enum[ks_enum["SLASHEQU"] = 29] = "SLASHEQU";
        ks_enum[ks_enum["CARETEQU"] = 30] = "CARETEQU";
        ks_enum[ks_enum["LTEQU"] = 31] = "LTEQU";
        ks_enum[ks_enum["GTEQU"] = 32] = "GTEQU";
        ks_enum[ks_enum["BANGEQU"] = 33] = "BANGEQU";
        ks_enum[ks_enum["EQU2"] = 34] = "EQU2";
        ks_enum[ks_enum["TILDEEQU"] = 35] = "TILDEEQU";
        ks_enum[ks_enum["AMP2"] = 36] = "AMP2";
        ks_enum[ks_enum["PIPE2"] = 37] = "PIPE2";
        ks_enum[ks_enum["PERIOD3"] = 38] = "PERIOD3";
        ks_enum[ks_enum["PIPE2EQU"] = 39] = "PIPE2EQU";
        ks_enum[ks_enum["AMP2EQU"] = 40] = "AMP2EQU";
        ks_enum[ks_enum["BREAK"] = 41] = "BREAK";
        ks_enum[ks_enum["CONTINUE"] = 42] = "CONTINUE";
        ks_enum[ks_enum["DECLARE"] = 43] = "DECLARE";
        ks_enum[ks_enum["DEF"] = 44] = "DEF";
        ks_enum[ks_enum["DO"] = 45] = "DO";
        ks_enum[ks_enum["ELSE"] = 46] = "ELSE";
        ks_enum[ks_enum["ELSEIF"] = 47] = "ELSEIF";
        ks_enum[ks_enum["END"] = 48] = "END";
        ks_enum[ks_enum["ENUM"] = 49] = "ENUM";
        ks_enum[ks_enum["FOR"] = 50] = "FOR";
        ks_enum[ks_enum["GOTO"] = 51] = "GOTO";
        ks_enum[ks_enum["IF"] = 52] = "IF";
        ks_enum[ks_enum["INCLUDE"] = 53] = "INCLUDE";
        ks_enum[ks_enum["NAMESPACE"] = 54] = "NAMESPACE";
        ks_enum[ks_enum["NIL"] = 55] = "NIL";
        ks_enum[ks_enum["RETURN"] = 56] = "RETURN";
        ks_enum[ks_enum["USING"] = 57] = "USING";
        ks_enum[ks_enum["VAR"] = 58] = "VAR";
        ks_enum[ks_enum["WHILE"] = 59] = "WHILE";
    })(ks_enum || (ks_enum = {}));
    function ks_char(c) {
        if (c === '+')
            return ks_enum.PLUS;
        else if (c === '-')
            return ks_enum.MINUS;
        else if (c === '%')
            return ks_enum.PERCENT;
        else if (c === '*')
            return ks_enum.STAR;
        else if (c === '/')
            return ks_enum.SLASH;
        else if (c === '^')
            return ks_enum.CARET;
        else if (c === '&')
            return ks_enum.AMP;
        else if (c === '<')
            return ks_enum.LT;
        else if (c === '>')
            return ks_enum.GT;
        else if (c === '!')
            return ks_enum.BANG;
        else if (c === '=')
            return ks_enum.EQU;
        else if (c === '~')
            return ks_enum.TILDE;
        else if (c === ':')
            return ks_enum.COLON;
        else if (c === ',')
            return ks_enum.COMMA;
        else if (c === '.')
            return ks_enum.PERIOD;
        else if (c === '|')
            return ks_enum.PIPE;
        else if (c === '(')
            return ks_enum.LPAREN;
        else if (c === '[')
            return ks_enum.LBRACKET;
        else if (c === '{')
            return ks_enum.LBRACE;
        else if (c === ')')
            return ks_enum.RPAREN;
        else if (c === ']')
            return ks_enum.RBRACKET;
        else if (c === '}')
            return ks_enum.RBRACE;
        return ks_enum.INVALID;
    }
    function ks_char2(c1, c2) {
        if (c1 === '+' && c2 === '=')
            return ks_enum.PLUSEQU;
        else if (c1 === '-' && c2 === '=')
            return ks_enum.MINUSEQU;
        else if (c1 === '%' && c2 === '=')
            return ks_enum.PERCENTEQU;
        else if (c1 === '*' && c2 === '=')
            return ks_enum.STAREQU;
        else if (c1 === '/' && c2 === '=')
            return ks_enum.SLASHEQU;
        else if (c1 === '^' && c2 === '=')
            return ks_enum.CARETEQU;
        else if (c1 === '<' && c2 === '=')
            return ks_enum.LTEQU;
        else if (c1 === '>' && c2 === '=')
            return ks_enum.GTEQU;
        else if (c1 === '!' && c2 === '=')
            return ks_enum.BANGEQU;
        else if (c1 === '=' && c2 === '=')
            return ks_enum.EQU2;
        else if (c1 === '~' && c2 === '=')
            return ks_enum.TILDEEQU;
        else if (c1 === '&' && c2 === '&')
            return ks_enum.AMP2;
        else if (c1 === '|' && c2 === '|')
            return ks_enum.PIPE2;
        return ks_enum.INVALID;
    }
    function ks_char3(c1, c2, c3) {
        if (c1 === '.' && c2 === '.' && c3 === '.')
            return ks_enum.PERIOD3;
        else if (c1 === '|' && c2 === '|' && c3 === '=')
            return ks_enum.PIPE2EQU;
        else if (c1 === '&' && c2 === '&' && c3 === '=')
            return ks_enum.AMP2EQU;
        return ks_enum.INVALID;
    }
    function ks_str(s) {
        if (s === 'break')
            return ks_enum.BREAK;
        else if (s === 'continue')
            return ks_enum.CONTINUE;
        else if (s === 'declare')
            return ks_enum.DECLARE;
        else if (s === 'def')
            return ks_enum.DEF;
        else if (s === 'do')
            return ks_enum.DO;
        else if (s === 'else')
            return ks_enum.ELSE;
        else if (s === 'elseif')
            return ks_enum.ELSEIF;
        else if (s === 'end')
            return ks_enum.END;
        else if (s === 'enum')
            return ks_enum.ENUM;
        else if (s === 'for')
            return ks_enum.FOR;
        else if (s === 'goto')
            return ks_enum.GOTO;
        else if (s === 'if')
            return ks_enum.IF;
        else if (s === 'include')
            return ks_enum.INCLUDE;
        else if (s === 'namespace')
            return ks_enum.NAMESPACE;
        else if (s === 'nil')
            return ks_enum.NIL;
        else if (s === 'return')
            return ks_enum.RETURN;
        else if (s === 'using')
            return ks_enum.USING;
        else if (s === 'var')
            return ks_enum.VAR;
        else if (s === 'while')
            return ks_enum.WHILE;
        return ks_enum.INVALID;
    }
    function ks_toUnaryOp(k) {
        if (k === ks_enum.PLUS)
            return op_enum.TONUM;
        else if (k === ks_enum.UNPLUS)
            return op_enum.TONUM;
        else if (k === ks_enum.MINUS)
            return op_enum.NUM_NEG;
        else if (k === ks_enum.UNMINUS)
            return op_enum.NUM_NEG;
        else if (k === ks_enum.AMP)
            return op_enum.SIZE;
        else if (k === ks_enum.BANG)
            return op_enum.NOT;
        return op_enum.INVALID;
    }
    function ks_toBinaryOp(k) {
        if (k === ks_enum.PLUS)
            return op_enum.NUM_ADD;
        else if (k === ks_enum.MINUS)
            return op_enum.NUM_SUB;
        else if (k === ks_enum.PERCENT)
            return op_enum.NUM_MOD;
        else if (k === ks_enum.STAR)
            return op_enum.NUM_MUL;
        else if (k === ks_enum.SLASH)
            return op_enum.NUM_DIV;
        else if (k === ks_enum.CARET)
            return op_enum.NUM_POW;
        else if (k === ks_enum.LT)
            return op_enum.LT;
        else if (k === ks_enum.GT)
            return op_enum.GT;
        else if (k === ks_enum.TILDE)
            return op_enum.CAT;
        else if (k === ks_enum.LTEQU)
            return op_enum.LTE;
        else if (k === ks_enum.GTEQU)
            return op_enum.GTE;
        else if (k === ks_enum.BANGEQU)
            return op_enum.NEQ;
        else if (k === ks_enum.EQU2)
            return op_enum.EQU;
        return op_enum.INVALID;
    }
    function ks_toMutateOp(k) {
        if (k === ks_enum.PLUSEQU)
            return op_enum.NUM_ADD;
        else if (k === ks_enum.PERCENTEQU)
            return op_enum.NUM_MOD;
        else if (k === ks_enum.MINUSEQU)
            return op_enum.NUM_SUB;
        else if (k === ks_enum.STAREQU)
            return op_enum.NUM_MUL;
        else if (k === ks_enum.SLASHEQU)
            return op_enum.NUM_DIV;
        else if (k === ks_enum.CARETEQU)
            return op_enum.NUM_POW;
        else if (k === ks_enum.TILDEEQU)
            return op_enum.CAT;
        return op_enum.INVALID;
    }
    var FILEPOS_NULL = { basefile: -1, fullfile: -1, line: -1, chr: -1 };
    function filepos_copy(flp) {
        return { fullfile: flp.fullfile, basefile: flp.basefile, line: flp.line, chr: flp.chr };
    }
    var tok_enum;
    (function (tok_enum) {
        tok_enum[tok_enum["NEWLINE"] = 0] = "NEWLINE";
        tok_enum[tok_enum["KS"] = 1] = "KS";
        tok_enum[tok_enum["IDENT"] = 2] = "IDENT";
        tok_enum[tok_enum["NUM"] = 3] = "NUM";
        tok_enum[tok_enum["STR"] = 4] = "STR";
        tok_enum[tok_enum["ERROR"] = 5] = "ERROR";
    })(tok_enum || (tok_enum = {}));
    function tok_newline(flp, soft) {
        return {
            type: tok_enum.NEWLINE,
            flp: flp,
            soft: soft
        };
    }
    function tok_ks(flp, k) {
        return {
            type: tok_enum.KS,
            flp: flp,
            k: k
        };
    }
    function tok_ident(flp, ident) {
        return {
            type: tok_enum.IDENT,
            flp: flp,
            ident: ident
        };
    }
    function tok_num(flp, num) {
        return {
            type: tok_enum.NUM,
            flp: flp,
            num: num
        };
    }
    function tok_str(flp, str) {
        return {
            type: tok_enum.STR,
            flp: flp,
            str: str
        };
    }
    function tok_error(flp, msg) {
        return {
            type: tok_enum.ERROR,
            flp: flp,
            msg: msg
        };
    }
    function tok_isKS(tk, k) {
        return tk.type === tok_enum.KS && tk.k === k;
    }
    function tok_isMidStmt(tk) {
        return tk.type === tok_enum.KS && (tk.k === ks_enum.END || tk.k === ks_enum.ELSE ||
            tk.k === ks_enum.ELSEIF || tk.k === ks_enum.WHILE);
    }
    function tok_isPre(tk) {
        if (tk.type !== tok_enum.KS)
            return false;
        var k = tk.k;
        return false ||
            k === ks_enum.PLUS ||
            k === ks_enum.UNPLUS ||
            k === ks_enum.MINUS ||
            k === ks_enum.UNMINUS ||
            k === ks_enum.AMP ||
            k === ks_enum.BANG ||
            k === ks_enum.PERIOD3;
    }
    function tok_isMid(tk, allowComma, allowPipe) {
        if (tk.type !== tok_enum.KS)
            return false;
        var k = tk.k;
        return false ||
            k === ks_enum.PLUS ||
            k === ks_enum.PLUSEQU ||
            k === ks_enum.MINUS ||
            k === ks_enum.MINUSEQU ||
            k === ks_enum.PERCENT ||
            k === ks_enum.PERCENTEQU ||
            k === ks_enum.STAR ||
            k === ks_enum.STAREQU ||
            k === ks_enum.SLASH ||
            k === ks_enum.SLASHEQU ||
            k === ks_enum.CARET ||
            k === ks_enum.CARETEQU ||
            k === ks_enum.LT ||
            k === ks_enum.LTEQU ||
            k === ks_enum.GT ||
            k === ks_enum.GTEQU ||
            k === ks_enum.BANGEQU ||
            k === ks_enum.EQU ||
            k === ks_enum.EQU2 ||
            k === ks_enum.TILDE ||
            k === ks_enum.TILDEEQU ||
            k === ks_enum.AMP2 ||
            k === ks_enum.PIPE2 ||
            k === ks_enum.AMP2EQU ||
            k === ks_enum.PIPE2EQU ||
            (allowComma && k === ks_enum.COMMA) ||
            (allowPipe && k === ks_enum.PIPE);
    }
    function tok_isTerm(tk) {
        return false ||
            (tk.type === tok_enum.KS &&
                (tk.k === ks_enum.NIL || tk.k === ks_enum.LPAREN || tk.k === ks_enum.LBRACE)) ||
            tk.type === tok_enum.IDENT ||
            tk.type === tok_enum.NUM ||
            tk.type === tok_enum.STR;
    }
    function tok_isPreBeforeMid(pre, mid) {
        if ((pre.k === ks_enum.MINUS || pre.k === ks_enum.UNMINUS) && mid.k === ks_enum.CARET)
            return false;
        return true;
    }
    function tok_midPrecedence(tk) {
        var k = tk.k;
        if (k === ks_enum.CARET)
            return 1;
        else if (k === ks_enum.STAR)
            return 2;
        else if (k === ks_enum.SLASH)
            return 2;
        else if (k === ks_enum.PERCENT)
            return 2;
        else if (k === ks_enum.PLUS)
            return 3;
        else if (k === ks_enum.MINUS)
            return 3;
        else if (k === ks_enum.TILDE)
            return 4;
        else if (k === ks_enum.LTEQU)
            return 5;
        else if (k === ks_enum.LT)
            return 5;
        else if (k === ks_enum.GTEQU)
            return 5;
        else if (k === ks_enum.GT)
            return 5;
        else if (k === ks_enum.BANGEQU)
            return 6;
        else if (k === ks_enum.EQU2)
            return 6;
        else if (k === ks_enum.AMP2)
            return 7;
        else if (k === ks_enum.PIPE2)
            return 8;
        else if (k === ks_enum.COMMA)
            return 9;
        else if (k === ks_enum.PIPE)
            return 10;
        else if (k === ks_enum.EQU)
            return 20;
        else if (k === ks_enum.PLUSEQU)
            return 20;
        else if (k === ks_enum.PERCENTEQU)
            return 20;
        else if (k === ks_enum.MINUSEQU)
            return 20;
        else if (k === ks_enum.STAREQU)
            return 20;
        else if (k === ks_enum.SLASHEQU)
            return 20;
        else if (k === ks_enum.CARETEQU)
            return 20;
        else if (k === ks_enum.TILDEEQU)
            return 20;
        else if (k === ks_enum.AMP2EQU)
            return 20;
        else if (k === ks_enum.PIPE2EQU)
            return 20;
        throw new Error('Assertion failed');
    }
    function tok_isMidBeforeMid(lmid, rmid) {
        var lp = tok_midPrecedence(lmid);
        var rp = tok_midPrecedence(rmid);
        if (lp < rp)
            return true;
        else if (lp > rp)
            return false;
        if (lp === 20 || lp === 1)
            return false;
        return true;
    }
    function isSpace(c) {
        return c === ' ' || c === '\n' || c === '\r' || c === '\t';
    }
    function isAlpha(c) {
        return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z');
    }
    function isNum(c) {
        return c >= '0' && c <= '9';
    }
    function isIdentStart(c) {
        return isAlpha(c) || c === '_';
    }
    function isIdentBody(c) {
        return isIdentStart(c) || isNum(c);
    }
    function isHex(c) {
        return isNum(c) || (c >= 'a' && c <= 'f') || (c >= 'A' && c <= 'F');
    }
    function toHex(c) {
        if (isNum(c))
            return c.charCodeAt(0) - 48;
        else if (c >= 'a')
            return c.charCodeAt(0) - 87;
        return c.charCodeAt(0) - 55;
    }
    function toNibble(n) {
        return n.toString(16).toUpperCase();
    }
    var lex_enum;
    (function (lex_enum) {
        lex_enum[lex_enum["START"] = 0] = "START";
        lex_enum[lex_enum["COMMENT_LINE"] = 1] = "COMMENT_LINE";
        lex_enum[lex_enum["BACKSLASH"] = 2] = "BACKSLASH";
        lex_enum[lex_enum["RETURN"] = 3] = "RETURN";
        lex_enum[lex_enum["COMMENT_BLOCK"] = 4] = "COMMENT_BLOCK";
        lex_enum[lex_enum["SPECIAL1"] = 5] = "SPECIAL1";
        lex_enum[lex_enum["SPECIAL2"] = 6] = "SPECIAL2";
        lex_enum[lex_enum["IDENT"] = 7] = "IDENT";
        lex_enum[lex_enum["NUM_0"] = 8] = "NUM_0";
        lex_enum[lex_enum["NUM_2"] = 9] = "NUM_2";
        lex_enum[lex_enum["NUM_BODY"] = 10] = "NUM_BODY";
        lex_enum[lex_enum["NUM_FRAC"] = 11] = "NUM_FRAC";
        lex_enum[lex_enum["NUM_EXP"] = 12] = "NUM_EXP";
        lex_enum[lex_enum["NUM_EXP_BODY"] = 13] = "NUM_EXP_BODY";
        lex_enum[lex_enum["STR_BASIC"] = 14] = "STR_BASIC";
        lex_enum[lex_enum["STR_BASIC_ESC"] = 15] = "STR_BASIC_ESC";
        lex_enum[lex_enum["STR_INTERP"] = 16] = "STR_INTERP";
        lex_enum[lex_enum["STR_INTERP_DLR"] = 17] = "STR_INTERP_DLR";
        lex_enum[lex_enum["STR_INTERP_DLR_ID"] = 18] = "STR_INTERP_DLR_ID";
        lex_enum[lex_enum["STR_INTERP_ESC"] = 19] = "STR_INTERP_ESC";
        lex_enum[lex_enum["STR_INTERP_ESC_HEX"] = 20] = "STR_INTERP_ESC_HEX";
    })(lex_enum || (lex_enum = {}));
    function numpart_new(info) {
        if (info) {
            info.sign = 1;
            info.val = 0;
            info.base = 10;
            info.frac = 0;
            info.flen = 0;
            info.esign = 1;
            info.eval = 0;
        }
        else {
            info = {
                sign: 1,
                val: 0,
                base: 10,
                frac: 0,
                flen: 0,
                esign: 1,
                eval: 0
            };
        }
        return info;
    }
    var powp10 = [1, 1e1, 1e2, 1e3, 1e4, 1e5, 1e6, 1e7, 1e8, 1e9, 1e10, 1e11, 1e12, 1e13, 1e14, 1e15,
        1e16, 1e17, 1e18, 1e19, 1e20, 1e21, 1e22, 1e23, 1e24, 1e25, 1e26, 1e27, 1e28, 1e29, 1e30, 1e31,
        1e32, 1e33, 1e34, 1e35, 1e36, 1e37, 1e38, 1e39, 1e40, 1e41, 1e42, 1e43, 1e44, 1e45, 1e46, 1e47,
        1e48, 1e49, 1e50, 1e51, 1e52, 1e53, 1e54, 1e55, 1e56, 1e57, 1e58, 1e59, 1e60, 1e61, 1e62, 1e63,
        1e64, 1e65, 1e66, 1e67, 1e68, 1e69, 1e70, 1e71, 1e72, 1e73, 1e74, 1e75, 1e76, 1e77, 1e78, 1e79,
        1e80, 1e81, 1e82, 1e83, 1e84, 1e85, 1e86, 1e87, 1e88, 1e89, 1e90, 1e91, 1e92, 1e93, 1e94, 1e95,
        1e96, 1e97, 1e98, 1e99, 1e100, 1e101, 1e102, 1e103, 1e104, 1e105, 1e106, 1e107, 1e108, 1e109,
        1e110, 1e111, 1e112, 1e113, 1e114, 1e115, 1e116, 1e117, 1e118, 1e119, 1e120, 1e121, 1e122,
        1e123, 1e124, 1e125, 1e126, 1e127, 1e128, 1e129, 1e130, 1e131, 1e132, 1e133, 1e134, 1e135,
        1e136, 1e137, 1e138, 1e139, 1e140, 1e141, 1e142, 1e143, 1e144, 1e145, 1e146, 1e147, 1e148,
        1e149, 1e150, 1e151, 1e152, 1e153, 1e154, 1e155, 1e156, 1e157, 1e158, 1e159, 1e160, 1e161,
        1e162, 1e163, 1e164, 1e165, 1e166, 1e167, 1e168, 1e169, 1e170, 1e171, 1e172, 1e173, 1e174,
        1e175, 1e176, 1e177, 1e178, 1e179, 1e180, 1e181, 1e182, 1e183, 1e184, 1e185, 1e186, 1e187,
        1e188, 1e189, 1e190, 1e191, 1e192, 1e193, 1e194, 1e195, 1e196, 1e197, 1e198, 1e199, 1e200,
        1e201, 1e202, 1e203, 1e204, 1e205, 1e206, 1e207, 1e208, 1e209, 1e210, 1e211, 1e212, 1e213,
        1e214, 1e215, 1e216, 1e217, 1e218, 1e219, 1e220, 1e221, 1e222, 1e223, 1e224, 1e225, 1e226,
        1e227, 1e228, 1e229, 1e230, 1e231, 1e232, 1e233, 1e234, 1e235, 1e236, 1e237, 1e238, 1e239,
        1e240, 1e241, 1e242, 1e243, 1e244, 1e245, 1e246, 1e247, 1e248, 1e249, 1e250, 1e251, 1e252,
        1e253, 1e254, 1e255, 1e256, 1e257, 1e258, 1e259, 1e260, 1e261, 1e262, 1e263, 1e264, 1e265,
        1e266, 1e267, 1e268, 1e269, 1e270, 1e271, 1e272, 1e273, 1e274, 1e275, 1e276, 1e277, 1e278,
        1e279, 1e280, 1e281, 1e282, 1e283, 1e284, 1e285, 1e286, 1e287, 1e288, 1e289, 1e290, 1e291,
        1e292, 1e293, 1e294, 1e295, 1e296, 1e297, 1e298, 1e299, 1e300, 1e301, 1e302, 1e303, 1e304,
        1e305, 1e306, 1e307, 1e308
    ];
    var pown10 = [1, 1e-1, 1e-2, 1e-3, 1e-4, 1e-5, 1e-6, 1e-7, 1e-8, 1e-9, 1e-10, 1e-11, 1e-12,
        1e-13, 1e-14, 1e-15, 1e-16, 1e-17, 1e-18, 1e-19, 1e-20, 1e-21, 1e-22, 1e-23, 1e-24, 1e-25,
        1e-26, 1e-27, 1e-28, 1e-29, 1e-30, 1e-31, 1e-32, 1e-33, 1e-34, 1e-35, 1e-36, 1e-37, 1e-38,
        1e-39, 1e-40, 1e-41, 1e-42, 1e-43, 1e-44, 1e-45, 1e-46, 1e-47, 1e-48, 1e-49, 1e-50, 1e-51,
        1e-52, 1e-53, 1e-54, 1e-55, 1e-56, 1e-57, 1e-58, 1e-59, 1e-60, 1e-61, 1e-62, 1e-63, 1e-64,
        1e-65, 1e-66, 1e-67, 1e-68, 1e-69, 1e-70, 1e-71, 1e-72, 1e-73, 1e-74, 1e-75, 1e-76, 1e-77,
        1e-78, 1e-79, 1e-80, 1e-81, 1e-82, 1e-83, 1e-84, 1e-85, 1e-86, 1e-87, 1e-88, 1e-89, 1e-90,
        1e-91, 1e-92, 1e-93, 1e-94, 1e-95, 1e-96, 1e-97, 1e-98, 1e-99, 1e-100, 1e-101, 1e-102, 1e-103,
        1e-104, 1e-105, 1e-106, 1e-107, 1e-108, 1e-109, 1e-110, 1e-111, 1e-112, 1e-113, 1e-114, 1e-115,
        1e-116, 1e-117, 1e-118, 1e-119, 1e-120, 1e-121, 1e-122, 1e-123, 1e-124, 1e-125, 1e-126, 1e-127,
        1e-128, 1e-129, 1e-130, 1e-131, 1e-132, 1e-133, 1e-134, 1e-135, 1e-136, 1e-137, 1e-138, 1e-139,
        1e-140, 1e-141, 1e-142, 1e-143, 1e-144, 1e-145, 1e-146, 1e-147, 1e-148, 1e-149, 1e-150, 1e-151,
        1e-152, 1e-153, 1e-154, 1e-155, 1e-156, 1e-157, 1e-158, 1e-159, 1e-160, 1e-161, 1e-162, 1e-163,
        1e-164, 1e-165, 1e-166, 1e-167, 1e-168, 1e-169, 1e-170, 1e-171, 1e-172, 1e-173, 1e-174, 1e-175,
        1e-176, 1e-177, 1e-178, 1e-179, 1e-180, 1e-181, 1e-182, 1e-183, 1e-184, 1e-185, 1e-186, 1e-187,
        1e-188, 1e-189, 1e-190, 1e-191, 1e-192, 1e-193, 1e-194, 1e-195, 1e-196, 1e-197, 1e-198, 1e-199,
        1e-200, 1e-201, 1e-202, 1e-203, 1e-204, 1e-205, 1e-206, 1e-207, 1e-208, 1e-209, 1e-210, 1e-211,
        1e-212, 1e-213, 1e-214, 1e-215, 1e-216, 1e-217, 1e-218, 1e-219, 1e-220, 1e-221, 1e-222, 1e-223,
        1e-224, 1e-225, 1e-226, 1e-227, 1e-228, 1e-229, 1e-230, 1e-231, 1e-232, 1e-233, 1e-234, 1e-235,
        1e-236, 1e-237, 1e-238, 1e-239, 1e-240, 1e-241, 1e-242, 1e-243, 1e-244, 1e-245, 1e-246, 1e-247,
        1e-248, 1e-249, 1e-250, 1e-251, 1e-252, 1e-253, 1e-254, 1e-255, 1e-256, 1e-257, 1e-258, 1e-259,
        1e-260, 1e-261, 1e-262, 1e-263, 1e-264, 1e-265, 1e-266, 1e-267, 1e-268, 1e-269, 1e-270, 1e-271,
        1e-272, 1e-273, 1e-274, 1e-275, 1e-276, 1e-277, 1e-278, 1e-279, 1e-280, 1e-281, 1e-282, 1e-283,
        1e-284, 1e-285, 1e-286, 1e-287, 1e-288, 1e-289, 1e-290, 1e-291, 1e-292, 1e-293, 1e-294, 1e-295,
        1e-296, 1e-297, 1e-298, 1e-299, 1e-300, 1e-301, 1e-302, 1e-303, 1e-304, 1e-305, 1e-306, 1e-307,
        1e-308, 1e-309, 1e-310, 1e-311, 1e-312, 1e-313, 1e-314, 1e-315, 1e-316, 1e-317, 1e-318, 1e-319,
        1e-320, 1e-321, 1e-322, 1e-323
    ];
    function numpart_calc(info) {
        var val = info.val;
        var e = 1;
        if (info.eval > 0) {
            if (info.base == 10 && info.esign > 0 && info.eval < powp10.length)
                e = powp10[info.eval];
            else if (info.base == 10 && info.esign < 0 && info.eval < pown10.length)
                e = pown10[info.eval];
            else
                e = Math.pow(info.base == 10 ? 10 : 2, info.esign * info.eval);
            val *= e;
        }
        if (info.flen > 0) {
            var d = Math.pow(info.base, info.flen);
            val = (val * d + info.frac * e) / d;
        }
        return info.sign * val;
    }
    function lex_reset(lx) {
        lx.state = lex_enum.START;
        lx.flpS = lx.flpR = lx.flp1 = lx.flp2 = lx.flp3 = lx.flp4 = FILEPOS_NULL;
        lx.chR = lx.ch1 = lx.ch2 = lx.ch3 = lx.ch4 = '';
        lx.str = '';
        lx.braces = [0];
        lx.str_hexval = 0;
        lx.str_hexleft = 0;
    }
    function lex_new() {
        return {
            str: '',
            braces: [0],
            state: lex_enum.START,
            npi: numpart_new(),
            flpS: FILEPOS_NULL,
            flpR: FILEPOS_NULL,
            flp1: FILEPOS_NULL,
            flp2: FILEPOS_NULL,
            flp3: FILEPOS_NULL,
            flp4: FILEPOS_NULL,
            chR: '',
            ch1: '',
            ch2: '',
            ch3: '',
            ch4: '',
            str_hexval: 0,
            str_hexleft: 0,
            numexp: false
        };
    }
    function lex_fwd(lx, flp, ch) {
        lx.ch4 = lx.ch3;
        lx.ch3 = lx.ch2;
        lx.ch2 = lx.ch1;
        lx.ch1 = ch;
        lx.flp4 = lx.flp3;
        lx.flp3 = lx.flp2;
        lx.flp2 = lx.flp1;
        lx.flp1 = flp;
    }
    function lex_rev(lx) {
        lx.chR = lx.ch1;
        lx.ch1 = lx.ch2;
        lx.ch2 = lx.ch3;
        lx.ch3 = lx.ch4;
        lx.ch4 = '';
        lx.flpR = lx.flp1;
        lx.flp1 = lx.flp2;
        lx.flp2 = lx.flp3;
        lx.flp3 = lx.flp4;
        lx.flp4 = FILEPOS_NULL;
    }
    function lex_process(lx, tks) {
        var ch1 = lx.ch1;
        var flp = lx.flp1;
        var flpS = lx.flpS;
        switch (lx.state) {
            case lex_enum.START:
                lx.flpS = flp;
                if (ch1 === '#') {
                    lx.state = lex_enum.COMMENT_LINE;
                    tks.push(tok_newline(flp, false));
                }
                else if (ks_char(ch1) !== ks_enum.INVALID) {
                    if (ch1 === '{')
                        lx.braces[lx.braces.length - 1]++;
                    else if (ch1 === '}') {
                        if (lx.braces[lx.braces.length - 1] > 0)
                            lx.braces[lx.braces.length - 1]--;
                        else if (lx.braces.length > 1) {
                            lx.braces.pop();
                            lx.str = '';
                            lx.state = lex_enum.STR_INTERP;
                            tks.push(tok_ks(flp, ks_enum.RPAREN));
                            tks.push(tok_ks(flp, ks_enum.TILDE));
                            break;
                        }
                        else
                            tks.push(tok_error(flp, 'Mismatched brace'));
                    }
                    lx.state = lex_enum.SPECIAL1;
                }
                else if (isIdentStart(ch1)) {
                    lx.str = ch1;
                    lx.state = lex_enum.IDENT;
                }
                else if (isNum(ch1)) {
                    numpart_new(lx.npi);
                    lx.npi.val = toHex(ch1);
                    if (lx.npi.val === 0)
                        lx.state = lex_enum.NUM_0;
                    else
                        lx.state = lex_enum.NUM_BODY;
                }
                else if (ch1 === '\'') {
                    lx.str = '';
                    lx.state = lex_enum.STR_BASIC;
                }
                else if (ch1 === '"') {
                    lx.str = '';
                    lx.state = lex_enum.STR_INTERP;
                    tks.push(tok_ks(flp, ks_enum.LPAREN));
                }
                else if (ch1 === '\\')
                    lx.state = lex_enum.BACKSLASH;
                else if (ch1 === '\r') {
                    lx.state = lex_enum.RETURN;
                    tks.push(tok_newline(flp, false));
                }
                else if (ch1 === '\n' || ch1 === ';')
                    tks.push(tok_newline(flp, ch1 === ';'));
                else if (!isSpace(ch1))
                    tks.push(tok_error(flp, 'Unexpected character: ' + ch1));
                break;
            case lex_enum.COMMENT_LINE:
                if (ch1 === '\r')
                    lx.state = lex_enum.RETURN;
                else if (ch1 === '\n')
                    lx.state = lex_enum.START;
                break;
            case lex_enum.BACKSLASH:
                if (ch1 === '#')
                    lx.state = lex_enum.COMMENT_LINE;
                else if (ch1 === '\r')
                    lx.state = lex_enum.RETURN;
                else if (ch1 === '\n')
                    lx.state = lex_enum.START;
                else if (!isSpace(ch1))
                    tks.push(tok_error(flp, 'Invalid character after backslash'));
                break;
            case lex_enum.RETURN:
                lx.state = lex_enum.START;
                if (ch1 !== '\n')
                    lex_process(lx, tks);
                break;
            case lex_enum.COMMENT_BLOCK:
                if (lx.ch2 === '*' && ch1 === '/')
                    lx.state = lex_enum.START;
                break;
            case lex_enum.SPECIAL1:
                if (ks_char(ch1) !== ks_enum.INVALID) {
                    if (lx.ch2 === '/' && ch1 === '*')
                        lx.state = lex_enum.COMMENT_BLOCK;
                    else
                        lx.state = lex_enum.SPECIAL2;
                }
                else {
                    var ks1 = ks_char(lx.ch2);
                    if (ks1 === ks_enum.PLUS) {
                        if (!isSpace(ch1) && isSpace(lx.ch3))
                            ks1 = ks_enum.UNPLUS;
                    }
                    else if (ks1 === ks_enum.MINUS) {
                        if (!isSpace(ch1) && isSpace(lx.ch3))
                            ks1 = ks_enum.UNMINUS;
                    }
                    tks.push(tok_ks(lx.flp2, ks1));
                    lx.state = lex_enum.START;
                    lex_process(lx, tks);
                }
                break;
            case lex_enum.SPECIAL2:
                {
                    var ks3 = ks_char3(lx.ch3, lx.ch2, ch1);
                    if (ks3 !== ks_enum.INVALID) {
                        lx.state = lex_enum.START;
                        tks.push(tok_ks(lx.flp3, ks3));
                    }
                    else {
                        var ks2 = ks_char2(lx.ch3, lx.ch2);
                        if (ks2 !== ks_enum.INVALID) {
                            tks.push(tok_ks(lx.flp3, ks2));
                            lx.state = lex_enum.START;
                            lex_process(lx, tks);
                        }
                        else {
                            var ks1 = ks_char(lx.ch3);
                            if (ks1 === ks_enum.PLUS && isSpace(lx.ch4))
                                ks1 = ks_enum.UNPLUS;
                            else if (ks1 === ks_enum.MINUS && isSpace(lx.ch4))
                                ks1 = ks_enum.UNMINUS;
                            tks.push(tok_ks(lx.flp3, ks1));
                            lx.state = lex_enum.START;
                            lex_rev(lx);
                            lex_process(lx, tks);
                            lex_fwd(lx, lx.flpR, lx.chR);
                            lex_process(lx, tks);
                        }
                    }
                }
                break;
            case lex_enum.IDENT:
                if (!isIdentBody(ch1)) {
                    var ksk = ks_str(lx.str);
                    if (ksk !== ks_enum.INVALID)
                        tks.push(tok_ks(flpS, ksk));
                    else
                        tks.push(tok_ident(flpS, lx.str));
                    lx.state = lex_enum.START;
                    lex_process(lx, tks);
                }
                else {
                    lx.str += ch1;
                    if (lx.str.length > 1024)
                        tks.push(tok_error(flpS, 'Identifier too long'));
                }
                break;
            case lex_enum.NUM_0:
                if (ch1 === 'b') {
                    lx.npi.base = 2;
                    lx.state = lex_enum.NUM_2;
                }
                else if (ch1 === 'c') {
                    lx.npi.base = 8;
                    lx.state = lex_enum.NUM_2;
                }
                else if (ch1 === 'x') {
                    lx.npi.base = 16;
                    lx.state = lex_enum.NUM_2;
                }
                else if (ch1 === '_')
                    lx.state = lex_enum.NUM_BODY;
                else if (ch1 === '.')
                    lx.state = lex_enum.NUM_FRAC;
                else if (ch1 === 'e' || ch1 === 'E')
                    lx.state = lex_enum.NUM_EXP;
                else if (!isIdentStart(ch1)) {
                    tks.push(tok_num(flpS, 0));
                    lx.state = lex_enum.START;
                    lex_process(lx, tks);
                }
                else
                    tks.push(tok_error(flpS, 'Invalid number'));
                break;
            case lex_enum.NUM_2:
                if (isHex(ch1)) {
                    lx.npi.val = toHex(ch1);
                    if (lx.npi.val >= lx.npi.base)
                        tks.push(tok_error(flpS, 'Invalid number'));
                    else
                        lx.state = lex_enum.NUM_BODY;
                }
                else if (ch1 !== '_')
                    tks.push(tok_error(flpS, 'Invalid number'));
                break;
            case lex_enum.NUM_BODY:
                if (ch1 === '.')
                    lx.state = lex_enum.NUM_FRAC;
                else if ((lx.npi.base === 10 && (ch1 === 'e' || ch1 === 'E')) ||
                    (lx.npi.base !== 10 && (ch1 === 'p' || ch1 === 'P')))
                    lx.state = lex_enum.NUM_EXP;
                else if (isHex(ch1)) {
                    var v = toHex(ch1);
                    if (v >= lx.npi.base)
                        tks.push(tok_error(flpS, 'Invalid number'));
                    else
                        lx.npi.val = lx.npi.val * lx.npi.base + v;
                }
                else if (!isAlpha(ch1)) {
                    tks.push(tok_num(flpS, numpart_calc(lx.npi)));
                    lx.state = lex_enum.START;
                    lex_process(lx, tks);
                }
                else if (ch1 !== '_')
                    tks.push(tok_error(flpS, 'Invalid number'));
                break;
            case lex_enum.NUM_FRAC:
                if ((lx.npi.base === 10 && (ch1 === 'e' || ch1 === 'E')) ||
                    (lx.npi.base !== 10 && (ch1 === 'p' || ch1 === 'P')))
                    lx.state = lex_enum.NUM_EXP;
                else if (isHex(ch1)) {
                    var v = toHex(ch1);
                    if (v >= lx.npi.base)
                        tks.push(tok_error(flpS, 'Invalid number'));
                    else {
                        lx.npi.frac = lx.npi.frac * lx.npi.base + v;
                        lx.npi.flen++;
                    }
                }
                else if (!isAlpha(ch1)) {
                    if (lx.npi.flen <= 0)
                        tks.push(tok_error(flpS, 'Invalid number'));
                    else {
                        tks.push(tok_num(flpS, numpart_calc(lx.npi)));
                        lx.state = lex_enum.START;
                        lex_process(lx, tks);
                    }
                }
                else if (ch1 !== '_')
                    tks.push(tok_error(flpS, 'Invalid number'));
                break;
            case lex_enum.NUM_EXP:
                if (ch1 !== '_') {
                    lx.npi.esign = ch1 === '-' ? -1 : 1;
                    lx.state = lex_enum.NUM_EXP_BODY;
                    lx.numexp = false;
                    if (ch1 !== '+' && ch1 !== '-')
                        lex_process(lx, tks);
                }
                break;
            case lex_enum.NUM_EXP_BODY:
                if (isNum(ch1)) {
                    lx.npi.eval = lx.npi.eval * 10.0 + toHex(ch1);
                    lx.numexp = true;
                }
                else if (!isAlpha(ch1)) {
                    if (!lx.numexp)
                        tks.push(tok_error(flpS, 'Invalid number'));
                    else {
                        tks.push(tok_num(flpS, numpart_calc(lx.npi)));
                        lx.state = lex_enum.START;
                        lex_process(lx, tks);
                    }
                }
                else if (ch1 !== '_')
                    tks.push(tok_error(flpS, 'Invalid number'));
                break;
            case lex_enum.STR_BASIC:
                if (ch1 === '\r' || ch1 === '\n')
                    tks.push(tok_error(lx.flp2, 'Missing end of string'));
                else if (ch1 === '\'')
                    lx.state = lex_enum.STR_BASIC_ESC;
                else
                    lx.str += ch1;
                break;
            case lex_enum.STR_BASIC_ESC:
                if (ch1 === '\'') {
                    lx.str += ch1;
                    lx.state = lex_enum.STR_BASIC;
                }
                else {
                    lx.state = lex_enum.START;
                    tks.push(tok_ks(flpS, ks_enum.LPAREN));
                    tks.push(tok_str(flpS, lx.str));
                    tks.push(tok_ks(lx.flp2, ks_enum.RPAREN));
                    lex_process(lx, tks);
                }
                break;
            case lex_enum.STR_INTERP:
                if (ch1 === '\r' || ch1 === '\n')
                    tks.push(tok_error(lx.flp2, 'Missing end of string'));
                else if (ch1 === '"') {
                    lx.state = lex_enum.START;
                    tks.push(tok_str(flpS, lx.str));
                    tks.push(tok_ks(flp, ks_enum.RPAREN));
                }
                else if (ch1 === '$') {
                    lx.state = lex_enum.STR_INTERP_DLR;
                    tks.push(tok_str(flpS, lx.str));
                    tks.push(tok_ks(flp, ks_enum.TILDE));
                }
                else if (ch1 === '\\')
                    lx.state = lex_enum.STR_INTERP_ESC;
                else
                    lx.str += ch1;
                break;
            case lex_enum.STR_INTERP_DLR:
                if (ch1 === '{') {
                    lx.braces.push(0);
                    lx.state = lex_enum.START;
                    tks.push(tok_ks(flp, ks_enum.LPAREN));
                }
                else if (isIdentStart(ch1)) {
                    lx.str = ch1;
                    lx.state = lex_enum.STR_INTERP_DLR_ID;
                    lx.flpS = flp;
                }
                else
                    tks.push(tok_error(flp, 'Invalid substitution'));
                break;
            case lex_enum.STR_INTERP_DLR_ID:
                if (!isIdentBody(ch1)) {
                    if (ks_str(lx.str) !== ks_enum.INVALID)
                        tks.push(tok_error(flpS, 'Invalid substitution'));
                    else {
                        tks.push(tok_ident(flpS, lx.str));
                        if (ch1 === '"') {
                            lx.state = lex_enum.START;
                            tks.push(tok_ks(flp, ks_enum.RPAREN));
                        }
                        else {
                            lx.str = '';
                            lx.state = lex_enum.STR_INTERP;
                            tks.push(tok_ks(flp, ks_enum.TILDE));
                            lex_process(lx, tks);
                        }
                    }
                }
                else {
                    lx.str += ch1;
                    if (lx.str.length > 1024)
                        tks.push(tok_error(flpS, 'Identifier too long'));
                }
                break;
            case lex_enum.STR_INTERP_ESC:
                if (ch1 === '\r' || ch1 === '\n')
                    tks.push(tok_error(lx.flp2, 'Missing end of string'));
                else if (ch1 === 'x') {
                    lx.str_hexval = 0;
                    lx.str_hexleft = 2;
                    lx.state = lex_enum.STR_INTERP_ESC_HEX;
                }
                else if (ch1 === '0') {
                    lx.str += String.fromCharCode(0);
                    lx.state = lex_enum.STR_INTERP;
                }
                else if (ch1 === 'b') {
                    lx.str += String.fromCharCode(8);
                    lx.state = lex_enum.STR_INTERP;
                }
                else if (ch1 === 't') {
                    lx.str += String.fromCharCode(9);
                    lx.state = lex_enum.STR_INTERP;
                }
                else if (ch1 === 'n') {
                    lx.str += String.fromCharCode(10);
                    lx.state = lex_enum.STR_INTERP;
                }
                else if (ch1 === 'v') {
                    lx.str += String.fromCharCode(11);
                    lx.state = lex_enum.STR_INTERP;
                }
                else if (ch1 === 'f') {
                    lx.str += String.fromCharCode(12);
                    lx.state = lex_enum.STR_INTERP;
                }
                else if (ch1 === 'r') {
                    lx.str += String.fromCharCode(13);
                    lx.state = lex_enum.STR_INTERP;
                }
                else if (ch1 === 'e') {
                    lx.str += String.fromCharCode(27);
                    lx.state = lex_enum.STR_INTERP;
                }
                else if (ch1 === '\\' || ch1 === '\'' || ch1 === '"' || ch1 === '$') {
                    lx.str += ch1;
                    lx.state = lex_enum.STR_INTERP;
                }
                else
                    tks.push(tok_error(flp, 'Invalid escape sequence: \\' + ch1));
                break;
            case lex_enum.STR_INTERP_ESC_HEX:
                if (isHex(ch1)) {
                    lx.str_hexval = (lx.str_hexval << 4) + toHex(ch1);
                    lx.str_hexleft--;
                    if (lx.str_hexleft <= 0) {
                        lx.str += String.fromCharCode(lx.str_hexval);
                        lx.state = lex_enum.STR_INTERP;
                    }
                }
                else
                    tks.push(tok_error(flp, 'Invalid escape sequence; expecting hex value'));
                break;
        }
    }
    function lex_add(lx, flp, ch, tks) {
        lex_fwd(lx, flp, ch);
        lex_process(lx, tks);
    }
    function lex_close(lx, flp, tks) {
        if (lx.braces.length > 1) {
            tks.push(tok_error(flp, 'Missing end of string'));
            return;
        }
        switch (lx.state) {
            case lex_enum.START:
            case lex_enum.COMMENT_LINE:
            case lex_enum.BACKSLASH:
            case lex_enum.RETURN:
                break;
            case lex_enum.COMMENT_BLOCK:
                tks.push(tok_error(lx.flpS, 'Missing end of block comment'));
                return;
            case lex_enum.SPECIAL1:
                tks.push(tok_ks(lx.flp1, ks_char(lx.ch1)));
                break;
            case lex_enum.SPECIAL2:
                {
                    var ks2 = ks_char2(lx.ch2, lx.ch1);
                    if (ks2 !== ks_enum.INVALID)
                        tks.push(tok_ks(lx.flp2, ks2));
                    else {
                        tks.push(tok_ks(lx.flp2, ks_char(lx.ch2)));
                        tks.push(tok_ks(lx.flp1, ks_char(lx.ch1)));
                    }
                }
                break;
            case lex_enum.IDENT:
                {
                    var ksk = ks_str(lx.str);
                    if (ksk !== ks_enum.INVALID)
                        tks.push(tok_ks(lx.flpS, ksk));
                    else
                        tks.push(tok_ident(lx.flpS, lx.str));
                }
                break;
            case lex_enum.NUM_0:
                tks.push(tok_num(lx.flpS, 0));
                break;
            case lex_enum.NUM_2:
                tks.push(tok_error(lx.flpS, 'Invalid number'));
                break;
            case lex_enum.NUM_BODY:
                tks.push(tok_num(lx.flpS, numpart_calc(lx.npi)));
                break;
            case lex_enum.NUM_FRAC:
                if (lx.npi.flen <= 0)
                    tks.push(tok_error(lx.flpS, 'Invalid number'));
                else
                    tks.push(tok_num(lx.flpS, numpart_calc(lx.npi)));
                break;
            case lex_enum.NUM_EXP:
                tks.push(tok_error(lx.flpS, 'Invalid number'));
                break;
            case lex_enum.NUM_EXP_BODY:
                if (!lx.numexp)
                    tks.push(tok_error(lx.flpS, 'Invalid number'));
                else
                    tks.push(tok_num(lx.flpS, numpart_calc(lx.npi)));
                break;
            case lex_enum.STR_BASIC_ESC:
                tks.push(tok_ks(lx.flpS, ks_enum.LPAREN));
                tks.push(tok_str(lx.flpS, lx.str));
                tks.push(tok_ks(flp, ks_enum.RPAREN));
                break;
            case lex_enum.STR_BASIC:
            case lex_enum.STR_INTERP:
            case lex_enum.STR_INTERP_DLR:
            case lex_enum.STR_INTERP_DLR_ID:
            case lex_enum.STR_INTERP_ESC:
            case lex_enum.STR_INTERP_ESC_HEX:
                tks.push(tok_error(lx.flpS, 'Missing end of string'));
                break;
        }
        tks.push(tok_newline(flp, false));
    }
    var expr_enum;
    (function (expr_enum) {
        expr_enum[expr_enum["NIL"] = 0] = "NIL";
        expr_enum[expr_enum["NUM"] = 1] = "NUM";
        expr_enum[expr_enum["STR"] = 2] = "STR";
        expr_enum[expr_enum["LIST"] = 3] = "LIST";
        expr_enum[expr_enum["NAMES"] = 4] = "NAMES";
        expr_enum[expr_enum["PAREN"] = 5] = "PAREN";
        expr_enum[expr_enum["GROUP"] = 6] = "GROUP";
        expr_enum[expr_enum["CAT"] = 7] = "CAT";
        expr_enum[expr_enum["PREFIX"] = 8] = "PREFIX";
        expr_enum[expr_enum["INFIX"] = 9] = "INFIX";
        expr_enum[expr_enum["CALL"] = 10] = "CALL";
        expr_enum[expr_enum["INDEX"] = 11] = "INDEX";
        expr_enum[expr_enum["SLICE"] = 12] = "SLICE";
    })(expr_enum || (expr_enum = {}));
    function expr_nil(flp) {
        return {
            flp: flp,
            type: expr_enum.NIL
        };
    }
    function expr_num(flp, num) {
        return {
            flp: flp,
            type: expr_enum.NUM,
            num: num
        };
    }
    function expr_str(flp, str) {
        return {
            flp: flp,
            type: expr_enum.STR,
            str: str
        };
    }
    function expr_list(flp, ex) {
        return {
            flp: flp,
            type: expr_enum.LIST,
            ex: ex
        };
    }
    function expr_names(flp, names) {
        return {
            flp: flp,
            type: expr_enum.NAMES,
            names: names
        };
    }
    function expr_paren(flp, ex) {
        if (ex.type === expr_enum.NUM)
            return ex;
        return {
            flp: flp,
            type: expr_enum.PAREN,
            ex: ex
        };
    }
    function expr_group(flp, left, right) {
        var g = [];
        if (left.type === expr_enum.GROUP)
            g = g.concat(left.group);
        else
            g.push(left);
        if (right.type === expr_enum.GROUP)
            g = g.concat(right.group);
        else
            g.push(right);
        return {
            flp: flp,
            type: expr_enum.GROUP,
            group: g
        };
    }
    function expr_cat(flp, left, right) {
        while (left.type === expr_enum.PAREN)
            left = left.ex;
        while (right.type === expr_enum.PAREN)
            right = right.ex;
        if (left.type === expr_enum.STR && right.type === expr_enum.STR) {
            left.str += right.str;
            return left;
        }
        else if (left.type === expr_enum.LIST && right.type === expr_enum.LIST) {
            if (right.ex) {
                if (left.ex)
                    left.ex = expr_group(flp, left.ex, right.ex);
                else
                    left.ex = right.ex;
            }
            return left;
        }
        var c = [];
        if (left.type === expr_enum.CAT)
            c = c.concat(left.cat);
        else
            c.push(left);
        if (right.type === expr_enum.CAT)
            c = c.concat(right.cat);
        else
            c.push(right);
        return {
            flp: flp,
            type: expr_enum.CAT,
            cat: c
        };
    }
    function expr_prefix(flp, k, ex) {
        if ((k === ks_enum.MINUS || k === ks_enum.UNMINUS) && ex.type === expr_enum.NUM) {
            ex.num = -ex.num;
            return ex;
        }
        else if ((k === ks_enum.PLUS || k === ks_enum.UNPLUS) && ex.type === expr_enum.NUM)
            return ex;
        return {
            flp: flp,
            type: expr_enum.PREFIX,
            k: k,
            ex: ex
        };
    }
    function expr_infix(flp, k, left, right) {
        if (left.type === expr_enum.NUM && right !== null && right.type === expr_enum.NUM) {
            if (k === ks_enum.PLUS) {
                left.num += right.num;
                return left;
            }
            else if (k === ks_enum.MINUS) {
                left.num -= right.num;
                return left;
            }
            else if (k === ks_enum.PERCENT) {
                left.num = left.num % right.num;
                return left;
            }
            else if (k === ks_enum.STAR) {
                left.num *= right.num;
                return left;
            }
            else if (k === ks_enum.SLASH) {
                left.num /= right.num;
                return left;
            }
            else if (k === ks_enum.CARET) {
                left.num = Math.pow(left.num, right.num);
                return left;
            }
        }
        if (k === ks_enum.COMMA && right !== null)
            return expr_group(flp, left, right);
        else if (k === ks_enum.TILDE && right !== null)
            return expr_cat(flp, left, right);
        return {
            flp: flp,
            type: expr_enum.INFIX,
            k: k,
            left: left,
            right: right
        };
    }
    function expr_call(flp, cmd, params) {
        return {
            flp: flp,
            type: expr_enum.CALL,
            cmd: cmd,
            params: params
        };
    }
    function expr_index(flp, obj, key) {
        return {
            flp: flp,
            type: expr_enum.INDEX,
            obj: obj,
            key: key
        };
    }
    function expr_slice(flp, obj, start, len) {
        return {
            flp: flp,
            type: expr_enum.SLICE,
            obj: obj,
            start: start,
            len: len
        };
    }
    function decl_local(flp, names) {
        return {
            local: true,
            flp: flp,
            names: names,
            key: null
        };
    }
    function decl_native(flp, names, key) {
        return {
            local: false,
            flp: flp,
            names: names,
            key: key
        };
    }
    var ast_enumt;
    (function (ast_enumt) {
        ast_enumt[ast_enumt["BREAK"] = 0] = "BREAK";
        ast_enumt[ast_enumt["CONTINUE"] = 1] = "CONTINUE";
        ast_enumt[ast_enumt["DECLARE"] = 2] = "DECLARE";
        ast_enumt[ast_enumt["DEF1"] = 3] = "DEF1";
        ast_enumt[ast_enumt["DEF2"] = 4] = "DEF2";
        ast_enumt[ast_enumt["DOWHILE1"] = 5] = "DOWHILE1";
        ast_enumt[ast_enumt["DOWHILE2"] = 6] = "DOWHILE2";
        ast_enumt[ast_enumt["DOWHILE3"] = 7] = "DOWHILE3";
        ast_enumt[ast_enumt["ENUM"] = 8] = "ENUM";
        ast_enumt[ast_enumt["FOR1"] = 9] = "FOR1";
        ast_enumt[ast_enumt["FOR2"] = 10] = "FOR2";
        ast_enumt[ast_enumt["LOOP1"] = 11] = "LOOP1";
        ast_enumt[ast_enumt["LOOP2"] = 12] = "LOOP2";
        ast_enumt[ast_enumt["GOTO"] = 13] = "GOTO";
        ast_enumt[ast_enumt["IF1"] = 14] = "IF1";
        ast_enumt[ast_enumt["IF2"] = 15] = "IF2";
        ast_enumt[ast_enumt["IF3"] = 16] = "IF3";
        ast_enumt[ast_enumt["IF4"] = 17] = "IF4";
        ast_enumt[ast_enumt["INCLUDE"] = 18] = "INCLUDE";
        ast_enumt[ast_enumt["NAMESPACE1"] = 19] = "NAMESPACE1";
        ast_enumt[ast_enumt["NAMESPACE2"] = 20] = "NAMESPACE2";
        ast_enumt[ast_enumt["RETURN"] = 21] = "RETURN";
        ast_enumt[ast_enumt["USING"] = 22] = "USING";
        ast_enumt[ast_enumt["VAR"] = 23] = "VAR";
        ast_enumt[ast_enumt["EVAL"] = 24] = "EVAL";
        ast_enumt[ast_enumt["LABEL"] = 25] = "LABEL";
    })(ast_enumt || (ast_enumt = {}));
    function ast_break(flp) {
        return {
            flp: flp,
            type: ast_enumt.BREAK
        };
    }
    function ast_continue(flp) {
        return {
            flp: flp,
            type: ast_enumt.CONTINUE
        };
    }
    function ast_declare(flp, dc) {
        return {
            flp: flp,
            type: ast_enumt.DECLARE,
            declare: dc
        };
    }
    function ast_def1(flp, flpN, names, lvalues) {
        return {
            flp: flp,
            type: ast_enumt.DEF1,
            flpN: flpN,
            names: names,
            lvalues: lvalues
        };
    }
    function ast_def2(flp) {
        return {
            flp: flp,
            type: ast_enumt.DEF2
        };
    }
    function ast_dowhile1(flp) {
        return {
            flp: flp,
            type: ast_enumt.DOWHILE1
        };
    }
    function ast_dowhile2(flp, cond) {
        return {
            flp: flp,
            type: ast_enumt.DOWHILE2,
            cond: cond
        };
    }
    function ast_dowhile3(flp) {
        return {
            flp: flp,
            type: ast_enumt.DOWHILE3
        };
    }
    function ast_enum(flp, lvalues) {
        return {
            flp: flp,
            type: ast_enumt.ENUM,
            lvalues: lvalues
        };
    }
    function ast_for1(flp, forVar, names1, names2, ex) {
        return {
            flp: flp,
            type: ast_enumt.FOR1,
            forVar: forVar,
            names1: names1,
            names2: names2,
            ex: ex
        };
    }
    function ast_for2(flp) {
        return {
            flp: flp,
            type: ast_enumt.FOR2
        };
    }
    function ast_loop1(flp) {
        return {
            flp: flp,
            type: ast_enumt.LOOP1
        };
    }
    function ast_loop2(flp) {
        return {
            flp: flp,
            type: ast_enumt.LOOP2
        };
    }
    function ast_goto(flp, ident) {
        return {
            flp: flp,
            type: ast_enumt.GOTO,
            ident: ident
        };
    }
    function ast_if1(flp) {
        return {
            flp: flp,
            type: ast_enumt.IF1
        };
    }
    function ast_if2(flp, cond) {
        return {
            flp: flp,
            type: ast_enumt.IF2,
            cond: cond
        };
    }
    function ast_if3(flp) {
        return {
            flp: flp,
            type: ast_enumt.IF3
        };
    }
    function ast_if4(flp) {
        return {
            flp: flp,
            type: ast_enumt.IF4
        };
    }
    function incl_new(names, file) {
        return {
            names: names,
            file: file
        };
    }
    function ast_include(flp, incls) {
        return {
            flp: flp,
            type: ast_enumt.INCLUDE,
            incls: incls
        };
    }
    function ast_namespace1(flp, names) {
        return {
            flp: flp,
            type: ast_enumt.NAMESPACE1,
            names: names
        };
    }
    function ast_namespace2(flp) {
        return {
            flp: flp,
            type: ast_enumt.NAMESPACE2,
        };
    }
    function ast_return(flp, ex) {
        return {
            flp: flp,
            type: ast_enumt.RETURN,
            ex: ex
        };
    }
    function ast_using(flp, names) {
        return {
            flp: flp,
            type: ast_enumt.USING,
            names: names
        };
    }
    function ast_var(flp, lvalues) {
        return {
            flp: flp,
            type: ast_enumt.VAR,
            lvalues: lvalues
        };
    }
    function ast_eval(flp, ex) {
        return {
            flp: flp,
            type: ast_enumt.EVAL,
            ex: ex
        };
    }
    function ast_label(flp, ident) {
        return {
            flp: flp,
            type: ast_enumt.LABEL,
            ident: ident
        };
    }
    function ets_new(tk, next) {
        return { tk: tk, next: next };
    }
    function exs_new(ex, next) {
        return { ex: ex, next: next };
    }
    function eps_new(e, next) {
        return { e: e, next: next };
    }
    var prs_enum;
    (function (prs_enum) {
        prs_enum[prs_enum["STATEMENT"] = 0] = "STATEMENT";
        prs_enum[prs_enum["STATEMENT_END"] = 1] = "STATEMENT_END";
        prs_enum[prs_enum["LOOKUP"] = 2] = "LOOKUP";
        prs_enum[prs_enum["LOOKUP_IDENT"] = 3] = "LOOKUP_IDENT";
        prs_enum[prs_enum["BODY"] = 4] = "BODY";
        prs_enum[prs_enum["BODY_STATEMENT"] = 5] = "BODY_STATEMENT";
        prs_enum[prs_enum["LVALUES"] = 6] = "LVALUES";
        prs_enum[prs_enum["LVALUES_TERM"] = 7] = "LVALUES_TERM";
        prs_enum[prs_enum["LVALUES_TERM_LOOKUP"] = 8] = "LVALUES_TERM_LOOKUP";
        prs_enum[prs_enum["LVALUES_TERM_LIST"] = 9] = "LVALUES_TERM_LIST";
        prs_enum[prs_enum["LVALUES_TERM_LIST_TERM_DONE"] = 10] = "LVALUES_TERM_LIST_TERM_DONE";
        prs_enum[prs_enum["LVALUES_TERM_LIST_TAIL"] = 11] = "LVALUES_TERM_LIST_TAIL";
        prs_enum[prs_enum["LVALUES_TERM_LIST_TAIL_LOOKUP"] = 12] = "LVALUES_TERM_LIST_TAIL_LOOKUP";
        prs_enum[prs_enum["LVALUES_TERM_LIST_TAIL_DONE"] = 13] = "LVALUES_TERM_LIST_TAIL_DONE";
        prs_enum[prs_enum["LVALUES_TERM_LIST_DONE"] = 14] = "LVALUES_TERM_LIST_DONE";
        prs_enum[prs_enum["LVALUES_TERM_DONE"] = 15] = "LVALUES_TERM_DONE";
        prs_enum[prs_enum["LVALUES_TERM_EXPR"] = 16] = "LVALUES_TERM_EXPR";
        prs_enum[prs_enum["LVALUES_MORE"] = 17] = "LVALUES_MORE";
        prs_enum[prs_enum["LVALUES_DEF_TAIL"] = 18] = "LVALUES_DEF_TAIL";
        prs_enum[prs_enum["LVALUES_DEF_TAIL_DONE"] = 19] = "LVALUES_DEF_TAIL_DONE";
        prs_enum[prs_enum["BREAK"] = 20] = "BREAK";
        prs_enum[prs_enum["CONTINUE"] = 21] = "CONTINUE";
        prs_enum[prs_enum["DECLARE"] = 22] = "DECLARE";
        prs_enum[prs_enum["DECLARE_LOOKUP"] = 23] = "DECLARE_LOOKUP";
        prs_enum[prs_enum["DECLARE_STR"] = 24] = "DECLARE_STR";
        prs_enum[prs_enum["DECLARE_STR2"] = 25] = "DECLARE_STR2";
        prs_enum[prs_enum["DECLARE_STR3"] = 26] = "DECLARE_STR3";
        prs_enum[prs_enum["DEF"] = 27] = "DEF";
        prs_enum[prs_enum["DEF_LOOKUP"] = 28] = "DEF_LOOKUP";
        prs_enum[prs_enum["DEF_LVALUES"] = 29] = "DEF_LVALUES";
        prs_enum[prs_enum["DEF_BODY"] = 30] = "DEF_BODY";
        prs_enum[prs_enum["DO"] = 31] = "DO";
        prs_enum[prs_enum["DO_BODY"] = 32] = "DO_BODY";
        prs_enum[prs_enum["DO_WHILE_EXPR"] = 33] = "DO_WHILE_EXPR";
        prs_enum[prs_enum["DO_WHILE_BODY"] = 34] = "DO_WHILE_BODY";
        prs_enum[prs_enum["FOR"] = 35] = "FOR";
        prs_enum[prs_enum["LOOP_BODY"] = 36] = "LOOP_BODY";
        prs_enum[prs_enum["FOR_VARS"] = 37] = "FOR_VARS";
        prs_enum[prs_enum["FOR_VARS_LOOKUP"] = 38] = "FOR_VARS_LOOKUP";
        prs_enum[prs_enum["FOR_VARS2"] = 39] = "FOR_VARS2";
        prs_enum[prs_enum["FOR_VARS2_LOOKUP"] = 40] = "FOR_VARS2_LOOKUP";
        prs_enum[prs_enum["FOR_VARS_DONE"] = 41] = "FOR_VARS_DONE";
        prs_enum[prs_enum["FOR_EXPR"] = 42] = "FOR_EXPR";
        prs_enum[prs_enum["FOR_BODY"] = 43] = "FOR_BODY";
        prs_enum[prs_enum["GOTO"] = 44] = "GOTO";
        prs_enum[prs_enum["IF"] = 45] = "IF";
        prs_enum[prs_enum["IF2"] = 46] = "IF2";
        prs_enum[prs_enum["IF_EXPR"] = 47] = "IF_EXPR";
        prs_enum[prs_enum["IF_BODY"] = 48] = "IF_BODY";
        prs_enum[prs_enum["ELSE_BODY"] = 49] = "ELSE_BODY";
        prs_enum[prs_enum["INCLUDE"] = 50] = "INCLUDE";
        prs_enum[prs_enum["INCLUDE_LOOKUP"] = 51] = "INCLUDE_LOOKUP";
        prs_enum[prs_enum["INCLUDE_STR"] = 52] = "INCLUDE_STR";
        prs_enum[prs_enum["INCLUDE_STR2"] = 53] = "INCLUDE_STR2";
        prs_enum[prs_enum["INCLUDE_STR3"] = 54] = "INCLUDE_STR3";
        prs_enum[prs_enum["NAMESPACE"] = 55] = "NAMESPACE";
        prs_enum[prs_enum["NAMESPACE_LOOKUP"] = 56] = "NAMESPACE_LOOKUP";
        prs_enum[prs_enum["NAMESPACE_BODY"] = 57] = "NAMESPACE_BODY";
        prs_enum[prs_enum["RETURN"] = 58] = "RETURN";
        prs_enum[prs_enum["RETURN_DONE"] = 59] = "RETURN_DONE";
        prs_enum[prs_enum["USING"] = 60] = "USING";
        prs_enum[prs_enum["USING_LOOKUP"] = 61] = "USING_LOOKUP";
        prs_enum[prs_enum["VAR"] = 62] = "VAR";
        prs_enum[prs_enum["VAR_LVALUES"] = 63] = "VAR_LVALUES";
        prs_enum[prs_enum["IDENTS"] = 64] = "IDENTS";
        prs_enum[prs_enum["ENUM"] = 65] = "ENUM";
        prs_enum[prs_enum["ENUM_LVALUES"] = 66] = "ENUM_LVALUES";
        prs_enum[prs_enum["EVAL"] = 67] = "EVAL";
        prs_enum[prs_enum["EVAL_EXPR"] = 68] = "EVAL_EXPR";
        prs_enum[prs_enum["EXPR"] = 69] = "EXPR";
        prs_enum[prs_enum["EXPR_PRE"] = 70] = "EXPR_PRE";
        prs_enum[prs_enum["EXPR_TERM"] = 71] = "EXPR_TERM";
        prs_enum[prs_enum["EXPR_TERM_ISEMPTYLIST"] = 72] = "EXPR_TERM_ISEMPTYLIST";
        prs_enum[prs_enum["EXPR_TERM_CLOSEBRACE"] = 73] = "EXPR_TERM_CLOSEBRACE";
        prs_enum[prs_enum["EXPR_TERM_CLOSEPAREN"] = 74] = "EXPR_TERM_CLOSEPAREN";
        prs_enum[prs_enum["EXPR_TERM_LOOKUP"] = 75] = "EXPR_TERM_LOOKUP";
        prs_enum[prs_enum["EXPR_POST"] = 76] = "EXPR_POST";
        prs_enum[prs_enum["EXPR_POST_CALL"] = 77] = "EXPR_POST_CALL";
        prs_enum[prs_enum["EXPR_INDEX_CHECK"] = 78] = "EXPR_INDEX_CHECK";
        prs_enum[prs_enum["EXPR_INDEX_COLON_CHECK"] = 79] = "EXPR_INDEX_COLON_CHECK";
        prs_enum[prs_enum["EXPR_INDEX_COLON_EXPR"] = 80] = "EXPR_INDEX_COLON_EXPR";
        prs_enum[prs_enum["EXPR_INDEX_EXPR_CHECK"] = 81] = "EXPR_INDEX_EXPR_CHECK";
        prs_enum[prs_enum["EXPR_INDEX_EXPR_COLON_CHECK"] = 82] = "EXPR_INDEX_EXPR_COLON_CHECK";
        prs_enum[prs_enum["EXPR_INDEX_EXPR_COLON_EXPR"] = 83] = "EXPR_INDEX_EXPR_COLON_EXPR";
        prs_enum[prs_enum["EXPR_COMMA"] = 84] = "EXPR_COMMA";
        prs_enum[prs_enum["EXPR_MID"] = 85] = "EXPR_MID";
        prs_enum[prs_enum["EXPR_FINISH"] = 86] = "EXPR_FINISH";
    })(prs_enum || (prs_enum = {}));
    var lvm_enum;
    (function (lvm_enum) {
        lvm_enum[lvm_enum["VAR"] = 0] = "VAR";
        lvm_enum[lvm_enum["DEF"] = 1] = "DEF";
        lvm_enum[lvm_enum["ENUM"] = 2] = "ENUM";
        lvm_enum[lvm_enum["LIST"] = 3] = "LIST";
    })(lvm_enum || (lvm_enum = {}));
    function prs_new(state, next) {
        return {
            state: state,
            lvalues: null,
            lvaluesMode: lvm_enum.VAR,
            forVar: false,
            str: '',
            flpS: FILEPOS_NULL,
            flpL: FILEPOS_NULL,
            flpE: FILEPOS_NULL,
            exprAllowComma: true,
            exprAllowPipe: true,
            exprAllowTrailComma: false,
            exprPreStackStack: null,
            exprPreStack: null,
            exprMidStack: null,
            exprStack: null,
            exprTerm: null,
            exprTerm2: null,
            exprTerm3: null,
            names: null,
            names2: null,
            incls: null,
            next: next
        };
    }
    function parser_new() {
        return {
            state: prs_new(prs_enum.STATEMENT, null),
            tkR: null,
            tk1: null,
            tk2: null,
            level: 0
        };
    }
    function parser_fwd(pr, tk) {
        pr.tk2 = pr.tk1;
        pr.tk1 = tk;
        pr.tkR = null;
    }
    function parser_rev(pr) {
        pr.tkR = pr.tk1;
        pr.tk1 = pr.tk2;
        pr.tk2 = null;
    }
    function parser_push(pr, state) {
        pr.state = prs_new(state, pr.state);
    }
    function parser_pop(pr) {
        if (pr.state === null)
            throw new Error('Parser state is null');
        pr.state = pr.state.next;
    }
    function pri_ok(ex) {
        return { ok: true, ex: ex };
    }
    function pri_error(msg) {
        return { ok: false, msg: msg };
    }
    function parser_infix(flp, k, left, right) {
        if (k === ks_enum.PIPE) {
            if (right.type === expr_enum.CALL) {
                right.params = expr_infix(flp, ks_enum.COMMA, expr_paren(left.flp, left), right.params);
                return pri_ok(right);
            }
            else if (right.type === expr_enum.NAMES)
                return pri_ok(expr_call(right.flp, right, expr_paren(left.flp, left)));
            return pri_error('Invalid pipe');
        }
        return pri_ok(expr_infix(flp, k, left, right));
    }
    function parser_lvalues(pr, retstate, lvm) {
        if (pr.state === null)
            throw new Error('Parser state is null');
        pr.state.state = retstate;
        parser_push(pr, prs_enum.LVALUES);
        pr.state.lvalues = [];
        pr.state.lvaluesMode = lvm;
    }
    function parser_expr(pr, retstate) {
        if (pr.state === null)
            throw new Error('Parser state is null');
        pr.state.state = retstate;
        parser_push(pr, prs_enum.EXPR);
    }
    function parser_start(pr, flpS, state) {
        if (pr.state === null)
            throw new Error('Parser state is null');
        pr.level++;
        pr.state.state = state;
        pr.state.flpS = flpS;
        return null;
    }
    function parser_statement(pr, stmts, more) {
        if (pr.state === null)
            throw new Error('Parser state is null');
        pr.level--;
        pr.state.state = prs_enum.STATEMENT_END;
        return more ? null : parser_process(pr, stmts);
    }
    function parser_lookup(pr, flpL, retstate) {
        if (pr.state === null)
            throw new Error('Parser state is null');
        if (pr.tk1 === null || pr.tk1.type !== tok_enum.IDENT)
            throw new Error('Token must be an identifier');
        pr.state.state = retstate;
        pr.state.flpL = flpL;
        parser_push(pr, prs_enum.LOOKUP);
        pr.state.names = [pr.tk1.ident];
        return null;
    }
    function parser_process(pr, stmts) {
        if (pr.tk1 === null)
            throw new Error('Parser cannot process null token');
        if (pr.state === null)
            throw new Error('Parser cannot process null state');
        var tk1 = pr.tk1;
        var st = pr.state;
        var flpT = tk1.flp;
        var flpS = st.flpS;
        var flpL = st.flpL;
        var flpE = st.flpE;
        switch (st.state) {
            case prs_enum.STATEMENT:
                if (tk1.type === tok_enum.NEWLINE)
                    return null;
                else if (tok_isKS(tk1, ks_enum.BREAK))
                    return parser_start(pr, flpT, prs_enum.BREAK);
                else if (tok_isKS(tk1, ks_enum.CONTINUE))
                    return parser_start(pr, flpT, prs_enum.CONTINUE);
                else if (tok_isKS(tk1, ks_enum.DECLARE))
                    return parser_start(pr, flpT, prs_enum.DECLARE);
                else if (tok_isKS(tk1, ks_enum.DEF))
                    return parser_start(pr, flpT, prs_enum.DEF);
                else if (tok_isKS(tk1, ks_enum.DO))
                    return parser_start(pr, flpT, prs_enum.DO);
                else if (tok_isKS(tk1, ks_enum.ENUM))
                    return parser_start(pr, flpT, prs_enum.ENUM);
                else if (tok_isKS(tk1, ks_enum.FOR))
                    return parser_start(pr, flpT, prs_enum.FOR);
                else if (tok_isKS(tk1, ks_enum.GOTO))
                    return parser_start(pr, flpT, prs_enum.GOTO);
                else if (tok_isKS(tk1, ks_enum.IF))
                    return parser_start(pr, flpT, prs_enum.IF);
                else if (tok_isKS(tk1, ks_enum.INCLUDE))
                    return parser_start(pr, flpT, prs_enum.INCLUDE);
                else if (tok_isKS(tk1, ks_enum.NAMESPACE))
                    return parser_start(pr, flpT, prs_enum.NAMESPACE);
                else if (tok_isKS(tk1, ks_enum.RETURN))
                    return parser_start(pr, flpT, prs_enum.RETURN);
                else if (tok_isKS(tk1, ks_enum.USING))
                    return parser_start(pr, flpT, prs_enum.USING);
                else if (tok_isKS(tk1, ks_enum.VAR))
                    return parser_start(pr, flpT, prs_enum.VAR);
                else if (tk1.type === tok_enum.IDENT) {
                    st.flpS = flpT;
                    return parser_lookup(pr, flpT, prs_enum.IDENTS);
                }
                else if (tok_isPre(tk1) || tok_isTerm(tk1)) {
                    pr.level++;
                    st.state = prs_enum.EVAL;
                    st.flpS = flpT;
                    return parser_process(pr, stmts);
                }
                else if (tok_isMidStmt(tk1)) {
                    if (st.next === null)
                        return 'Invalid statement';
                    parser_pop(pr);
                    return parser_process(pr, stmts);
                }
                return 'Invalid statement';
            case prs_enum.STATEMENT_END:
                if (tk1.type !== tok_enum.NEWLINE)
                    return 'Missing newline or semicolon';
                st.state = prs_enum.STATEMENT;
                return null;
            case prs_enum.LOOKUP:
                if (!tok_isKS(tk1, ks_enum.PERIOD)) {
                    if (st.next === null)
                        throw new Error('Parser expecting lookup to return state');
                    st.next.names = st.names;
                    parser_pop(pr);
                    return parser_process(pr, stmts);
                }
                st.state = prs_enum.LOOKUP_IDENT;
                return null;
            case prs_enum.LOOKUP_IDENT:
                if (tk1.type !== tok_enum.IDENT)
                    return 'Expecting identifier';
                if (st.names === null || st.names === true)
                    throw new Error('Parser expecting names to be list');
                st.names.push(tk1.ident);
                st.state = prs_enum.LOOKUP;
                return null;
            case prs_enum.BODY:
                st.state = prs_enum.BODY_STATEMENT;
                parser_push(pr, prs_enum.STATEMENT);
                return parser_process(pr, stmts);
            case prs_enum.BODY_STATEMENT:
                if (tok_isMidStmt(tk1)) {
                    parser_pop(pr);
                    return parser_process(pr, stmts);
                }
                parser_push(pr, prs_enum.STATEMENT);
                return null;
            case prs_enum.LVALUES:
                if (tk1.type === tok_enum.NEWLINE) {
                    if (st.next === null)
                        throw new Error('Parser expecting lvalues to return state');
                    st.next.lvalues = st.lvalues;
                    parser_pop(pr);
                    return parser_process(pr, stmts);
                }
                st.state = prs_enum.LVALUES_TERM_DONE;
                parser_push(pr, prs_enum.LVALUES_TERM);
                pr.state.lvaluesMode = st.lvaluesMode;
                return parser_process(pr, stmts);
            case prs_enum.LVALUES_TERM:
                if (tk1.type === tok_enum.IDENT)
                    return parser_lookup(pr, flpT, prs_enum.LVALUES_TERM_LOOKUP);
                if (st.lvaluesMode === lvm_enum.ENUM)
                    return 'Expecting enumerator name';
                if (tok_isKS(tk1, ks_enum.LBRACE)) {
                    st.state = prs_enum.LVALUES_TERM_LIST_DONE;
                    st.flpE = flpT;
                    parser_push(pr, prs_enum.LVALUES_TERM_LIST);
                    return null;
                }
                else if (tok_isKS(tk1, ks_enum.PERIOD3)) {
                    if (st.lvaluesMode === lvm_enum.DEF) {
                        st.state = prs_enum.LVALUES_DEF_TAIL;
                        return null;
                    }
                    else if (st.lvaluesMode === lvm_enum.LIST) {
                        st.state = prs_enum.LVALUES_TERM_LIST_TAIL;
                        return null;
                    }
                }
                return 'Expecting variable';
            case prs_enum.LVALUES_TERM_LOOKUP:
                if (st.next === null)
                    throw new Error('Parser expecting lvalues to return state');
                if (st.names === null || st.names === true)
                    throw new Error('Parser expecting names to be list of strings');
                st.next.exprTerm = expr_names(flpL, st.names);
                st.names = null;
                parser_pop(pr);
                return parser_process(pr, stmts);
            case prs_enum.LVALUES_TERM_LIST:
                if (tk1.type === tok_enum.NEWLINE && !tk1.soft)
                    return null;
                else if (tok_isKS(tk1, ks_enum.RBRACE)) {
                    if (st.next === null)
                        throw new Error('Parser expecting lvalues to return state');
                    st.next.exprTerm = st.exprTerm;
                    parser_pop(pr);
                    return null;
                }
                st.state = prs_enum.LVALUES_TERM_LIST_TERM_DONE;
                parser_push(pr, prs_enum.LVALUES_TERM);
                pr.state.lvaluesMode = lvm_enum.LIST;
                return parser_process(pr, stmts);
            case prs_enum.LVALUES_TERM_LIST_TERM_DONE:
                if (tk1.type === tok_enum.NEWLINE && !tk1.soft)
                    return null;
                if (st.exprTerm2 === null) {
                    st.exprTerm2 = st.exprTerm;
                    st.exprTerm = null;
                }
                else {
                    if (st.exprTerm === null)
                        throw new Error('Parser expression cannot be null');
                    st.exprTerm2 =
                        expr_infix(st.exprTerm2.flp, ks_enum.COMMA, st.exprTerm2, st.exprTerm);
                    st.exprTerm = null;
                }
                if (tok_isKS(tk1, ks_enum.RBRACE)) {
                    if (st.next === null)
                        throw new Error('Parser expecting lvalues to return state');
                    st.next.exprTerm = st.exprTerm2;
                    st.exprTerm2 = null;
                    parser_pop(pr);
                    return null;
                }
                else if (tok_isKS(tk1, ks_enum.COMMA)) {
                    parser_push(pr, prs_enum.LVALUES_TERM);
                    pr.state.lvaluesMode = lvm_enum.LIST;
                    return null;
                }
                return 'Invalid list';
            case prs_enum.LVALUES_TERM_LIST_TAIL:
                if (tk1.type !== tok_enum.IDENT)
                    return 'Expecting identifier';
                return parser_lookup(pr, flpT, prs_enum.LVALUES_TERM_LIST_TAIL_LOOKUP);
            case prs_enum.LVALUES_TERM_LIST_TAIL_LOOKUP:
                if (tk1.type === tok_enum.NEWLINE && !tk1.soft)
                    return null;
                st.state = prs_enum.LVALUES_TERM_LIST_TAIL_DONE;
                if (tok_isKS(tk1, ks_enum.COMMA))
                    return null;
                return parser_process(pr, stmts);
            case prs_enum.LVALUES_TERM_LIST_TAIL_DONE:
                if (!tok_isKS(tk1, ks_enum.RBRACE))
                    return 'Missing end of list';
                if (st.next === null)
                    throw new Error('Parser expecting lvalues to return state');
                if (st.names === null || st.names === true)
                    throw new Error('Parser lvalues should be list of strings');
                st.next.exprTerm = expr_prefix(flpL, ks_enum.PERIOD3, expr_names(flpL, st.names));
                st.names = null;
                parser_pop(pr);
                return parser_process(pr, stmts);
            case prs_enum.LVALUES_TERM_LIST_DONE:
                if (st.next === null)
                    throw new Error('Parser expecting lvalues to return state');
                if (st.exprTerm === null)
                    throw new Error('Parser expecting lvalues expression');
                st.next.exprTerm = expr_list(flpE, st.exprTerm);
                parser_pop(pr);
                return parser_process(pr, stmts);
            case prs_enum.LVALUES_TERM_DONE:
                if (st.lvalues === null)
                    throw new Error('Parser expecting lvalues as list of expressions');
                if (st.exprTerm === null)
                    throw new Error('Parser expecting expression to be non-null');
                if (st.next === null)
                    throw new Error('Parser expecting lvalues to return state');
                if (tk1.type === tok_enum.NEWLINE) {
                    st.lvalues.push(expr_infix(flpT, ks_enum.EQU, st.exprTerm, null));
                    st.next.lvalues = st.lvalues;
                    parser_pop(pr);
                    return parser_process(pr, stmts);
                }
                else if (tok_isKS(tk1, ks_enum.EQU)) {
                    st.exprTerm2 = st.exprTerm;
                    st.exprTerm = null;
                    parser_expr(pr, prs_enum.LVALUES_TERM_EXPR);
                    pr.state.exprAllowComma = false;
                    return null;
                }
                else if (tok_isKS(tk1, ks_enum.COMMA)) {
                    st.lvalues.push(expr_infix(st.exprTerm.flp, ks_enum.EQU, st.exprTerm, null));
                    st.exprTerm = null;
                    st.state = prs_enum.LVALUES_MORE;
                    return null;
                }
                return 'Invalid declaration';
            case prs_enum.LVALUES_TERM_EXPR:
                if (st.lvalues === null)
                    throw new Error('Parser expecting lvalues as list of expressions');
                if (st.exprTerm2 === null)
                    throw new Error('Parser expecting expression to be non-null');
                if (st.next === null)
                    throw new Error('Parser expecting lvalues to return state');
                st.lvalues.push(expr_infix(st.exprTerm2.flp, ks_enum.EQU, st.exprTerm2, st.exprTerm));
                st.exprTerm2 = null;
                st.exprTerm = null;
                if (tk1.type === tok_enum.NEWLINE) {
                    st.next.lvalues = st.lvalues;
                    parser_pop(pr);
                    return parser_process(pr, stmts);
                }
                else if (tok_isKS(tk1, ks_enum.COMMA)) {
                    st.state = prs_enum.LVALUES_MORE;
                    return null;
                }
                return 'Invalid declaration';
            case prs_enum.LVALUES_MORE:
                if (tk1.type === tok_enum.NEWLINE && !tk1.soft)
                    return null;
                st.state = prs_enum.LVALUES_TERM_DONE;
                parser_push(pr, prs_enum.LVALUES_TERM);
                pr.state.lvaluesMode = st.lvaluesMode;
                return parser_process(pr, stmts);
            case prs_enum.LVALUES_DEF_TAIL:
                if (tk1.type !== tok_enum.IDENT)
                    return 'Expecting identifier';
                return parser_lookup(pr, flpT, prs_enum.LVALUES_DEF_TAIL_DONE);
            case prs_enum.LVALUES_DEF_TAIL_DONE:
                if (tk1.type !== tok_enum.NEWLINE)
                    return 'Missing newline or semicolon';
                if (st.next === null)
                    throw new Error('Parser expecting lvalues to return state');
                st.next.names = st.names;
                parser_pop(pr);
                st = pr.state;
                if (st.lvalues === null)
                    throw new Error('Parser expecting lvalues to be list of expressions');
                if (st.names === null || st.names === true)
                    throw new Error('Parser expecting names to be list of strings');
                if (st.next === null)
                    throw new Error('Parser expecting lvalues to return state');
                st.lvalues.push(expr_prefix(flpL, ks_enum.PERIOD3, expr_names(flpL, st.names)));
                st.names = null;
                st.next.lvalues = st.lvalues;
                parser_pop(pr);
                return parser_process(pr, stmts);
            case prs_enum.BREAK:
                stmts.push(ast_break(flpS));
                return parser_statement(pr, stmts, false);
            case prs_enum.CONTINUE:
                stmts.push(ast_continue(flpS));
                return parser_statement(pr, stmts, false);
            case prs_enum.DECLARE:
                if (tk1.type === tok_enum.NEWLINE && !tk1.soft)
                    return null;
                if (tk1.type !== tok_enum.IDENT)
                    return 'Expecting identifier';
                return parser_lookup(pr, flpT, prs_enum.DECLARE_LOOKUP);
            case prs_enum.DECLARE_LOOKUP:
                if (tok_isKS(tk1, ks_enum.LPAREN)) {
                    st.state = prs_enum.DECLARE_STR;
                    return null;
                }
                if (st.names === null || st.names === true)
                    throw new Error('Parser expecting declare lookup to return names');
                stmts.push(ast_declare(flpS, decl_local(flpL, st.names)));
                if (tok_isKS(tk1, ks_enum.COMMA)) {
                    st.state = prs_enum.DECLARE;
                    return null;
                }
                return parser_statement(pr, stmts, false);
            case prs_enum.DECLARE_STR:
                if (tk1.type !== tok_enum.STR)
                    return 'Expecting string constant';
                if (st.names === null || st.names === true)
                    throw new Error('Parser expecting declare lookup to return names');
                stmts.push(ast_declare(flpS, decl_native(flpL, st.names, tk1.str)));
                st.state = prs_enum.DECLARE_STR2;
                return null;
            case prs_enum.DECLARE_STR2:
                if (!tok_isKS(tk1, ks_enum.RPAREN))
                    return 'Expecting string constant';
                st.state = prs_enum.DECLARE_STR3;
                return null;
            case prs_enum.DECLARE_STR3:
                if (tok_isKS(tk1, ks_enum.COMMA)) {
                    st.state = prs_enum.DECLARE;
                    return null;
                }
                return parser_statement(pr, stmts, false);
            case prs_enum.DEF:
                if (tk1.type !== tok_enum.IDENT)
                    return 'Expecting identifier';
                return parser_lookup(pr, flpT, prs_enum.DEF_LOOKUP);
            case prs_enum.DEF_LOOKUP:
                parser_lvalues(pr, prs_enum.DEF_LVALUES, lvm_enum.DEF);
                return parser_process(pr, stmts);
            case prs_enum.DEF_LVALUES:
                if (tk1.type !== tok_enum.NEWLINE)
                    return 'Missing newline or semicolon';
                if (st.names === null || st.names === true)
                    throw new Error('Parser def expecting names');
                if (st.lvalues === null)
                    throw new Error('Parser def expecting lvalues');
                stmts.push(ast_def1(flpS, flpL, st.names, st.lvalues));
                st.state = prs_enum.DEF_BODY;
                parser_push(pr, prs_enum.BODY);
                return null;
            case prs_enum.DEF_BODY:
                if (!tok_isKS(tk1, ks_enum.END))
                    return 'Missing `end` of def block';
                stmts.push(ast_def2(flpS));
                return parser_statement(pr, stmts, true);
            case prs_enum.DO:
                stmts.push(ast_dowhile1(flpS));
                st.state = prs_enum.DO_BODY;
                parser_push(pr, prs_enum.BODY);
                return parser_process(pr, stmts);
            case prs_enum.DO_BODY:
                if (tok_isKS(tk1, ks_enum.WHILE)) {
                    parser_expr(pr, prs_enum.DO_WHILE_EXPR);
                    return null;
                }
                else if (tok_isKS(tk1, ks_enum.END)) {
                    stmts.push(ast_dowhile2(flpS, null));
                    stmts.push(ast_dowhile3(flpS));
                    return parser_statement(pr, stmts, true);
                }
                return 'Missing `while` or `end` of do block';
            case prs_enum.DO_WHILE_EXPR:
                stmts.push(ast_dowhile2(flpS, st.exprTerm));
                st.exprTerm = null;
                if (tk1.type === tok_enum.NEWLINE) {
                    st.state = prs_enum.DO_WHILE_BODY;
                    parser_push(pr, prs_enum.BODY);
                    return null;
                }
                else if (tok_isKS(tk1, ks_enum.END)) {
                    stmts.push(ast_dowhile3(flpS));
                    return parser_statement(pr, stmts, true);
                }
                return 'Missing newline or semicolon';
            case prs_enum.DO_WHILE_BODY:
                if (!tok_isKS(tk1, ks_enum.END))
                    return 'Missing `end` of do-while block';
                stmts.push(ast_dowhile3(flpS));
                return parser_statement(pr, stmts, true);
            case prs_enum.FOR:
                if (tk1.type === tok_enum.NEWLINE) {
                    stmts.push(ast_loop1(flpS));
                    st.state = prs_enum.LOOP_BODY;
                    parser_push(pr, prs_enum.BODY);
                    return null;
                }
                else if (tok_isKS(tk1, ks_enum.COLON)) {
                    st.state = prs_enum.FOR_VARS_DONE;
                    return null;
                }
                st.state = prs_enum.FOR_VARS;
                if (tok_isKS(tk1, ks_enum.VAR)) {
                    st.forVar = true;
                    return null;
                }
                return parser_process(pr, stmts);
            case prs_enum.LOOP_BODY:
                if (!tok_isKS(tk1, ks_enum.END))
                    return 'Missing `end` of for block';
                stmts.push(ast_loop2(flpS));
                return parser_statement(pr, stmts, true);
            case prs_enum.FOR_VARS:
                if (tk1.type !== tok_enum.IDENT)
                    return 'Expecting identifier';
                return parser_lookup(pr, flpT, prs_enum.FOR_VARS_LOOKUP);
            case prs_enum.FOR_VARS_LOOKUP:
                if (st.names === null || st.names === true)
                    throw new Error('Parser `for` lookup expecting names');
                st.names2 = st.names;
                st.names = null;
                if (tok_isKS(tk1, ks_enum.COMMA)) {
                    st.state = prs_enum.FOR_VARS2;
                    return null;
                }
                else if (tok_isKS(tk1, ks_enum.COLON)) {
                    st.state = prs_enum.FOR_VARS_DONE;
                    return null;
                }
                return 'Invalid for loop';
            case prs_enum.FOR_VARS2:
                if (tk1.type !== tok_enum.IDENT)
                    return 'Expecting identifier';
                return parser_lookup(pr, flpT, prs_enum.FOR_VARS2_LOOKUP);
            case prs_enum.FOR_VARS2_LOOKUP:
                if (!tok_isKS(tk1, ks_enum.COLON))
                    return 'Expecting `:`';
                st.state = prs_enum.FOR_VARS_DONE;
                return null;
            case prs_enum.FOR_VARS_DONE:
                if (tk1.type === tok_enum.NEWLINE)
                    return 'Expecting expression in for statement';
                parser_expr(pr, prs_enum.FOR_EXPR);
                return parser_process(pr, stmts);
            case prs_enum.FOR_EXPR:
                if (st.names === true)
                    throw new Error('Parser execting `for` names to be list of strings');
                if (st.exprTerm === null)
                    throw new Error('Parser expecting `for` expression');
                stmts.push(ast_for1(flpS, st.forVar, st.names2, st.names, st.exprTerm));
                st.names2 = null;
                st.names = null;
                st.exprTerm = null;
                if (tk1.type === tok_enum.NEWLINE) {
                    st.state = prs_enum.FOR_BODY;
                    parser_push(pr, prs_enum.BODY);
                    return null;
                }
                else if (tok_isKS(tk1, ks_enum.END)) {
                    stmts.push(ast_for2(flpS));
                    return parser_statement(pr, stmts, true);
                }
                return 'Missing newline or semicolon';
            case prs_enum.FOR_BODY:
                if (!tok_isKS(tk1, ks_enum.END))
                    return 'Missing `end` of for block';
                stmts.push(ast_for2(flpS));
                return parser_statement(pr, stmts, true);
            case prs_enum.GOTO:
                if (tk1.type !== tok_enum.IDENT)
                    return 'Expecting identifier';
                stmts.push(ast_goto(flpS, tk1.ident));
                return parser_statement(pr, stmts, true);
            case prs_enum.IF:
                stmts.push(ast_if1(flpS));
                st.state = prs_enum.IF2;
                return parser_process(pr, stmts);
            case prs_enum.IF2:
                if (tk1.type === tok_enum.NEWLINE)
                    return 'Missing conditional expression';
                parser_expr(pr, prs_enum.IF_EXPR);
                return parser_process(pr, stmts);
            case prs_enum.IF_EXPR:
                if (st.exprTerm === null)
                    throw new Error('Parser expecting `if` expression');
                stmts.push(ast_if2(flpS, st.exprTerm));
                st.exprTerm = null;
                if (tk1.type === tok_enum.NEWLINE) {
                    st.state = prs_enum.IF_BODY;
                    parser_push(pr, prs_enum.BODY);
                    return null;
                }
                else if (tok_isKS(tk1, ks_enum.ELSEIF)) {
                    st.state = prs_enum.IF2;
                    return null;
                }
                stmts.push(ast_if3(flpS));
                if (tok_isKS(tk1, ks_enum.ELSE)) {
                    st.state = prs_enum.ELSE_BODY;
                    parser_push(pr, prs_enum.BODY);
                    return null;
                }
                else if (tok_isKS(tk1, ks_enum.END)) {
                    stmts.push(ast_if4(flpS));
                    return parser_statement(pr, stmts, true);
                }
                return 'Missing newline or semicolon';
            case prs_enum.IF_BODY:
                if (tok_isKS(tk1, ks_enum.ELSEIF)) {
                    st.state = prs_enum.IF2;
                    return null;
                }
                stmts.push(ast_if3(flpS));
                if (tok_isKS(tk1, ks_enum.ELSE)) {
                    st.state = prs_enum.ELSE_BODY;
                    parser_push(pr, prs_enum.BODY);
                    return null;
                }
                else if (tok_isKS(tk1, ks_enum.END)) {
                    stmts.push(ast_if4(flpS));
                    return parser_statement(pr, stmts, true);
                }
                return 'Missing `elseif`, `else`, or `end` of if block';
            case prs_enum.ELSE_BODY:
                if (!tok_isKS(tk1, ks_enum.END))
                    return 'Missing `end` of if block';
                stmts.push(ast_if4(flpS));
                return parser_statement(pr, stmts, true);
            case prs_enum.ENUM:
                if (tk1.type === tok_enum.NEWLINE && !tk1.soft)
                    return null;
                parser_lvalues(pr, prs_enum.ENUM_LVALUES, lvm_enum.ENUM);
                return parser_process(pr, stmts);
            case prs_enum.ENUM_LVALUES:
                if (st.lvalues === null)
                    throw new Error('Parser expecting `enum` lvalues');
                if (st.lvalues.length <= 0)
                    return 'Invalid enumerator declaration';
                stmts.push(ast_enum(flpS, st.lvalues));
                st.lvalues = null;
                return parser_statement(pr, stmts, false);
            case prs_enum.INCLUDE:
                if (tk1.type === tok_enum.NEWLINE && !tk1.soft)
                    return null;
                else if (tk1.type === tok_enum.IDENT)
                    return parser_lookup(pr, flpT, prs_enum.INCLUDE_LOOKUP);
                else if (tok_isKS(tk1, ks_enum.LPAREN)) {
                    st.state = prs_enum.INCLUDE_STR;
                    return null;
                }
                else if (tok_isKS(tk1, ks_enum.PLUS)) {
                    st.names = true;
                    st.state = prs_enum.INCLUDE_LOOKUP;
                    return null;
                }
                return 'Expecting file as constant string literal';
            case prs_enum.INCLUDE_LOOKUP:
                if (!tok_isKS(tk1, ks_enum.LPAREN))
                    return 'Expecting file as constant string literal';
                st.state = prs_enum.INCLUDE_STR;
                return null;
            case prs_enum.INCLUDE_STR:
                if (tk1.type !== tok_enum.STR)
                    return 'Expecting file as constant string literal';
                st.str = tk1.str;
                st.state = prs_enum.INCLUDE_STR2;
                return null;
            case prs_enum.INCLUDE_STR2:
                if (!tok_isKS(tk1, ks_enum.RPAREN))
                    return 'Expecting file as constant string literal';
                st.state = prs_enum.INCLUDE_STR3;
                return null;
            case prs_enum.INCLUDE_STR3:
                if (st.incls === null)
                    st.incls = [];
                st.incls.push(incl_new(st.names, st.str));
                st.names = null;
                st.str = '';
                if (tok_isKS(tk1, ks_enum.COMMA)) {
                    st.state = prs_enum.INCLUDE;
                    return null;
                }
                stmts.push(ast_include(flpS, st.incls));
                st.incls = null;
                return parser_statement(pr, stmts, false);
            case prs_enum.NAMESPACE:
                if (tk1.type !== tok_enum.IDENT)
                    return 'Expecting identifier';
                return parser_lookup(pr, flpT, prs_enum.NAMESPACE_LOOKUP);
            case prs_enum.NAMESPACE_LOOKUP:
                if (tk1.type !== tok_enum.NEWLINE)
                    return 'Missing newline or semicolon';
                if (st.names === null || st.names === true)
                    throw new Error('Parser expecting `namespace` names');
                stmts.push(ast_namespace1(flpS, st.names));
                st.state = prs_enum.NAMESPACE_BODY;
                parser_push(pr, prs_enum.BODY);
                return null;
            case prs_enum.NAMESPACE_BODY:
                if (!tok_isKS(tk1, ks_enum.END))
                    return 'Missing `end` of namespace block';
                stmts.push(ast_namespace2(flpS));
                return parser_statement(pr, stmts, true);
            case prs_enum.RETURN:
                if (tk1.type === tok_enum.NEWLINE) {
                    stmts.push(ast_return(flpS, expr_nil(flpS)));
                    return parser_statement(pr, stmts, false);
                }
                parser_expr(pr, prs_enum.RETURN_DONE);
                return parser_process(pr, stmts);
            case prs_enum.RETURN_DONE:
                if (st.exprTerm === null)
                    throw new Error('Parser expecting `return` expression');
                stmts.push(ast_return(flpS, st.exprTerm));
                st.exprTerm = null;
                return parser_statement(pr, stmts, false);
            case prs_enum.USING:
                if (tk1.type === tok_enum.NEWLINE && !tk1.soft)
                    return null;
                if (tk1.type !== tok_enum.IDENT)
                    return 'Expecting identifier';
                return parser_lookup(pr, flpT, prs_enum.USING_LOOKUP);
            case prs_enum.USING_LOOKUP:
                if (st.names === null || st.names === true)
                    throw new Error('Parser expecting `using` names');
                stmts.push(ast_using(flpS, st.names));
                if (tok_isKS(tk1, ks_enum.COMMA)) {
                    st.state = prs_enum.USING;
                    return null;
                }
                return parser_statement(pr, stmts, false);
            case prs_enum.VAR:
                if (tk1.type === tok_enum.NEWLINE && !tk1.soft)
                    return null;
                parser_lvalues(pr, prs_enum.VAR_LVALUES, lvm_enum.VAR);
                return parser_process(pr, stmts);
            case prs_enum.VAR_LVALUES:
                if (st.lvalues === null)
                    throw new Error('Parser expecting `var` lvalues');
                if (st.lvalues.length <= 0)
                    return 'Invalid variable declaration';
                stmts.push(ast_var(flpS, st.lvalues));
                return parser_statement(pr, stmts, false);
            case prs_enum.IDENTS:
                if (st.names === null || st.names === true)
                    throw new Error('Parser expecting list of strings for names');
                if (st.names.length === 1 && tok_isKS(tk1, ks_enum.COLON)) {
                    stmts.push(ast_label(st.flpS, st.names[0]));
                    st.state = prs_enum.STATEMENT;
                    return null;
                }
                pr.level++;
                st.state = prs_enum.EVAL_EXPR;
                parser_push(pr, prs_enum.EXPR_POST);
                pr.state.exprTerm = expr_names(flpL, st.names);
                st.names = null;
                return parser_process(pr, stmts);
            case prs_enum.EVAL:
                parser_expr(pr, prs_enum.EVAL_EXPR);
                return parser_process(pr, stmts);
            case prs_enum.EVAL_EXPR:
                if (st.exprTerm === null)
                    throw new Error('Parser expecting expression');
                stmts.push(ast_eval(flpS, st.exprTerm));
                st.exprTerm = null;
                return parser_statement(pr, stmts, false);
            case prs_enum.EXPR:
                st.flpE = flpT;
                st.state = prs_enum.EXPR_PRE;
            case prs_enum.EXPR_PRE:
                if (tok_isPre(tk1)) {
                    st.exprPreStack = ets_new(tk1, st.exprPreStack);
                    return null;
                }
                st.state = prs_enum.EXPR_TERM;
                return parser_process(pr, stmts);
            case prs_enum.EXPR_TERM:
                if (tk1.type === tok_enum.NEWLINE && !tk1.soft)
                    return null;
                else if (tok_isKS(tk1, ks_enum.NIL)) {
                    st.state = prs_enum.EXPR_POST;
                    st.exprTerm = expr_nil(flpT);
                    return null;
                }
                else if (tk1.type === tok_enum.NUM) {
                    st.state = prs_enum.EXPR_POST;
                    st.exprTerm = expr_num(flpT, tk1.num);
                    return null;
                }
                else if (tk1.type === tok_enum.STR) {
                    st.state = prs_enum.EXPR_POST;
                    st.exprTerm = expr_str(flpT, tk1.str);
                    return null;
                }
                else if (tk1.type === tok_enum.IDENT)
                    return parser_lookup(pr, flpT, prs_enum.EXPR_TERM_LOOKUP);
                else if (tok_isKS(tk1, ks_enum.LBRACE)) {
                    st.state = prs_enum.EXPR_TERM_ISEMPTYLIST;
                    return null;
                }
                else if (tok_isKS(tk1, ks_enum.LPAREN)) {
                    parser_expr(pr, prs_enum.EXPR_TERM_CLOSEPAREN);
                    pr.state.exprAllowTrailComma = true;
                    return null;
                }
                return 'Invalid expression';
            case prs_enum.EXPR_TERM_ISEMPTYLIST:
                if (tk1.type === tok_enum.NEWLINE && !tk1.soft)
                    return null;
                else if (tok_isKS(tk1, ks_enum.RBRACE)) {
                    st.state = prs_enum.EXPR_POST;
                    st.exprTerm = expr_list(flpE, null);
                    return null;
                }
                parser_expr(pr, prs_enum.EXPR_TERM_CLOSEBRACE);
                pr.state.exprAllowTrailComma = true;
                return parser_process(pr, stmts);
            case prs_enum.EXPR_TERM_CLOSEBRACE:
                if (tk1.type === tok_enum.NEWLINE && !tk1.soft)
                    return null;
                if (!tok_isKS(tk1, ks_enum.RBRACE))
                    return 'Expecting close brace';
                st.exprTerm = expr_list(flpE, st.exprTerm);
                st.state = prs_enum.EXPR_POST;
                return null;
            case prs_enum.EXPR_TERM_CLOSEPAREN:
                if (tk1.type === tok_enum.NEWLINE && !tk1.soft)
                    return null;
                if (!tok_isKS(tk1, ks_enum.RPAREN))
                    return 'Expecting close parenthesis';
                if (st.exprTerm === null)
                    throw new Error('Parser expecting parenthesis to contain expression');
                st.exprTerm = expr_paren(st.exprTerm.flp, st.exprTerm);
                st.state = prs_enum.EXPR_POST;
                return null;
            case prs_enum.EXPR_TERM_LOOKUP:
                if (st.names === null || st.names === true)
                    throw new Error('Parser expression expecting names');
                st.exprTerm = expr_names(flpL, st.names);
                st.names = null;
                st.state = prs_enum.EXPR_POST;
                return parser_process(pr, stmts);
            case prs_enum.EXPR_POST:
                if (tk1.type === tok_enum.NEWLINE || tok_isKS(tk1, ks_enum.END) ||
                    tok_isKS(tk1, ks_enum.ELSE) || tok_isKS(tk1, ks_enum.ELSEIF)) {
                    st.state = prs_enum.EXPR_FINISH;
                    return parser_process(pr, stmts);
                }
                else if (tok_isKS(tk1, ks_enum.LBRACKET)) {
                    st.state = prs_enum.EXPR_INDEX_CHECK;
                    return null;
                }
                else if (tok_isMid(tk1, st.exprAllowComma, st.exprAllowPipe)) {
                    if (st.exprAllowTrailComma && tok_isKS(tk1, ks_enum.COMMA)) {
                        st.state = prs_enum.EXPR_COMMA;
                        return null;
                    }
                    st.state = prs_enum.EXPR_MID;
                    return parser_process(pr, stmts);
                }
                else if (tok_isKS(tk1, ks_enum.RBRACE) || tok_isKS(tk1, ks_enum.RBRACKET) ||
                    tok_isKS(tk1, ks_enum.RPAREN) || tok_isKS(tk1, ks_enum.COLON) ||
                    tok_isKS(tk1, ks_enum.COMMA) || tok_isKS(tk1, ks_enum.PIPE)) {
                    st.state = prs_enum.EXPR_FINISH;
                    return parser_process(pr, stmts);
                }
                st.exprTerm2 = st.exprTerm;
                st.exprTerm = null;
                parser_expr(pr, prs_enum.EXPR_POST_CALL);
                pr.state.exprAllowPipe = false;
                return parser_process(pr, stmts);
            case prs_enum.EXPR_POST_CALL:
                if (st.exprTerm2 === null || st.exprTerm === null)
                    throw new Error('Parser call expecting expressions');
                st.exprTerm = expr_call(st.exprTerm2.flp, st.exprTerm2, st.exprTerm);
                st.exprTerm2 = null;
                st.state = prs_enum.EXPR_POST;
                return parser_process(pr, stmts);
            case prs_enum.EXPR_INDEX_CHECK:
                if (tk1.type === tok_enum.NEWLINE && !tk1.soft)
                    return null;
                if (tok_isKS(tk1, ks_enum.COLON)) {
                    st.state = prs_enum.EXPR_INDEX_COLON_CHECK;
                    return null;
                }
                st.exprTerm2 = st.exprTerm;
                st.exprTerm = null;
                parser_expr(pr, prs_enum.EXPR_INDEX_EXPR_CHECK);
                return parser_process(pr, stmts);
            case prs_enum.EXPR_INDEX_COLON_CHECK:
                if (tk1.type === tok_enum.NEWLINE && !tk1.soft)
                    return null;
                if (tok_isKS(tk1, ks_enum.RBRACKET)) {
                    if (st.exprTerm === null)
                        throw new Error('Parser expression index expecting object for indexing');
                    st.exprTerm = expr_slice(flpT, st.exprTerm, null, null);
                    st.state = prs_enum.EXPR_POST;
                    return null;
                }
                st.exprTerm2 = st.exprTerm;
                st.exprTerm = null;
                parser_expr(pr, prs_enum.EXPR_INDEX_COLON_EXPR);
                return parser_process(pr, stmts);
            case prs_enum.EXPR_INDEX_COLON_EXPR:
                if (tk1.type === tok_enum.NEWLINE && !tk1.soft)
                    return null;
                if (!tok_isKS(tk1, ks_enum.RBRACKET))
                    return 'Missing close bracket';
                if (st.exprTerm2 === null || st.exprTerm === null)
                    throw new Error('Parser expression index expecting object for indexing');
                st.exprTerm = expr_slice(st.exprTerm.flp, st.exprTerm2, null, st.exprTerm);
                st.exprTerm2 = null;
                st.state = prs_enum.EXPR_POST;
                return null;
            case prs_enum.EXPR_INDEX_EXPR_CHECK:
                if (tk1.type === tok_enum.NEWLINE && !tk1.soft)
                    return null;
                if (tok_isKS(tk1, ks_enum.COLON)) {
                    st.state = prs_enum.EXPR_INDEX_EXPR_COLON_CHECK;
                    return null;
                }
                if (!tok_isKS(tk1, ks_enum.RBRACKET))
                    return 'Missing close bracket';
                if (st.exprTerm2 === null || st.exprTerm === null)
                    throw new Error('Parser expression index expecting object for indexing');
                st.exprTerm = expr_index(st.exprTerm.flp, st.exprTerm2, st.exprTerm);
                st.exprTerm2 = null;
                st.state = prs_enum.EXPR_POST;
                return null;
            case prs_enum.EXPR_INDEX_EXPR_COLON_CHECK:
                if (tk1.type === tok_enum.NEWLINE && !tk1.soft)
                    return null;
                if (tok_isKS(tk1, ks_enum.RBRACKET)) {
                    if (st.exprTerm === null || st.exprTerm2 === null)
                        throw new Error('Parser expression index expecting object for indexing');
                    st.exprTerm = expr_slice(st.exprTerm.flp, st.exprTerm2, st.exprTerm, null);
                    st.exprTerm2 = null;
                    st.state = prs_enum.EXPR_POST;
                    return null;
                }
                st.exprTerm3 = st.exprTerm;
                st.exprTerm = null;
                parser_expr(pr, prs_enum.EXPR_INDEX_EXPR_COLON_EXPR);
                return parser_process(pr, stmts);
            case prs_enum.EXPR_INDEX_EXPR_COLON_EXPR:
                if (tk1.type === tok_enum.NEWLINE && !tk1.soft)
                    return null;
                if (!tok_isKS(tk1, ks_enum.RBRACKET))
                    return 'Missing close bracket';
                if (st.exprTerm3 === null || st.exprTerm2 === null || st.exprTerm === null)
                    throw new Error('Parser expression index expecting expressions');
                st.exprTerm =
                    expr_slice(st.exprTerm3.flp, st.exprTerm2, st.exprTerm3, st.exprTerm);
                st.exprTerm2 = null;
                st.exprTerm3 = null;
                st.state = prs_enum.EXPR_POST;
                return null;
            case prs_enum.EXPR_COMMA:
                if (tk1.type === tok_enum.NEWLINE && !tk1.soft) {
                    parser_rev(pr);
                    pr.tkR = null;
                    return null;
                }
                if (!tok_isKS(tk1, ks_enum.RPAREN) && !tok_isKS(tk1, ks_enum.RBRACE)) {
                    st.state = prs_enum.EXPR_MID;
                    parser_rev(pr);
                    parser_process(pr, stmts);
                    if (pr.tkR === null)
                        throw new Error('Parser reverse should have set tkR');
                    parser_fwd(pr, pr.tkR);
                    return parser_process(pr, stmts);
                }
                st.state = prs_enum.EXPR_FINISH;
                return parser_process(pr, stmts);
            case prs_enum.EXPR_MID:
                if (!tok_isMid(tk1, st.exprAllowComma, st.exprAllowPipe)) {
                    st.state = prs_enum.EXPR_FINISH;
                    return parser_process(pr, stmts);
                }
                while (true) {
                    while (true) {
                        if (st.exprPreStack === null)
                            break;
                        if (tk1.type !== tok_enum.KS || st.exprPreStack === null ||
                            st.exprPreStack.tk.type !== tok_enum.KS)
                            throw new Error('Parser expression mid expecting keyword');
                        if (!tok_isPreBeforeMid(st.exprPreStack.tk, tk1))
                            break;
                        var ptk = st.exprPreStack.tk;
                        if (st.exprTerm === null)
                            throw new Error('Parser expression mid expecting expression');
                        st.exprTerm = expr_prefix(ptk.flp, ptk.k, st.exprTerm);
                        st.exprPreStack = st.exprPreStack.next;
                    }
                    if (st.exprPreStack === null && st.exprMidStack !== null &&
                        tok_isMidBeforeMid(st.exprMidStack.tk, tk1)) {
                        var mtk = st.exprMidStack.tk;
                        if (st.exprStack === null)
                            throw new Error('Parser expression mid expecting expression stack');
                        if (st.exprTerm === null)
                            throw new Error('Parser expression mid expecting expression');
                        var pri = parser_infix(mtk.flp, mtk.k, st.exprStack.ex, st.exprTerm);
                        if (!pri.ok)
                            return pri.msg;
                        st.exprTerm = pri.ex;
                        st.exprStack = st.exprStack.next;
                        if (st.exprPreStackStack === null)
                            throw new Error('Parser expression mid pre-stack-stack must be non-null');
                        st.exprPreStack = st.exprPreStackStack.e;
                        st.exprPreStackStack = st.exprPreStackStack.next;
                        st.exprMidStack = st.exprMidStack.next;
                    }
                    else
                        break;
                }
                st.exprPreStackStack = eps_new(st.exprPreStack, st.exprPreStackStack);
                st.exprPreStack = null;
                if (st.exprTerm === null)
                    throw new Error('Parser expression mid expecting expression');
                st.exprStack = exs_new(st.exprTerm, st.exprStack);
                st.exprTerm = null;
                st.exprMidStack = ets_new(tk1, st.exprMidStack);
                pr.tk1 = null;
                st.state = prs_enum.EXPR_PRE;
                return null;
            case prs_enum.EXPR_FINISH:
                while (true) {
                    while (st.exprPreStack !== null) {
                        var ptk = st.exprPreStack.tk;
                        if (st.exprTerm === null)
                            throw new Error('Parser expression end expecting expression');
                        st.exprTerm = expr_prefix(ptk.flp, ptk.k, st.exprTerm);
                        st.exprPreStack = st.exprPreStack.next;
                    }
                    if (st.exprPreStackStack !== null) {
                        st.exprPreStack = st.exprPreStackStack.e;
                        st.exprPreStackStack = st.exprPreStackStack.next;
                    }
                    while (st.exprPreStack !== null &&
                        (st.exprMidStack === null ||
                            tok_isPreBeforeMid(st.exprPreStack.tk, st.exprMidStack.tk))) {
                        var ptk = st.exprPreStack.tk;
                        if (st.exprStack === null)
                            throw new Error('Parser expression end expecting expression stack');
                        st.exprStack.ex = expr_prefix(ptk.flp, ptk.k, st.exprStack.ex);
                        st.exprPreStack = st.exprPreStack.next;
                    }
                    if (st.exprMidStack === null)
                        break;
                    var mtk = st.exprMidStack.tk;
                    if (st.exprStack === null || st.exprTerm === null)
                        throw new Error('Parser expression end expecting expression stack');
                    var pri = parser_infix(mtk.flp, mtk.k, st.exprStack.ex, st.exprTerm);
                    if (!pri.ok)
                        return pri.msg;
                    st.exprTerm = pri.ex;
                    st.exprStack = st.exprStack.next;
                    st.exprMidStack = st.exprMidStack.next;
                }
                if (st.next === null)
                    throw new Error('Parser expression expecting to return state');
                st.next.exprTerm = st.exprTerm;
                st.exprTerm = null;
                parser_pop(pr);
                return parser_process(pr, stmts);
        }
    }
    function parser_add(pr, tk, stmts) {
        parser_fwd(pr, tk);
        return parser_process(pr, stmts);
    }
    function parser_close(pr) {
        if (pr.state === null)
            throw new Error('Parser missing state');
        if (pr.state.next !== null)
            return 'Invalid end of file';
        return null;
    }
    function label_new(name) {
        return {
            name: name,
            pos: -1,
            rewrites: []
        };
    }
    function label_check(v) {
        return typeof v === 'object' && v !== null && typeof v.pos === 'number';
    }
    function label_refresh(lbl, ops, start) {
        for (var i = start; i < lbl.rewrites.length; i++) {
            var index = lbl.rewrites[i];
            ops[index + 0] = lbl.pos % 256;
            ops[index + 1] = (lbl.pos >> 8) % 256;
            ops[index + 2] = (lbl.pos >> 16) % 256;
            ops[index + 3] = (lbl.pos >> 24) % 256;
        }
    }
    function label_jump(lbl, ops) {
        op_jump(ops, 0xFFFFFFFF, lbl.name);
        lbl.rewrites.push(ops.length - 4);
        if (lbl.pos >= 0)
            label_refresh(lbl, ops, lbl.rewrites.length - 1);
    }
    function label_jumptrue(lbl, ops, src) {
        op_jumptrue(ops, src, 0xFFFFFFFF, lbl.name);
        lbl.rewrites.push(ops.length - 4);
        if (lbl.pos >= 0)
            label_refresh(lbl, ops, lbl.rewrites.length - 1);
    }
    function label_jumpfalse(lbl, ops, src) {
        op_jumpfalse(ops, src, 0xFFFFFFFF, lbl.name);
        lbl.rewrites.push(ops.length - 4);
        if (lbl.pos >= 0)
            label_refresh(lbl, ops, lbl.rewrites.length - 1);
    }
    function label_call(lbl, ops, ret, argcount) {
        op_call(ops, ret, 0xFFFFFFFF, argcount, lbl.name);
        lbl.rewrites.push(ops.length - 5);
        if (lbl.pos >= 0)
            label_refresh(lbl, ops, lbl.rewrites.length - 1);
    }
    function label_returntail(lbl, ops, argcount) {
        op_returntail(ops, 0xFFFFFFFF, argcount, lbl.name);
        lbl.rewrites.push(ops.length - 5);
        if (lbl.pos >= 0)
            label_refresh(lbl, ops, lbl.rewrites.length - 1);
    }
    function label_declare(lbl, ops) {
        lbl.pos = ops.length;
        label_refresh(lbl, ops, 0);
    }
    var frame_enum;
    (function (frame_enum) {
        frame_enum[frame_enum["VAR"] = 0] = "VAR";
        frame_enum[frame_enum["TEMP_INUSE"] = 1] = "TEMP_INUSE";
        frame_enum[frame_enum["TEMP_AVAIL"] = 2] = "TEMP_AVAIL";
    })(frame_enum || (frame_enum = {}));
    function frame_new(parent) {
        return {
            vars: [],
            lbls: [],
            parent: parent,
            level: parent !== null ? parent.level + 1 : 0
        };
    }
    var nsname_enumt;
    (function (nsname_enumt) {
        nsname_enumt[nsname_enumt["VAR"] = 0] = "VAR";
        nsname_enumt[nsname_enumt["ENUM"] = 1] = "ENUM";
        nsname_enumt[nsname_enumt["CMD_LOCAL"] = 2] = "CMD_LOCAL";
        nsname_enumt[nsname_enumt["CMD_NATIVE"] = 3] = "CMD_NATIVE";
        nsname_enumt[nsname_enumt["CMD_OPCODE"] = 4] = "CMD_OPCODE";
        nsname_enumt[nsname_enumt["NAMESPACE"] = 5] = "NAMESPACE";
    })(nsname_enumt || (nsname_enumt = {}));
    function nsname_var(name, fr, index) {
        return {
            name: name,
            type: nsname_enumt.VAR,
            fr: fr,
            index: index
        };
    }
    function nsname_enum(name, val) {
        return {
            name: name,
            type: nsname_enumt.ENUM,
            val: val
        };
    }
    function nsname_cmdLocal(name, fr, lbl) {
        return {
            name: name,
            type: nsname_enumt.CMD_LOCAL,
            fr: fr,
            lbl: lbl
        };
    }
    function nsname_cmdNative(name, hash) {
        return {
            name: name,
            type: nsname_enumt.CMD_NATIVE,
            hash: hash
        };
    }
    function nsname_cmdOpcode(name, opcode, params) {
        return {
            name: name,
            type: nsname_enumt.CMD_OPCODE,
            opcode: opcode,
            params: params
        };
    }
    function nsname_namespace(name, ns) {
        return {
            name: name,
            type: nsname_enumt.NAMESPACE,
            ns: ns
        };
    }
    function namespace_new(fr) {
        return {
            fr: fr,
            usings: [],
            names: []
        };
    }
    function nl_found(nsn) {
        return { found: true, nsn: nsn };
    }
    function nl_notfound() {
        return { found: false };
    }
    function namespace_lookupLevel(ns, names, start, tried) {
        for (var nsni = 0; nsni < ns.names.length; nsni++) {
            var nsn = ns.names[nsni];
            if (nsn.name === names[start]) {
                if (start === names.length - 1)
                    return nl_found(nsn);
                if (nsn.type === nsname_enumt.NAMESPACE)
                    return namespace_lookup(nsn.ns, names, start + 1, tried);
                return nl_notfound();
            }
        }
        return nl_notfound();
    }
    function namespace_getSiblings(ns, res, tried) {
        if (res.indexOf(ns) >= 0)
            return;
        res.push(ns);
        for (var i = 0; i < ns.usings.length; i++) {
            var uns = ns.usings[i];
            if (tried.indexOf(uns) >= 0)
                continue;
            namespace_getSiblings(uns, res, tried);
        }
    }
    function namespace_lookup(ns, names, start, tried) {
        if (tried.indexOf(ns) >= 0)
            return nl_notfound();
        tried.push(ns);
        var allns = [];
        namespace_getSiblings(ns, allns, tried);
        for (var i = 0; i < allns.length; i++) {
            var hns = allns[i];
            var n = namespace_lookupLevel(hns, names, start, tried);
            if (n.found)
                return n;
        }
        return nl_notfound();
    }
    function namespace_lookupImmediate(ns, names) {
        for (var ni = 0; ni < names.length; ni++) {
            var name_1 = names[ni];
            var found = false;
            for (var nsni = 0; nsni < ns.names.length; nsni++) {
                var nsn = ns.names[nsni];
                if (nsn.name === name_1) {
                    if (ni === names.length - 1)
                        return nl_found(nsn);
                    if (nsn.type !== nsname_enumt.NAMESPACE)
                        return nl_notfound();
                    ns = nsn.ns;
                    found = true;
                    break;
                }
            }
            if (!found)
                return nl_notfound();
        }
        return nl_notfound();
    }
    function scope_new(fr, lblBreak, lblContinue, parent) {
        var ns = namespace_new(fr);
        return {
            ns: ns,
            nsStack: [ns],
            lblBreak: lblBreak,
            lblContinue: lblContinue,
            parent: parent
        };
    }
    function symtbl_new(repl) {
        var fr = frame_new(null);
        return {
            fr: fr,
            sc: scope_new(fr, null, null, null),
            repl: repl
        };
    }
    function sfn_ok(ns) {
        return { ok: true, ns: ns };
    }
    function sfn_error(msg) {
        return { ok: false, msg: msg };
    }
    function symtbl_findNamespace(sym, names, max) {
        var ns = sym.sc.ns;
        for (var ni = 0; ni < max; ni++) {
            var name_2 = names[ni];
            var found = false;
            for (var i = 0; i < ns.names.length; i++) {
                var nsn = ns.names[i];
                if (nsn.name === name_2) {
                    if (nsn.type !== nsname_enumt.NAMESPACE) {
                        if (!sym.repl)
                            return sfn_error('Not a namespace: "' + nsn.name + '"');
                        nsn = ns.names[i] = nsname_namespace(nsn.name, namespace_new(ns.fr));
                    }
                    if (nsn.type !== nsname_enumt.NAMESPACE)
                        throw new Error('Symtbl namespace required');
                    ns = nsn.ns;
                    found = true;
                    break;
                }
            }
            if (!found) {
                var nns = namespace_new(ns.fr);
                ns.names.push(nsname_namespace(name_2, nns));
                ns = nns;
            }
        }
        return sfn_ok(ns);
    }
    function symtbl_pushNamespace(sym, names) {
        var ns;
        if (names === true) {
            var nsp = sym.sc.ns;
            ns = namespace_new(nsp.fr);
            nsp.names.push(nsname_namespace('.', ns));
            nsp.usings.push(ns);
        }
        else {
            var nsr = symtbl_findNamespace(sym, names, names.length);
            if (!nsr.ok)
                return nsr.msg;
            ns = nsr.ns;
        }
        sym.sc.nsStack.push(ns);
        sym.sc.ns = ns;
        return null;
    }
    function symtbl_popNamespace(sym) {
        sym.sc.nsStack.pop();
        sym.sc.ns = sym.sc.nsStack[sym.sc.nsStack.length - 1];
    }
    function symtbl_pushScope(sym) {
        sym.sc = scope_new(sym.fr, sym.sc.lblBreak, sym.sc.lblContinue, sym.sc);
    }
    function symtbl_popScope(sym) {
        if (sym.sc.parent === null)
            throw new Error('Cannot pop last scope');
        sym.sc = sym.sc.parent;
    }
    function symtbl_pushFrame(sym) {
        sym.fr = frame_new(sym.fr);
        sym.sc = scope_new(sym.fr, null, null, sym.sc);
    }
    function symtbl_popFrame(sym) {
        if (sym.sc.parent === null || sym.fr.parent === null)
            throw new Error('Cannot pop last frame');
        sym.sc = sym.sc.parent;
        sym.fr = sym.fr.parent;
    }
    function stl_ok(nsn) {
        return { ok: true, nsn: nsn };
    }
    function stl_error(msg) {
        return { ok: false, msg: msg };
    }
    function symtbl_lookupfast(sym, names) {
        var tried = [];
        var trysc = sym.sc;
        while (trysc !== null) {
            for (var trynsi = trysc.nsStack.length - 1; trynsi >= 0; trynsi--) {
                var tryns = trysc.nsStack[trynsi];
                var n = namespace_lookup(tryns, names, 0, tried);
                if (n.found)
                    return stl_ok(n.nsn);
            }
            trysc = trysc.parent;
        }
        return stl_error('');
    }
    function symtbl_lookup(sym, names) {
        var res = symtbl_lookupfast(sym, names);
        if (!res.ok)
            res.msg = 'Not found: ' + names.join('.');
        return res;
    }
    function sta_ok(vlc) {
        return { ok: true, vlc: vlc };
    }
    function sta_error(msg) {
        return { ok: false, msg: msg };
    }
    function symtbl_addTemp(sym) {
        for (var i = 0; i < sym.fr.vars.length; i++) {
            if (sym.fr.vars[i] === frame_enum.TEMP_AVAIL) {
                sym.fr.vars[i] = frame_enum.TEMP_INUSE;
                return sta_ok(varloc_new(sym.fr.level, i));
            }
        }
        if (sym.fr.vars.length >= 256)
            return sta_error('Too many variables in frame');
        sym.fr.vars.push(frame_enum.TEMP_INUSE);
        return sta_ok(varloc_new(sym.fr.level, sym.fr.vars.length - 1));
    }
    function symtbl_clearTemp(sym, vlc) {
        if (varloc_isnull(vlc))
            throw new Error('Cannot clear a null variable');
        if (vlc.frame === sym.fr.level && sym.fr.vars[vlc.index] === frame_enum.TEMP_INUSE)
            sym.fr.vars[vlc.index] = frame_enum.TEMP_AVAIL;
    }
    function symtbl_tempAvail(sym) {
        var cnt = 256 - sym.fr.vars.length;
        for (var i = 0; i < sym.fr.vars.length; i++) {
            if (sym.fr.vars[i] === frame_enum.TEMP_AVAIL)
                cnt++;
        }
        return cnt;
    }
    function symtbl_addVar(sym, names, slot) {
        var nsr = symtbl_findNamespace(sym, names, names.length - 1);
        if (!nsr.ok)
            return sta_error(nsr.msg);
        var ns = nsr.ns;
        for (var i = 0; i < ns.names.length; i++) {
            var nsn = ns.names[i];
            if (nsn.name === names[names.length - 1]) {
                if (!sym.repl)
                    return sta_error('Cannot redefine "' + nsn.name + '"');
                if (nsn.type === nsname_enumt.VAR)
                    return sta_ok(varloc_new(nsn.fr.level, nsn.index));
                if (slot < 0) {
                    slot = sym.fr.vars.length;
                    sym.fr.vars.push(frame_enum.VAR);
                }
                if (slot >= 256)
                    return sta_error('Too many variables in frame');
                ns.names[i] = nsname_var(names[names.length - 1], sym.fr, slot);
                return sta_ok(varloc_new(sym.fr.level, slot));
            }
        }
        if (slot < 0) {
            slot = sym.fr.vars.length;
            sym.fr.vars.push(frame_enum.VAR);
        }
        if (slot >= 256)
            return sta_error('Too many variables in frame');
        ns.names.push(nsname_var(names[names.length - 1], sym.fr, slot));
        return sta_ok(varloc_new(sym.fr.level, slot));
    }
    function symtbl_addEnum(sym, names, val) {
        var nsr = symtbl_findNamespace(sym, names, names.length - 1);
        if (!nsr.ok)
            return nsr.msg;
        var ns = nsr.ns;
        for (var i = 0; i < ns.names.length; i++) {
            var nsn = ns.names[i];
            if (nsn.name === names[names.length - 1]) {
                if (!sym.repl)
                    return 'Cannot redefine "' + nsn.name + '"';
                ns.names[i] = nsname_enum(names[names.length - 1], val);
                return null;
            }
        }
        ns.names.push(nsname_enum(names[names.length - 1], val));
        return null;
    }
    function symtbl_reserveVars(sym, count) {
        for (var i = 0; i < count; i++)
            sym.fr.vars.push(frame_enum.VAR);
    }
    function symtbl_addCmdLocal(sym, names, lbl) {
        var nsr = symtbl_findNamespace(sym, names, names.length - 1);
        if (!nsr.ok)
            return nsr.msg;
        var ns = nsr.ns;
        for (var i = 0; i < ns.names.length; i++) {
            var nsn = ns.names[i];
            if (nsn.name === names[names.length - 1]) {
                if (!sym.repl)
                    return 'Cannot redefine "' + nsn.name + '"';
                ns.names[i] = nsname_cmdLocal(names[names.length - 1], sym.fr, lbl);
                return null;
            }
        }
        ns.names.push(nsname_cmdLocal(names[names.length - 1], sym.fr, lbl));
        return null;
    }
    function symtbl_addCmdNative(sym, names, hash) {
        var nsr = symtbl_findNamespace(sym, names, names.length - 1);
        if (!nsr.ok)
            return nsr.msg;
        var ns = nsr.ns;
        for (var i = 0; i < ns.names.length; i++) {
            var nsn = ns.names[i];
            if (nsn.name === names[names.length - 1]) {
                if (!sym.repl)
                    return 'Cannot redefine "' + nsn.name + '"';
                ns.names[i] = nsname_cmdNative(names[names.length - 1], hash);
                return null;
            }
        }
        ns.names.push(nsname_cmdNative(names[names.length - 1], hash));
        return null;
    }
    function SAC(sym, name, opcode, params) {
        sym.sc.ns.names.push(nsname_cmdOpcode(name, opcode, params));
    }
    function SAE(sym, name, val) {
        sym.sc.ns.names.push(nsname_enum(name, val));
    }
    var struct_enum;
    (function (struct_enum) {
        struct_enum[struct_enum["U8"] = 1] = "U8";
        struct_enum[struct_enum["U16"] = 2] = "U16";
        struct_enum[struct_enum["UL16"] = 3] = "UL16";
        struct_enum[struct_enum["UB16"] = 4] = "UB16";
        struct_enum[struct_enum["U32"] = 5] = "U32";
        struct_enum[struct_enum["UL32"] = 6] = "UL32";
        struct_enum[struct_enum["UB32"] = 7] = "UB32";
        struct_enum[struct_enum["S8"] = 8] = "S8";
        struct_enum[struct_enum["S16"] = 9] = "S16";
        struct_enum[struct_enum["SL16"] = 10] = "SL16";
        struct_enum[struct_enum["SB16"] = 11] = "SB16";
        struct_enum[struct_enum["S32"] = 12] = "S32";
        struct_enum[struct_enum["SL32"] = 13] = "SL32";
        struct_enum[struct_enum["SB32"] = 14] = "SB32";
        struct_enum[struct_enum["F32"] = 15] = "F32";
        struct_enum[struct_enum["FL32"] = 16] = "FL32";
        struct_enum[struct_enum["FB32"] = 17] = "FB32";
        struct_enum[struct_enum["F64"] = 18] = "F64";
        struct_enum[struct_enum["FL64"] = 19] = "FL64";
        struct_enum[struct_enum["FB64"] = 20] = "FB64";
    })(struct_enum || (struct_enum = {}));
    function symtbl_loadStdlib(sym) {
        SAC(sym, 'say', op_enum.SAY, -1);
        SAC(sym, 'warn', op_enum.WARN, -1);
        SAC(sym, 'ask', op_enum.ASK, -1);
        SAC(sym, 'exit', op_enum.EXIT, -1);
        SAC(sym, 'abort', op_enum.ABORT, -1);
        SAC(sym, 'isnum', op_enum.ISNUM, 1);
        SAC(sym, 'isstr', op_enum.ISSTR, 1);
        SAC(sym, 'islist', op_enum.ISLIST, 1);
        SAC(sym, 'range', op_enum.RANGE, 3);
        SAC(sym, 'order', op_enum.ORDER, 2);
        SAC(sym, 'pick', op_enum.PICK, 3);
        SAC(sym, 'embed', op_enum.EMBED, 1);
        SAC(sym, 'stacktrace', op_enum.STACKTRACE, 0);
        symtbl_pushNamespace(sym, ['num']);
        SAC(sym, 'abs', op_enum.NUM_ABS, 1);
        SAC(sym, 'sign', op_enum.NUM_SIGN, 1);
        SAC(sym, 'max', op_enum.NUM_MAX, -1);
        SAC(sym, 'min', op_enum.NUM_MIN, -1);
        SAC(sym, 'clamp', op_enum.NUM_CLAMP, 3);
        SAC(sym, 'floor', op_enum.NUM_FLOOR, 1);
        SAC(sym, 'ceil', op_enum.NUM_CEIL, 1);
        SAC(sym, 'round', op_enum.NUM_ROUND, 1);
        SAC(sym, 'trunc', op_enum.NUM_TRUNC, 1);
        SAC(sym, 'nan', op_enum.NUM_NAN, 0);
        SAC(sym, 'inf', op_enum.NUM_INF, 0);
        SAC(sym, 'isnan', op_enum.NUM_ISNAN, 1);
        SAC(sym, 'isfinite', op_enum.NUM_ISFINITE, 1);
        SAE(sym, 'e', num_e());
        SAE(sym, 'pi', num_pi());
        SAE(sym, 'tau', num_tau());
        SAC(sym, 'sin', op_enum.NUM_SIN, 1);
        SAC(sym, 'cos', op_enum.NUM_COS, 1);
        SAC(sym, 'tan', op_enum.NUM_TAN, 1);
        SAC(sym, 'asin', op_enum.NUM_ASIN, 1);
        SAC(sym, 'acos', op_enum.NUM_ACOS, 1);
        SAC(sym, 'atan', op_enum.NUM_ATAN, 1);
        SAC(sym, 'atan2', op_enum.NUM_ATAN2, 2);
        SAC(sym, 'log', op_enum.NUM_LOG, 1);
        SAC(sym, 'log2', op_enum.NUM_LOG2, 1);
        SAC(sym, 'log10', op_enum.NUM_LOG10, 1);
        SAC(sym, 'exp', op_enum.NUM_EXP, 1);
        SAC(sym, 'lerp', op_enum.NUM_LERP, 3);
        SAC(sym, 'hex', op_enum.NUM_HEX, 2);
        SAC(sym, 'oct', op_enum.NUM_OCT, 2);
        SAC(sym, 'bin', op_enum.NUM_BIN, 2);
        symtbl_popNamespace(sym);
        symtbl_pushNamespace(sym, ['int']);
        SAC(sym, 'new', op_enum.INT_NEW, 1);
        SAC(sym, 'not', op_enum.INT_NOT, 1);
        SAC(sym, 'and', op_enum.INT_AND, -1);
        SAC(sym, 'or', op_enum.INT_OR, -1);
        SAC(sym, 'xor', op_enum.INT_XOR, -1);
        SAC(sym, 'shl', op_enum.INT_SHL, 2);
        SAC(sym, 'shr', op_enum.INT_SHR, 2);
        SAC(sym, 'sar', op_enum.INT_SAR, 2);
        SAC(sym, 'add', op_enum.INT_ADD, 2);
        SAC(sym, 'sub', op_enum.INT_SUB, 2);
        SAC(sym, 'mul', op_enum.INT_MUL, 2);
        SAC(sym, 'div', op_enum.INT_DIV, 2);
        SAC(sym, 'mod', op_enum.INT_MOD, 2);
        SAC(sym, 'clz', op_enum.INT_CLZ, 1);
        SAC(sym, 'pop', op_enum.INT_POP, 1);
        SAC(sym, 'bswap', op_enum.INT_BSWAP, 1);
        symtbl_popNamespace(sym);
        symtbl_pushNamespace(sym, ['rand']);
        SAC(sym, 'seed', op_enum.RAND_SEED, 1);
        SAC(sym, 'seedauto', op_enum.RAND_SEEDAUTO, 0);
        SAC(sym, 'int', op_enum.RAND_INT, 0);
        SAC(sym, 'num', op_enum.RAND_NUM, 0);
        SAC(sym, 'getstate', op_enum.RAND_GETSTATE, 0);
        SAC(sym, 'setstate', op_enum.RAND_SETSTATE, 1);
        SAC(sym, 'pick', op_enum.RAND_PICK, 1);
        SAC(sym, 'shuffle', op_enum.RAND_SHUFFLE, 1);
        symtbl_popNamespace(sym);
        symtbl_pushNamespace(sym, ['str']);
        SAC(sym, 'new', op_enum.STR_NEW, -1);
        SAC(sym, 'split', op_enum.STR_SPLIT, 2);
        SAC(sym, 'replace', op_enum.STR_REPLACE, 3);
        SAC(sym, 'begins', op_enum.STR_BEGINS, 2);
        SAC(sym, 'ends', op_enum.STR_ENDS, 2);
        SAC(sym, 'pad', op_enum.STR_PAD, 2);
        SAC(sym, 'find', op_enum.STR_FIND, 3);
        SAC(sym, 'rfind', op_enum.STR_RFIND, 3);
        SAC(sym, 'lower', op_enum.STR_LOWER, 1);
        SAC(sym, 'upper', op_enum.STR_UPPER, 1);
        SAC(sym, 'trim', op_enum.STR_TRIM, 1);
        SAC(sym, 'rev', op_enum.STR_REV, 1);
        SAC(sym, 'rep', op_enum.STR_REP, 2);
        SAC(sym, 'list', op_enum.STR_LIST, 1);
        SAC(sym, 'byte', op_enum.STR_BYTE, 2);
        SAC(sym, 'hash', op_enum.STR_HASH, 2);
        symtbl_popNamespace(sym);
        symtbl_pushNamespace(sym, ['utf8']);
        SAC(sym, 'valid', op_enum.UTF8_VALID, 1);
        SAC(sym, 'list', op_enum.UTF8_LIST, 1);
        SAC(sym, 'str', op_enum.UTF8_STR, 1);
        symtbl_popNamespace(sym);
        symtbl_pushNamespace(sym, ['struct']);
        SAC(sym, 'size', op_enum.STRUCT_SIZE, 1);
        SAC(sym, 'str', op_enum.STRUCT_STR, 2);
        SAC(sym, 'list', op_enum.STRUCT_LIST, 2);
        SAC(sym, 'isLE', op_enum.STRUCT_ISLE, 0);
        SAE(sym, 'U8', struct_enum.U8);
        SAE(sym, 'U16', struct_enum.U16);
        SAE(sym, 'UL16', struct_enum.UL16);
        SAE(sym, 'UB16', struct_enum.UB16);
        SAE(sym, 'U32', struct_enum.U32);
        SAE(sym, 'UL32', struct_enum.UL32);
        SAE(sym, 'UB32', struct_enum.UB32);
        SAE(sym, 'S8', struct_enum.S8);
        SAE(sym, 'S16', struct_enum.S16);
        SAE(sym, 'SL16', struct_enum.SL16);
        SAE(sym, 'SB16', struct_enum.SB16);
        SAE(sym, 'S32', struct_enum.S32);
        SAE(sym, 'SL32', struct_enum.SL32);
        SAE(sym, 'SB32', struct_enum.SB32);
        SAE(sym, 'F32', struct_enum.F32);
        SAE(sym, 'FL32', struct_enum.FL32);
        SAE(sym, 'FB32', struct_enum.FB32);
        SAE(sym, 'F64', struct_enum.F64);
        SAE(sym, 'FL64', struct_enum.FL64);
        SAE(sym, 'FB64', struct_enum.FB64);
        symtbl_popNamespace(sym);
        symtbl_pushNamespace(sym, ['list']);
        SAC(sym, 'new', op_enum.LIST_NEW, 2);
        SAC(sym, 'shift', op_enum.LIST_SHIFT, 1);
        SAC(sym, 'pop', op_enum.LIST_POP, 1);
        SAC(sym, 'push', op_enum.LIST_PUSH, 2);
        SAC(sym, 'unshift', op_enum.LIST_UNSHIFT, 2);
        SAC(sym, 'append', op_enum.LIST_APPEND, 2);
        SAC(sym, 'prepend', op_enum.LIST_PREPEND, 2);
        SAC(sym, 'find', op_enum.LIST_FIND, 3);
        SAC(sym, 'rfind', op_enum.LIST_RFIND, 3);
        SAC(sym, 'join', op_enum.LIST_JOIN, 2);
        SAC(sym, 'rev', op_enum.LIST_REV, 1);
        SAC(sym, 'str', op_enum.LIST_STR, 1);
        SAC(sym, 'sort', op_enum.LIST_SORT, 1);
        SAC(sym, 'rsort', op_enum.LIST_RSORT, 1);
        symtbl_popNamespace(sym);
        symtbl_pushNamespace(sym, ['pickle']);
        SAC(sym, 'json', op_enum.PICKLE_JSON, 1);
        SAC(sym, 'bin', op_enum.PICKLE_BIN, 1);
        SAC(sym, 'val', op_enum.PICKLE_VAL, 1);
        SAC(sym, 'valid', op_enum.PICKLE_VALID, 1);
        SAC(sym, 'sibling', op_enum.PICKLE_SIBLING, 1);
        SAC(sym, 'circular', op_enum.PICKLE_CIRCULAR, 1);
        SAC(sym, 'copy', op_enum.PICKLE_COPY, 1);
        symtbl_popNamespace(sym);
        symtbl_pushNamespace(sym, ['gc']);
        SAC(sym, 'getlevel', op_enum.GC_GETLEVEL, 0);
        SAC(sym, 'setlevel', op_enum.GC_SETLEVEL, 1);
        SAC(sym, 'run', op_enum.GC_RUN, 0);
        SAE(sym, 'NONE', gc_level.NONE);
        SAE(sym, 'DEFAULT', gc_level.DEFAULT);
        SAE(sym, 'LOWMEM', gc_level.LOWMEM);
        symtbl_popNamespace(sym);
    }
    var bis_enum;
    (function (bis_enum) {
        bis_enum[bis_enum["HEADER"] = 0] = "HEADER";
        bis_enum[bis_enum["STR_HEAD"] = 1] = "STR_HEAD";
        bis_enum[bis_enum["STR_BODY"] = 2] = "STR_BODY";
        bis_enum[bis_enum["KEY"] = 3] = "KEY";
        bis_enum[bis_enum["DEBUG_HEAD"] = 4] = "DEBUG_HEAD";
        bis_enum[bis_enum["DEBUG_BODY"] = 5] = "DEBUG_BODY";
        bis_enum[bis_enum["POS"] = 6] = "POS";
        bis_enum[bis_enum["CMD"] = 7] = "CMD";
        bis_enum[bis_enum["OPS"] = 8] = "OPS";
        bis_enum[bis_enum["DONE"] = 9] = "DONE";
    })(bis_enum || (bis_enum = {}));
    var scriptmode_enum;
    (function (scriptmode_enum) {
        scriptmode_enum[scriptmode_enum["UNKNOWN"] = 0] = "UNKNOWN";
        scriptmode_enum[scriptmode_enum["BINARY"] = 1] = "BINARY";
        scriptmode_enum[scriptmode_enum["TEXT"] = 2] = "TEXT";
    })(scriptmode_enum || (scriptmode_enum = {}));
    function scr_setuser(scr, user) {
        scr.user = user;
    }
    exports.scr_setuser = scr_setuser;
    function scr_getuser(scr) {
        return scr.user;
    }
    exports.scr_getuser = scr_getuser;
    function pathjoin(prev, next, posix) {
        var p;
        if (posix)
            p = (prev + '/' + next).split('/');
        else
            p = (prev + '\\' + next).split(/\\|\//g);
        var ret = [];
        for (var i = 0; i < p.length; i++) {
            if ((i !== 0 && p[i] === '') || p[i] === '.')
                continue;
            if (p[i] === '..')
                ret.pop();
            else
                ret.push(p[i]);
        }
        return ret.join(posix ? '/' : '\\');
    }
    function fileres_try(scr, postfix, file, f_begin, f_end, fuser) {
        return __awaiter(this, void 0, void 0, function () {
            var inc, fst, _a, readRes;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        inc = scr.inc;
                        return [4, inc.f_fstype(scr, file, inc.user)];
                    case 1:
                        fst = _b.sent();
                        _a = fst;
                        switch (_a) {
                            case fstype.FILE: return [3, 2];
                            case fstype.NONE: return [3, 6];
                            case fstype.DIR: return [3, 7];
                        }
                        return [3, 8];
                    case 2:
                        if (!f_begin(file, fuser)) return [3, 5];
                        return [4, inc.f_fsread(scr, file, inc.user)];
                    case 3:
                        readRes = _b.sent();
                        return [4, f_end(readRes, file, fuser)];
                    case 4:
                        _b.sent();
                        _b.label = 5;
                    case 5: return [2, true];
                    case 6:
                        if (!postfix)
                            return [2, false];
                        if (file.substr(-5) === '.sink')
                            return [2, false];
                        return [2, fileres_try(scr, false, file + '.sink', f_begin, f_end, fuser)];
                    case 7:
                        if (!postfix)
                            return [2, false];
                        return [2, fileres_try(scr, false, pathjoin(file, 'index.sink', scr.posix), f_begin, f_end, fuser)];
                    case 8: throw new Error('Bad file type');
                }
            });
        });
    }
    function isabs(file, posix) {
        return (posix && file.charAt(0) == '/') ||
            (!posix && (file.charAt(1) == ':' || (file.charAt(0) == '/' && file.charAt(1) == '/')));
    }
    function fileres_read(scr, postfix, file, cwd, f_begin, f_end, fuser) {
        return __awaiter(this, void 0, void 0, function () {
            var paths, i, path, join, found;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (isabs(file, scr.posix))
                            return [2, fileres_try(scr, postfix, file, f_begin, f_end, fuser)];
                        if (cwd === null)
                            cwd = scr.curdir;
                        paths = scr.paths;
                        i = 0;
                        _a.label = 1;
                    case 1:
                        if (!(i < paths.length)) return [3, 4];
                        path = paths[i];
                        join = void 0;
                        if (isabs(path, scr.posix))
                            join = pathjoin(path, file, scr.posix);
                        else {
                            if (cwd === null)
                                return [3, 3];
                            join = pathjoin(pathjoin(cwd, path, scr.posix), file, scr.posix);
                        }
                        return [4, fileres_try(scr, postfix, join, f_begin, f_end, fuser)];
                    case 2:
                        found = _a.sent();
                        if (found)
                            return [2, true];
                        _a.label = 3;
                    case 3:
                        i++;
                        return [3, 1];
                    case 4: return [2, false];
                }
            });
        });
    }
    function program_new(posix, repl) {
        return {
            strTable: [],
            keyTable: [],
            debugTable: [],
            posTable: [],
            cmdTable: [],
            ops: [],
            posix: posix,
            repl: repl
        };
    }
    function program_adddebugstr(prg, str) {
        for (var i = 0; i < prg.debugTable.length; i++) {
            if (prg.debugTable[i] === str)
                return i;
        }
        prg.debugTable.push(str);
        return prg.debugTable.length - 1;
    }
    function program_addfile(prg, str) {
        if (str === null)
            return -1;
        var i = str.lastIndexOf('/');
        if (!prg.posix)
            i = Math.max(i, str.lastIndexOf('\\'));
        if (i >= 0)
            str = str.substr(i + 1);
        return program_adddebugstr(prg, str);
    }
    function program_getdebugstr(prg, str) {
        return str < 0 || str >= prg.debugTable.length ? '' : prg.debugTable[str];
    }
    function program_errormsg(prg, flp, msg) {
        if (msg === null) {
            if (flp.basefile < 0)
                return flp.line + ':' + flp.chr;
            return program_getdebugstr(prg, flp.basefile) + ':' + flp.line + ':' + flp.chr;
        }
        if (flp.basefile < 0)
            return flp.line + ':' + flp.chr + ': ' + msg;
        return program_getdebugstr(prg, flp.basefile) + ':' + flp.line + ':' + flp.chr + ': ' + msg;
    }
    function program_validate(prg) {
        var pc = 0;
        var level = 0;
        var wasjump = false;
        var jumploc = 0;
        var jumplocs = [];
        for (var i = 0; i < 256; i++)
            jumplocs.push(0);
        var ops = prg.ops;
        var A = 0, B = 0, C = 0, D = 0;
        var op_actual = [];
        for (var i = 0; i < ops.length; i++)
            op_actual.push(0);
        var op_need = [];
        for (var i = 0; i < ops.length; i++)
            op_need.push(0);
        var goto_fail = false;
        function READVAR() {
            if (pc + 2 > ops.length) {
                goto_fail = true;
                return;
            }
            A = ops[pc++];
            B = ops[pc++];
            if (A > level) {
                goto_fail = true;
                return;
            }
        }
        function READLOC(L) {
            if (pc + 4 > ops.length) {
                goto_fail = true;
                return;
            }
            A = ops[pc++];
            B = ops[pc++];
            C = ops[pc++];
            D = ops[pc++];
            jumploc = A + (B << 8) + (C << 16) + ((D << 23) * 2);
            if (jumploc < 0 || jumploc >= 0x80000000) {
                goto_fail = true;
                return;
            }
            if (jumploc < ops.length)
                op_need[jumploc] = L;
        }
        function READDATA(S) {
            if (pc + S > ops.length) {
                goto_fail = true;
                return;
            }
            pc += S;
        }
        function READCNT() {
            if (pc + 1 > ops.length) {
                goto_fail = true;
                return;
            }
            C = ops[pc++];
            for (D = 0; D < C && !goto_fail; D++)
                READVAR();
        }
        function READINDEX() {
            if (pc + 4 > ops.length) {
                goto_fail = true;
                return;
            }
            A = ops[pc++];
            B = ops[pc++];
            C = ops[pc++];
            D = ops[pc++];
            A = A + (B << 8) + (C << 16) + ((D << 23) * 2);
        }
        while (pc < ops.length) {
            op_actual[pc] = 1;
            var opc = op_paramcat(ops[pc++]);
            switch (opc) {
                case op_pcat.INVALID: return false;
                case op_pcat.STR:
                    {
                        READVAR();
                        READINDEX();
                        if (A < 0 || A >= prg.strTable.length)
                            return false;
                    }
                    break;
                case op_pcat.CMDHEAD:
                    {
                        if (!wasjump)
                            return false;
                        if (pc + 2 > ops.length)
                            return false;
                        op_actual[pc - 1] = 2;
                        if (level > 255)
                            return false;
                        jumplocs[level++] = jumploc;
                        A = ops[pc++];
                        B = ops[pc++];
                        if (A !== level)
                            return false;
                    }
                    break;
                case op_pcat.CMDTAIL:
                    {
                        if (level <= 0)
                            return false;
                        if (jumplocs[--level] !== pc)
                            return false;
                    }
                    break;
                case op_pcat.JUMP:
                    {
                        READLOC(1);
                    }
                    break;
                case op_pcat.VJUMP:
                    {
                        READVAR();
                        READLOC(1);
                    }
                    break;
                case op_pcat.CALL:
                    {
                        READVAR();
                        READLOC(2);
                        READCNT();
                    }
                    break;
                case op_pcat.NATIVE:
                    {
                        READVAR();
                        READINDEX();
                        if (A < 0 || A >= prg.keyTable.length)
                            return false;
                        READCNT();
                    }
                    break;
                case op_pcat.RETURNTAIL:
                    {
                        READLOC(2);
                        READCNT();
                        if (jumploc < ops.length - 1) {
                            if (ops[jumploc] !== op_enum.CMDHEAD || ops[jumploc + 1] !== level)
                                return false;
                        }
                    }
                    break;
                case op_pcat.VVVV:
                    READVAR();
                case op_pcat.VVV:
                    READVAR();
                case op_pcat.VV:
                    READVAR();
                case op_pcat.V:
                    READVAR();
                case op_pcat.EMPTY:
                    break;
                case op_pcat.VA:
                    {
                        READVAR();
                        READCNT();
                    }
                    break;
                case op_pcat.VN:
                    {
                        READVAR();
                        READDATA(1);
                    }
                    break;
                case op_pcat.VNN:
                    {
                        READVAR();
                        READDATA(2);
                    }
                    break;
                case op_pcat.VNNNN:
                    {
                        READVAR();
                        READDATA(4);
                    }
                    break;
                case op_pcat.VNNNNNNNN:
                    {
                        READVAR();
                        READDATA(8);
                    }
                    break;
            }
            if (goto_fail)
                return false;
            wasjump = opc === op_pcat.JUMP;
        }
        for (var i = 0; i < ops.length; i++) {
            if (op_need[i] !== 0 && op_need[i] !== op_actual[i])
                return false;
        }
        return true;
    }
    function program_flp(prg, flp) {
        var i = prg.posTable.length - 1;
        if (i >= 0) {
            var p_1 = prg.posTable[i];
            if (p_1.pc === prg.ops.length) {
                p_1.flp = flp;
                return;
            }
        }
        var p = { pc: prg.ops.length, flp: flp };
        prg.posTable.push(p);
    }
    function program_cmdhint(prg, names) {
        var p = { pc: prg.ops.length, cmdhint: -1 };
        if (names !== null)
            p.cmdhint = program_adddebugstr(prg, names.join('.'));
        prg.cmdTable.push(p);
    }
    function per_ok(vlc) {
        return { ok: true, vlc: vlc };
    }
    function per_error(flp, msg) {
        return { ok: false, flp: flp, msg: msg };
    }
    var pem_enum;
    (function (pem_enum) {
        pem_enum[pem_enum["EMPTY"] = 0] = "EMPTY";
        pem_enum[pem_enum["CREATE"] = 1] = "CREATE";
        pem_enum[pem_enum["INTO"] = 2] = "INTO";
    })(pem_enum || (pem_enum = {}));
    function psr_ok(start, len) {
        return { ok: true, start: start, len: len };
    }
    function psr_error(flp, msg) {
        return { ok: false, flp: flp, msg: msg };
    }
    var lvr_enum;
    (function (lvr_enum) {
        lvr_enum[lvr_enum["VAR"] = 0] = "VAR";
        lvr_enum[lvr_enum["INDEX"] = 1] = "INDEX";
        lvr_enum[lvr_enum["SLICE"] = 2] = "SLICE";
        lvr_enum[lvr_enum["SLICEINDEX"] = 3] = "SLICEINDEX";
        lvr_enum[lvr_enum["LIST"] = 4] = "LIST";
    })(lvr_enum || (lvr_enum = {}));
    function lvr_var(flp, vlc) {
        return { flp: flp, vlc: vlc, type: lvr_enum.VAR };
    }
    function lvr_index(flp, obj, key) {
        return { flp: flp, vlc: VARLOC_NULL, type: lvr_enum.INDEX, obj: obj, key: key };
    }
    function lvr_slice(flp, obj, start, len) {
        return { flp: flp, vlc: VARLOC_NULL, type: lvr_enum.SLICE, obj: obj, start: start, len: len };
    }
    function lvr_sliceindex(flp, obj, key, start, len) {
        return {
            flp: flp,
            vlc: VARLOC_NULL,
            type: lvr_enum.SLICEINDEX,
            indexvlc: VARLOC_NULL,
            obj: obj,
            key: key,
            start: start,
            len: len
        };
    }
    function lvr_list(flp, body, rest) {
        return { flp: flp, vlc: VARLOC_NULL, type: lvr_enum.LIST, body: body, rest: rest };
    }
    var plm_enum;
    (function (plm_enum) {
        plm_enum[plm_enum["CREATE"] = 0] = "CREATE";
        plm_enum[plm_enum["INTO"] = 1] = "INTO";
    })(plm_enum || (plm_enum = {}));
    function lvp_ok(lv) {
        return { ok: true, lv: lv };
    }
    function lvp_error(flp, msg) {
        return { ok: false, flp: flp, msg: msg };
    }
    function lval_addVars(sym, ex, slot) {
        if (ex.type === expr_enum.NAMES) {
            var sr = symtbl_addVar(sym, ex.names, slot);
            if (!sr.ok)
                return lvp_error(ex.flp, sr.msg);
            return lvp_ok(lvr_var(ex.flp, sr.vlc));
        }
        else if (ex.type === expr_enum.LIST) {
            if (ex.ex === null)
                return lvp_error(ex.flp, 'Invalid assignment');
            var body = [];
            var rest = null;
            if (ex.ex.type === expr_enum.GROUP) {
                for (var i = 0; i < ex.ex.group.length; i++) {
                    var gex = ex.ex.group[i];
                    if (i === ex.ex.group.length - 1 && gex.type === expr_enum.PREFIX &&
                        gex.k === ks_enum.PERIOD3) {
                        var lp = lval_addVars(sym, gex.ex, -1);
                        if (!lp.ok)
                            return lp;
                        rest = lp.lv;
                    }
                    else {
                        var lp = lval_addVars(sym, gex, -1);
                        if (!lp.ok)
                            return lp;
                        body.push(lp.lv);
                    }
                }
            }
            else if (ex.ex.type === expr_enum.PREFIX && ex.ex.k === ks_enum.PERIOD3) {
                var lp = lval_addVars(sym, ex.ex.ex, -1);
                if (!lp.ok)
                    return lp;
                rest = lp.lv;
            }
            else {
                var lp = lval_addVars(sym, ex.ex, -1);
                if (!lp.ok)
                    return lp;
                body.push(lp.lv);
            }
            return lvp_ok(lvr_list(ex.flp, body, rest));
        }
        return lvp_error(ex.flp, 'Invalid assignment');
    }
    function lval_prepare(pgen, ex) {
        return __awaiter(this, void 0, void 0, function () {
            var sl, pe, obj, pe, obj, key, sr, pe, obj, sr, body, rest, i, gex, lp, lp, lp, lp;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!(ex.type === expr_enum.NAMES)) return [3, 1];
                        sl = symtbl_lookup(pgen.sym, ex.names);
                        if (!sl.ok)
                            return [2, lvp_error(ex.flp, sl.msg)];
                        if (sl.nsn.type !== nsname_enumt.VAR)
                            return [2, lvp_error(ex.flp, 'Invalid assignment')];
                        return [2, lvp_ok(lvr_var(ex.flp, varloc_new(sl.nsn.fr.level, sl.nsn.index)))];
                    case 1:
                        if (!(ex.type === expr_enum.INDEX)) return [3, 4];
                        return [4, program_eval(pgen, pem_enum.CREATE, VARLOC_NULL, ex.obj)];
                    case 2:
                        pe = _a.sent();
                        if (!pe.ok)
                            return [2, lvp_error(pe.flp, pe.msg)];
                        obj = pe.vlc;
                        if (ex.type !== expr_enum.INDEX)
                            throw new Error('Expression type must be index');
                        return [4, program_eval(pgen, pem_enum.CREATE, VARLOC_NULL, ex.key)];
                    case 3:
                        pe = _a.sent();
                        if (!pe.ok)
                            return [2, lvp_error(pe.flp, pe.msg)];
                        return [2, lvp_ok(lvr_index(ex.flp, obj, pe.vlc))];
                    case 4:
                        if (!(ex.type === expr_enum.SLICE)) return [3, 12];
                        if (!(ex.obj.type === expr_enum.INDEX)) return [3, 8];
                        return [4, program_eval(pgen, pem_enum.CREATE, VARLOC_NULL, ex.obj.obj)];
                    case 5:
                        pe = _a.sent();
                        if (!pe.ok)
                            return [2, lvp_error(pe.flp, pe.msg)];
                        obj = pe.vlc;
                        if (ex.type !== expr_enum.SLICE || ex.obj.type !== expr_enum.INDEX)
                            throw new Error('Expression type must be a slice index');
                        return [4, program_eval(pgen, pem_enum.CREATE, VARLOC_NULL, ex.obj.key)];
                    case 6:
                        pe = _a.sent();
                        if (!pe.ok)
                            return [2, lvp_error(pe.flp, pe.msg)];
                        key = pe.vlc;
                        if (ex.type !== expr_enum.SLICE)
                            throw new Error('Expression type must be slice');
                        return [4, program_slice(pgen, ex)];
                    case 7:
                        sr = _a.sent();
                        if (!sr.ok)
                            return [2, lvp_error(sr.flp, sr.msg)];
                        return [2, lvp_ok(lvr_sliceindex(ex.flp, obj, key, sr.start, sr.len))];
                    case 8: return [4, program_eval(pgen, pem_enum.CREATE, VARLOC_NULL, ex.obj)];
                    case 9:
                        pe = _a.sent();
                        if (!pe.ok)
                            return [2, lvp_error(pe.flp, pe.msg)];
                        obj = pe.vlc;
                        if (ex.type !== expr_enum.SLICE)
                            throw new Error('Expression type must be slice');
                        return [4, program_slice(pgen, ex)];
                    case 10:
                        sr = _a.sent();
                        if (!sr.ok)
                            return [2, lvp_error(sr.flp, sr.msg)];
                        return [2, lvp_ok(lvr_slice(ex.flp, obj, sr.start, sr.len))];
                    case 11: return [3, 25];
                    case 12:
                        if (!(ex.type === expr_enum.LIST)) return [3, 25];
                        body = [];
                        rest = null;
                        if (!(ex.ex === null)) return [3, 13];
                        return [2, lvp_error(ex.flp, 'Invalid assignment')];
                    case 13:
                        if (!(ex.ex.type === expr_enum.GROUP)) return [3, 20];
                        i = 0;
                        _a.label = 14;
                    case 14:
                        if (!(i < ex.ex.group.length)) return [3, 19];
                        gex = ex.ex.group[i];
                        if (!(i === ex.ex.group.length - 1 && gex.type === expr_enum.PREFIX &&
                            gex.k === ks_enum.PERIOD3)) return [3, 16];
                        return [4, lval_prepare(pgen, gex.ex)];
                    case 15:
                        lp = _a.sent();
                        if (!lp.ok)
                            return [2, lp];
                        rest = lp.lv;
                        return [3, 18];
                    case 16: return [4, lval_prepare(pgen, gex)];
                    case 17:
                        lp = _a.sent();
                        if (!lp.ok)
                            return [2, lp];
                        body.push(lp.lv);
                        _a.label = 18;
                    case 18:
                        i++;
                        return [3, 14];
                    case 19: return [3, 24];
                    case 20:
                        if (!(ex.ex.type === expr_enum.PREFIX && ex.ex.k === ks_enum.PERIOD3)) return [3, 22];
                        return [4, lval_prepare(pgen, ex.ex.ex)];
                    case 21:
                        lp = _a.sent();
                        if (!lp.ok)
                            return [2, lp];
                        rest = lp.lv;
                        return [2, lvp_ok(lvr_list(ex.flp, [], lp.lv))];
                    case 22: return [4, lval_prepare(pgen, ex.ex)];
                    case 23:
                        lp = _a.sent();
                        if (!lp.ok)
                            return [2, lp];
                        body.push(lp.lv);
                        _a.label = 24;
                    case 24: return [2, lvp_ok(lvr_list(ex.flp, body, rest))];
                    case 25: return [2, lvp_error(ex.flp, 'Invalid assignment')];
                }
            });
        });
    }
    function lval_clearTemps(lv, sym) {
        if (lv.type !== lvr_enum.VAR && !varloc_isnull(lv.vlc)) {
            symtbl_clearTemp(sym, lv.vlc);
            lv.vlc = VARLOC_NULL;
        }
        switch (lv.type) {
            case lvr_enum.VAR:
                return;
            case lvr_enum.INDEX:
                symtbl_clearTemp(sym, lv.obj);
                symtbl_clearTemp(sym, lv.key);
                return;
            case lvr_enum.SLICE:
                symtbl_clearTemp(sym, lv.obj);
                symtbl_clearTemp(sym, lv.start);
                symtbl_clearTemp(sym, lv.len);
                return;
            case lvr_enum.SLICEINDEX:
                if (!varloc_isnull(lv.indexvlc)) {
                    symtbl_clearTemp(sym, lv.indexvlc);
                    lv.indexvlc = VARLOC_NULL;
                }
                symtbl_clearTemp(sym, lv.obj);
                symtbl_clearTemp(sym, lv.key);
                symtbl_clearTemp(sym, lv.start);
                symtbl_clearTemp(sym, lv.len);
                return;
            case lvr_enum.LIST:
                for (var i = 0; i < lv.body.length; i++)
                    lval_clearTemps(lv.body[i], sym);
                if (lv.rest !== null)
                    lval_clearTemps(lv.rest, sym);
                return;
        }
    }
    function program_varInit(prg, lv) {
        if (lv.type === lvr_enum.VAR)
            op_nil(prg.ops, lv.vlc);
        else if (lv.type === lvr_enum.LIST) {
            for (var i = 0; i < lv.body.length; i++)
                program_varInit(prg, lv.body[i]);
            if (lv.rest !== null)
                program_varInit(prg, lv.rest);
        }
        else
            throw new Error('Unexpected variable initialization type');
    }
    function program_evalLval(pgen, mode, intoVlc, lv, mutop, valueVlc, clearTemps) {
        var prg = pgen.prg;
        var sym = pgen.sym;
        switch (lv.type) {
            case lvr_enum.VAR:
                if (mutop === op_enum.INVALID)
                    op_move(prg.ops, lv.vlc, valueVlc);
                else
                    op_binop(prg.ops, mutop, lv.vlc, lv.vlc, valueVlc);
                break;
            case lvr_enum.INDEX:
                {
                    if (mutop === op_enum.INVALID)
                        op_setat(prg.ops, lv.obj, lv.key, valueVlc);
                    else {
                        var pe_1 = program_lvalGet(pgen, plm_enum.CREATE, VARLOC_NULL, lv);
                        if (!pe_1.ok)
                            return pe_1;
                        op_binop(prg.ops, mutop, pe_1.vlc, pe_1.vlc, valueVlc);
                        op_setat(prg.ops, lv.obj, lv.key, pe_1.vlc);
                    }
                }
                break;
            case lvr_enum.SLICE:
                {
                    if (mutop === op_enum.INVALID)
                        op_splice(prg.ops, lv.obj, lv.start, lv.len, valueVlc);
                    else {
                        var pe_2 = program_lvalGet(pgen, plm_enum.CREATE, VARLOC_NULL, lv);
                        if (!pe_2.ok)
                            return pe_2;
                        var lv2 = lvr_var(lv.flp, lv.vlc);
                        pe_2 = program_evalLval(pgen, pem_enum.EMPTY, VARLOC_NULL, lv2, mutop, valueVlc, true);
                        if (!pe_2.ok)
                            return pe_2;
                        var ts = symtbl_addTemp(sym);
                        if (!ts.ok)
                            return per_error(lv.flp, ts.msg);
                        var t = ts.vlc;
                        op_numint(prg.ops, t, 0);
                        op_slice(prg.ops, t, lv.vlc, t, lv.len);
                        op_splice(prg.ops, lv.obj, lv.start, lv.len, t);
                        symtbl_clearTemp(sym, t);
                        symtbl_clearTemp(sym, lv.vlc);
                        lv.vlc = VARLOC_NULL;
                    }
                }
                break;
            case lvr_enum.SLICEINDEX:
                {
                    if (mutop === op_enum.INVALID) {
                        var pe_3 = program_lvalGetIndex(pgen, lv);
                        if (!pe_3.ok)
                            return pe_3;
                        op_splice(prg.ops, pe_3.vlc, lv.start, lv.len, valueVlc);
                        op_setat(prg.ops, lv.obj, lv.key, pe_3.vlc);
                    }
                    else {
                        var pe_4 = program_lvalGet(pgen, plm_enum.CREATE, VARLOC_NULL, lv);
                        if (!pe_4.ok)
                            return pe_4;
                        var lv2 = lvr_var(lv.flp, lv.vlc);
                        pe_4 = program_evalLval(pgen, pem_enum.EMPTY, VARLOC_NULL, lv2, mutop, valueVlc, true);
                        if (!pe_4.ok)
                            return pe_4;
                        var ts = symtbl_addTemp(sym);
                        if (!ts.ok)
                            return per_error(lv.flp, ts.msg);
                        var t = ts.vlc;
                        op_numint(prg.ops, t, 0);
                        op_slice(prg.ops, t, lv.vlc, t, lv.len);
                        op_splice(prg.ops, lv.indexvlc, lv.start, lv.len, t);
                        symtbl_clearTemp(sym, t);
                        symtbl_clearTemp(sym, lv.indexvlc);
                        symtbl_clearTemp(sym, lv.vlc);
                        lv.indexvlc = VARLOC_NULL;
                        lv.vlc = VARLOC_NULL;
                    }
                }
                break;
            case lvr_enum.LIST:
                {
                    var ts = symtbl_addTemp(sym);
                    if (!ts.ok)
                        return per_error(lv.flp, ts.msg);
                    var t = ts.vlc;
                    for (var i = 0; i < lv.body.length; i++) {
                        op_numint(prg.ops, t, i);
                        op_getat(prg.ops, t, valueVlc, t);
                        var pe_5 = program_evalLval(pgen, pem_enum.EMPTY, VARLOC_NULL, lv.body[i], mutop, t, false);
                        if (!pe_5.ok)
                            return pe_5;
                    }
                    if (lv.rest !== null) {
                        ts = symtbl_addTemp(sym);
                        if (!ts.ok)
                            return per_error(lv.flp, ts.msg);
                        var t2 = ts.vlc;
                        op_numint(prg.ops, t, lv.body.length);
                        op_nil(prg.ops, t2);
                        op_slice(prg.ops, t, valueVlc, t, t2);
                        symtbl_clearTemp(sym, t2);
                        var pe_6 = program_evalLval(pgen, pem_enum.EMPTY, VARLOC_NULL, lv.rest, mutop, t, false);
                        if (!pe_6.ok)
                            return pe_6;
                    }
                    symtbl_clearTemp(sym, t);
                }
                break;
        }
        if (mode === pem_enum.EMPTY) {
            if (clearTemps)
                lval_clearTemps(lv, sym);
            return per_ok(VARLOC_NULL);
        }
        else if (mode === pem_enum.CREATE) {
            var ts = symtbl_addTemp(sym);
            if (!ts.ok)
                return per_error(lv.flp, ts.msg);
            intoVlc = ts.vlc;
        }
        var pe = program_lvalGet(pgen, plm_enum.INTO, intoVlc, lv);
        if (!pe.ok)
            return pe;
        if (clearTemps)
            lval_clearTemps(lv, sym);
        return per_ok(intoVlc);
    }
    function program_slice(pgen, ex) {
        return __awaiter(this, void 0, void 0, function () {
            var start, ts, pe, len, ts, pe;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!(ex.start === null)) return [3, 1];
                        ts = symtbl_addTemp(pgen.sym);
                        if (!ts.ok)
                            return [2, psr_error(ex.flp, ts.msg)];
                        op_numint(pgen.prg.ops, ts.vlc, 0);
                        start = ts.vlc;
                        return [3, 3];
                    case 1: return [4, program_eval(pgen, pem_enum.CREATE, VARLOC_NULL, ex.start)];
                    case 2:
                        pe = _a.sent();
                        if (!pe.ok)
                            return [2, psr_error(pe.flp, pe.msg)];
                        start = pe.vlc;
                        _a.label = 3;
                    case 3:
                        if (!(ex.len === null)) return [3, 4];
                        ts = symtbl_addTemp(pgen.sym);
                        if (!ts.ok)
                            return [2, psr_error(ex.flp, ts.msg)];
                        len = ts.vlc;
                        op_nil(pgen.prg.ops, len);
                        return [3, 6];
                    case 4: return [4, program_eval(pgen, pem_enum.CREATE, VARLOC_NULL, ex.len)];
                    case 5:
                        pe = _a.sent();
                        if (!pe.ok)
                            return [2, psr_error(pe.flp, pe.msg)];
                        len = pe.vlc;
                        _a.label = 6;
                    case 6: return [2, psr_ok(start, len)];
                }
            });
        });
    }
    function program_lvalGetIndex(pgen, lv) {
        if (!varloc_isnull(lv.indexvlc))
            return per_ok(lv.indexvlc);
        var ts = symtbl_addTemp(pgen.sym);
        if (!ts.ok)
            return per_error(lv.flp, ts.msg);
        lv.indexvlc = ts.vlc;
        op_getat(pgen.prg.ops, lv.indexvlc, lv.obj, lv.key);
        return per_ok(lv.indexvlc);
    }
    function program_lvalGet(pgen, mode, intoVlc, lv) {
        var prg = pgen.prg;
        if (!varloc_isnull(lv.vlc)) {
            if (mode === plm_enum.CREATE)
                return per_ok(lv.vlc);
            op_move(prg.ops, intoVlc, lv.vlc);
            return per_ok(intoVlc);
        }
        if (mode === plm_enum.CREATE) {
            var ts = symtbl_addTemp(pgen.sym);
            if (!ts.ok)
                return per_error(lv.flp, ts.msg);
            intoVlc = lv.vlc = ts.vlc;
        }
        switch (lv.type) {
            case lvr_enum.VAR:
                throw new Error('Lvalue expected to be in variable already');
            case lvr_enum.INDEX:
                op_getat(prg.ops, intoVlc, lv.obj, lv.key);
                break;
            case lvr_enum.SLICE:
                op_slice(prg.ops, intoVlc, lv.obj, lv.start, lv.len);
                break;
            case lvr_enum.SLICEINDEX:
                {
                    var pe = program_lvalGetIndex(pgen, lv);
                    if (!pe.ok)
                        return pe;
                    op_slice(prg.ops, intoVlc, pe.vlc, lv.start, lv.len);
                }
                break;
            case lvr_enum.LIST:
                {
                    op_list(prg.ops, intoVlc, lv.body.length);
                    for (var i = 0; i < lv.body.length; i++) {
                        var pe = program_lvalGet(pgen, plm_enum.CREATE, VARLOC_NULL, lv.body[i]);
                        if (!pe.ok)
                            return pe;
                        op_param2(prg.ops, op_enum.LIST_PUSH, intoVlc, intoVlc, pe.vlc);
                    }
                    if (lv.rest !== null) {
                        var pe = program_lvalGet(pgen, plm_enum.CREATE, VARLOC_NULL, lv.rest);
                        if (!pe.ok)
                            return pe;
                        op_param2(prg.ops, op_enum.LIST_APPEND, intoVlc, intoVlc, pe.vlc);
                    }
                }
                break;
        }
        return per_ok(intoVlc);
    }
    function program_evalCallArgcount(pgen, params, argcount, pe, p) {
        return __awaiter(this, void 0, void 0, function () {
            var i, pe0, pe0;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        argcount[0] = 0;
                        if (params === null)
                            return [2, true];
                        if (!(params.type === expr_enum.GROUP)) return [3, 5];
                        argcount[0] = params.group.length;
                        if (argcount[0] > 254)
                            argcount[0] = 254;
                        i = 0;
                        _a.label = 1;
                    case 1:
                        if (!(i < params.group.length)) return [3, 4];
                        return [4, program_eval(pgen, i < argcount[0] ? pem_enum.CREATE : pem_enum.EMPTY, VARLOC_NULL, params.group[i])];
                    case 2:
                        pe0 = _a.sent();
                        pe[0] = pe0;
                        if (!pe0.ok)
                            return [2, false];
                        if (i < argcount[0])
                            p[i] = pe0.vlc;
                        _a.label = 3;
                    case 3:
                        i++;
                        return [3, 1];
                    case 4: return [3, 7];
                    case 5:
                        argcount[0] = 1;
                        return [4, program_eval(pgen, pem_enum.CREATE, VARLOC_NULL, params)];
                    case 6:
                        pe0 = _a.sent();
                        pe[0] = pe0;
                        if (!pe0.ok)
                            return [2, false];
                        p[0] = pe0.vlc;
                        _a.label = 7;
                    case 7: return [2, true];
                }
            });
        });
    }
    function embed_begin(file, efu) {
        efu.pgen.scr.capture_write = '';
        return true;
    }
    function embed_end(success, file, efu) {
        return __awaiter(this, void 0, void 0, function () {
            var ex, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!success) return [3, 2];
                        if (efu.pgen.scr.capture_write === null)
                            throw new Error('Bad embed capture');
                        ex = expr_str(efu.flp, efu.pgen.scr.capture_write);
                        _a = efu;
                        return [4, program_eval(efu.pgen, efu.mode, efu.intoVlc, ex)];
                    case 1:
                        _a.pe = _b.sent();
                        return [3, 3];
                    case 2:
                        efu.pe = per_error(efu.flp, 'Failed to read file for `embed`: ' + file);
                        _b.label = 3;
                    case 3:
                        efu.pgen.scr.capture_write = null;
                        return [2];
                }
            });
        });
    }
    function pen_ok(value) {
        return { ok: true, value: value };
    }
    function pen_error(msg) {
        return { ok: false, msg: msg };
    }
    function program_evalCall(pgen, mode, intoVlc, flp, nsn, params) {
        return __awaiter(this, void 0, void 0, function () {
            var prg, sym, pe_7, ts, pickfalse, finish, file, cwd, efu, fstr, res, str, seed, ex, ex2, p_2, out, ex_1, p_3, ts, p, i, argcount, pe, oarg, index, found, ts, i;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        prg = pgen.prg;
                        sym = pgen.sym;
                        if (nsn.type !== nsname_enumt.CMD_LOCAL && nsn.type !== nsname_enumt.CMD_NATIVE &&
                            nsn.type !== nsname_enumt.CMD_OPCODE)
                            return [2, per_error(flp, 'Invalid call - not a command')];
                        if (!(nsn.type === nsname_enumt.CMD_OPCODE && nsn.opcode === op_enum.PICK)) return [3, 10];
                        if (params === null || params.type !== expr_enum.GROUP ||
                            params.group.length !== 3)
                            return [2, per_error(flp, 'Using `pick` requires exactly three arguments')];
                        return [4, program_eval(pgen, pem_enum.CREATE, VARLOC_NULL, params.group[0])];
                    case 1:
                        pe_7 = _a.sent();
                        if (!pe_7.ok)
                            return [2, pe_7];
                        if (mode === pem_enum.CREATE) {
                            ts = symtbl_addTemp(sym);
                            if (!ts.ok)
                                return [2, per_error(flp, ts.msg)];
                            intoVlc = ts.vlc;
                        }
                        pickfalse = label_new('^pickfalse');
                        finish = label_new('^pickfinish');
                        label_jumpfalse(pickfalse, prg.ops, pe_7.vlc);
                        symtbl_clearTemp(sym, pe_7.vlc);
                        if (params === null || params.type !== expr_enum.GROUP)
                            throw new Error('Bad params for pick');
                        if (!(mode === pem_enum.EMPTY)) return [3, 3];
                        return [4, program_eval(pgen, pem_enum.EMPTY, intoVlc, params.group[1])];
                    case 2:
                        pe_7 = _a.sent();
                        return [3, 5];
                    case 3: return [4, program_eval(pgen, pem_enum.INTO, intoVlc, params.group[1])];
                    case 4:
                        pe_7 = _a.sent();
                        _a.label = 5;
                    case 5:
                        if (!pe_7.ok)
                            return [2, pe_7];
                        label_jump(finish, prg.ops);
                        label_declare(pickfalse, prg.ops);
                        if (params === null || params.type !== expr_enum.GROUP)
                            throw new Error('Bad params for pick');
                        if (!(mode === pem_enum.EMPTY)) return [3, 7];
                        return [4, program_eval(pgen, pem_enum.EMPTY, intoVlc, params.group[2])];
                    case 6:
                        pe_7 = _a.sent();
                        return [3, 9];
                    case 7: return [4, program_eval(pgen, pem_enum.INTO, intoVlc, params.group[2])];
                    case 8:
                        pe_7 = _a.sent();
                        _a.label = 9;
                    case 9:
                        if (!pe_7.ok)
                            return [2, pe_7];
                        label_declare(finish, prg.ops);
                        return [2, per_ok(intoVlc)];
                    case 10:
                        if (!(nsn.type === nsname_enumt.CMD_OPCODE && nsn.opcode === op_enum.EMBED)) return [3, 12];
                        file = params;
                        while (file !== null && file.type === expr_enum.PAREN)
                            file = file.ex;
                        if (file === null || file.type !== expr_enum.STR)
                            return [2, per_error(flp, 'Expecting constant string for `embed`')];
                        cwd = null;
                        efu = {
                            pgen: pgen,
                            mode: mode,
                            intoVlc: intoVlc,
                            flp: flp,
                            pe: per_ok(VARLOC_NULL)
                        };
                        if (pgen.from >= 0)
                            cwd = pathjoin(script_getfile(pgen.scr, pgen.from), '..', pgen.scr.posix);
                        fstr = file.str;
                        return [4, fileres_read(pgen.scr, false, fstr, cwd, embed_begin, embed_end, efu)];
                    case 11:
                        res = _a.sent();
                        if (!res)
                            return [2, per_error(flp, 'Failed to embed: ' + fstr)];
                        return [2, efu.pe];
                    case 12:
                        if (!(nsn.type === nsname_enumt.CMD_OPCODE && nsn.opcode === op_enum.STR_HASH &&
                            params !== null)) return [3, 14];
                        str = null;
                        seed = 0;
                        ex = params;
                        if (ex.type === expr_enum.GROUP && ex.group.length === 2) {
                            ex2 = ex.group[1];
                            ex = ex.group[0];
                            while (ex.type === expr_enum.PAREN)
                                ex = ex.ex;
                            if (ex.type === expr_enum.STR) {
                                p_2 = program_exprToNum(pgen, ex2);
                                if (p_2.ok) {
                                    str = ex.str;
                                    seed = p_2.value;
                                }
                            }
                        }
                        else {
                            while (ex.type === expr_enum.PAREN)
                                ex = ex.ex;
                            if (ex.type === expr_enum.STR)
                                str = ex.str;
                        }
                        if (!(str !== null)) return [3, 14];
                        out = str_hashplain(str, seed);
                        ex_1 = expr_list(flp, expr_group(flp, expr_group(flp, expr_group(flp, expr_num(flp, out[0]), expr_num(flp, out[1])), expr_num(flp, out[2])), expr_num(flp, out[3])));
                        return [4, program_eval(pgen, mode, intoVlc, ex_1)];
                    case 13:
                        p_3 = _a.sent();
                        return [2, p_3];
                    case 14:
                        if (mode === pem_enum.EMPTY || mode === pem_enum.CREATE) {
                            ts = symtbl_addTemp(sym);
                            if (!ts.ok)
                                return [2, per_error(flp, ts.msg)];
                            intoVlc = ts.vlc;
                        }
                        p = [];
                        for (i = 0; i < 256; i++)
                            p.push(VARLOC_NULL);
                        argcount = [0];
                        pe = [per_ok(VARLOC_NULL)];
                        return [4, program_evalCallArgcount(pgen, params, argcount, pe, p)];
                    case 15:
                        if (!(_a.sent()))
                            return [2, pe[0]];
                        program_flp(prg, flp);
                        oarg = true;
                        if (nsn.type === nsname_enumt.CMD_LOCAL)
                            label_call(nsn.lbl, prg.ops, intoVlc, argcount[0]);
                        else if (nsn.type === nsname_enumt.CMD_NATIVE) {
                            index = 0;
                            found = false;
                            for (; index < prg.keyTable.length; index++) {
                                if (u64_equ(prg.keyTable[index], nsn.hash)) {
                                    found = true;
                                    break;
                                }
                            }
                            if (!found) {
                                if (prg.keyTable.length >= 0x7FFFFFFF)
                                    return [2, per_error(flp, 'Too many native commands')];
                                index = prg.keyTable.length;
                                prg.keyTable.push(nsn.hash);
                            }
                            op_native(prg.ops, intoVlc, index, argcount[0]);
                        }
                        else {
                            if (nsn.params < 0)
                                op_parama(prg.ops, nsn.opcode, intoVlc, argcount[0]);
                            else {
                                oarg = false;
                                if (nsn.params > argcount[0]) {
                                    ts = symtbl_addTemp(sym);
                                    if (!ts.ok)
                                        return [2, per_error(flp, ts.msg)];
                                    p[argcount[0] + 0] = p[argcount[0] + 1] = p[argcount[0] + 2] = ts.vlc;
                                    op_nil(prg.ops, p[argcount[0]]);
                                    argcount[0]++;
                                }
                                if (nsn.params === 0)
                                    op_param0(prg.ops, nsn.opcode, intoVlc);
                                else if (nsn.params === 1)
                                    op_param1(prg.ops, nsn.opcode, intoVlc, p[0]);
                                else if (nsn.params === 2)
                                    op_param2(prg.ops, nsn.opcode, intoVlc, p[0], p[1]);
                                else
                                    op_param3(prg.ops, nsn.opcode, intoVlc, p[0], p[1], p[2]);
                            }
                        }
                        for (i = 0; i < argcount[0]; i++) {
                            if (oarg)
                                op_arg(prg.ops, p[i]);
                            symtbl_clearTemp(sym, p[i]);
                        }
                        if (mode === pem_enum.EMPTY) {
                            symtbl_clearTemp(sym, intoVlc);
                            return [2, per_ok(VARLOC_NULL)];
                        }
                        return [2, per_ok(intoVlc)];
                }
            });
        });
    }
    function program_lvalCheckNil(pgen, lv, jumpFalse, inverted, skip) {
        var prg = pgen.prg;
        var sym = pgen.sym;
        switch (lv.type) {
            case lvr_enum.VAR:
            case lvr_enum.INDEX:
                {
                    var pe = program_lvalGet(pgen, plm_enum.CREATE, VARLOC_NULL, lv);
                    if (!pe.ok)
                        return pe;
                    if (jumpFalse === !inverted)
                        label_jumpfalse(skip, prg.ops, pe.vlc);
                    else
                        label_jumptrue(skip, prg.ops, pe.vlc);
                    symtbl_clearTemp(sym, pe.vlc);
                }
                break;
            case lvr_enum.SLICE:
            case lvr_enum.SLICEINDEX:
                {
                    var obj = void 0;
                    var start = void 0;
                    var len = void 0;
                    if (lv.type === lvr_enum.SLICE) {
                        obj = lv.obj;
                        start = lv.start;
                        len = lv.len;
                    }
                    else {
                        var pe = program_lvalGetIndex(pgen, lv);
                        if (!pe.ok)
                            return pe;
                        obj = pe.vlc;
                        start = lv.start;
                        len = lv.len;
                    }
                    var ts = symtbl_addTemp(sym);
                    if (!ts.ok)
                        return per_error(lv.flp, ts.msg);
                    var idx = ts.vlc;
                    ts = symtbl_addTemp(sym);
                    if (!ts.ok)
                        return per_error(lv.flp, ts.msg);
                    var t = ts.vlc;
                    op_numint(prg.ops, idx, 0);
                    var next = label_new('^condslicenext');
                    op_nil(prg.ops, t);
                    op_binop(prg.ops, op_enum.EQU, t, t, len);
                    label_jumpfalse(next, prg.ops, t);
                    op_unop(prg.ops, op_enum.SIZE, t, obj);
                    op_binop(prg.ops, op_enum.NUM_SUB, len, t, start);
                    label_declare(next, prg.ops);
                    op_binop(prg.ops, op_enum.LT, t, idx, len);
                    var keep = label_new('^condslicekeep');
                    label_jumpfalse(inverted ? keep : skip, prg.ops, t);
                    op_binop(prg.ops, op_enum.NUM_ADD, t, idx, start);
                    op_getat(prg.ops, t, obj, t);
                    if (jumpFalse)
                        label_jumptrue(inverted ? skip : keep, prg.ops, t);
                    else
                        label_jumpfalse(inverted ? skip : keep, prg.ops, t);
                    op_inc(prg.ops, idx);
                    label_jump(next, prg.ops);
                    label_declare(keep, prg.ops);
                    symtbl_clearTemp(sym, idx);
                    symtbl_clearTemp(sym, t);
                }
                break;
            case lvr_enum.LIST:
                {
                    var keep = label_new('^condkeep');
                    for (var i = 0; i < lv.body.length; i++)
                        program_lvalCheckNil(pgen, lv.body[i], jumpFalse, true, inverted ? skip : keep);
                    if (lv.rest !== null)
                        program_lvalCheckNil(pgen, lv.rest, jumpFalse, true, inverted ? skip : keep);
                    if (!inverted)
                        label_jump(skip, prg.ops);
                    label_declare(keep, prg.ops);
                }
                break;
        }
        return per_ok(VARLOC_NULL);
    }
    function program_lvalCondAssignPart(pgen, lv, jumpFalse, valueVlc) {
        var prg = pgen.prg;
        var sym = pgen.sym;
        switch (lv.type) {
            case lvr_enum.VAR:
            case lvr_enum.INDEX:
                {
                    var pe = program_lvalGet(pgen, plm_enum.CREATE, VARLOC_NULL, lv);
                    if (!pe.ok)
                        return pe;
                    var skip = label_new("^condskippart");
                    if (jumpFalse)
                        label_jumpfalse(skip, prg.ops, pe.vlc);
                    else
                        label_jumptrue(skip, prg.ops, pe.vlc);
                    symtbl_clearTemp(sym, pe.vlc);
                    pe = program_evalLval(pgen, pem_enum.EMPTY, VARLOC_NULL, lv, op_enum.INVALID, valueVlc, true);
                    if (!pe.ok)
                        return pe;
                    label_declare(skip, prg.ops);
                }
                break;
            case lvr_enum.SLICE:
            case lvr_enum.SLICEINDEX:
                {
                    var obj = void 0;
                    var start = void 0;
                    var len = void 0;
                    if (lv.type === lvr_enum.SLICE) {
                        obj = lv.obj;
                        start = lv.start;
                        len = lv.len;
                    }
                    else {
                        var pe = program_lvalGetIndex(pgen, lv);
                        if (!pe.ok)
                            return pe;
                        obj = pe.vlc;
                        start = lv.start;
                        len = lv.len;
                    }
                    var ts = symtbl_addTemp(sym);
                    if (!ts.ok)
                        return per_error(lv.flp, ts.msg);
                    var idx = ts.vlc;
                    ts = symtbl_addTemp(sym);
                    if (!ts.ok)
                        return per_error(lv.flp, ts.msg);
                    var t = ts.vlc;
                    ts = symtbl_addTemp(sym);
                    if (!ts.ok)
                        return per_error(lv.flp, ts.msg);
                    var t2 = ts.vlc;
                    op_numint(prg.ops, idx, 0);
                    var next = label_new('^condpartslicenext');
                    op_nil(prg.ops, t);
                    op_binop(prg.ops, op_enum.EQU, t, t, len);
                    label_jumpfalse(next, prg.ops, t);
                    op_unop(prg.ops, op_enum.SIZE, t, obj);
                    op_binop(prg.ops, op_enum.NUM_SUB, len, t, start);
                    label_declare(next, prg.ops);
                    op_binop(prg.ops, op_enum.LT, t, idx, len);
                    var done = label_new('^condpartslicedone');
                    label_jumpfalse(done, prg.ops, t);
                    var inc = label_new('^condpartsliceinc');
                    op_binop(prg.ops, op_enum.NUM_ADD, t, idx, start);
                    op_getat(prg.ops, t2, obj, t);
                    if (jumpFalse)
                        label_jumpfalse(inc, prg.ops, t2);
                    else
                        label_jumptrue(inc, prg.ops, t2);
                    op_getat(prg.ops, t2, valueVlc, idx);
                    op_setat(prg.ops, obj, t, t2);
                    label_declare(inc, prg.ops);
                    op_inc(prg.ops, idx);
                    label_jump(next, prg.ops);
                    label_declare(done, prg.ops);
                    symtbl_clearTemp(sym, idx);
                    symtbl_clearTemp(sym, t);
                    symtbl_clearTemp(sym, t2);
                }
                break;
            case lvr_enum.LIST:
                {
                    var ts = symtbl_addTemp(sym);
                    if (!ts.ok)
                        return per_error(lv.flp, ts.msg);
                    var t = ts.vlc;
                    for (var i = 0; i < lv.body.length; i++) {
                        op_numint(prg.ops, t, i);
                        op_getat(prg.ops, t, valueVlc, t);
                        var pe = program_lvalCondAssignPart(pgen, lv.body[i], jumpFalse, t);
                        if (!pe.ok)
                            return pe;
                    }
                    if (lv.rest !== null) {
                        var ts_1 = symtbl_addTemp(sym);
                        if (!ts_1.ok)
                            return per_error(lv.flp, ts_1.msg);
                        var t2 = ts_1.vlc;
                        op_numint(prg.ops, t, lv.body.length);
                        op_nil(prg.ops, t2);
                        op_slice(prg.ops, t, valueVlc, t, t2);
                        symtbl_clearTemp(sym, t2);
                        var pe = program_lvalCondAssignPart(pgen, lv.rest, jumpFalse, t);
                        if (!pe.ok)
                            return pe;
                    }
                    symtbl_clearTemp(sym, t);
                }
                break;
        }
        return per_ok(VARLOC_NULL);
    }
    function program_lvalCondAssign(pgen, lv, jumpFalse, valueVlc) {
        switch (lv.type) {
            case lvr_enum.VAR:
            case lvr_enum.INDEX:
                {
                    var pe = program_evalLval(pgen, pem_enum.EMPTY, VARLOC_NULL, lv, op_enum.INVALID, valueVlc, true);
                    if (!pe.ok)
                        return pe;
                }
                break;
            case lvr_enum.SLICE:
            case lvr_enum.SLICEINDEX:
            case lvr_enum.LIST:
                return program_lvalCondAssignPart(pgen, lv, jumpFalse, valueVlc);
        }
        symtbl_clearTemp(pgen.sym, valueVlc);
        return per_ok(VARLOC_NULL);
    }
    function program_eval(pgen, mode, intoVlc, ex) {
        return __awaiter(this, void 0, void 0, function () {
            var prg, sym, _a, ts, ts, ts, found, index, ts, ls, ts, i, pe, pe, ts, sl, varVlc, ts, i, pe, ts, t, tmax, ts, p, ci, len, i, pe, i, unop, pe, ts, mutop, lp, skip, pe_8, ts, ple, pe_9, ts, pe, ts, binop, pe, left, pe, left, useleft, finish, sl, pe_10, ts, pe, obj, key, ts, pe, obj, sr;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        prg = pgen.prg;
                        sym = pgen.sym;
                        program_flp(prg, ex.flp);
                        _a = ex.type;
                        switch (_a) {
                            case expr_enum.NIL: return [3, 1];
                            case expr_enum.NUM: return [3, 2];
                            case expr_enum.STR: return [3, 3];
                            case expr_enum.LIST: return [3, 4];
                            case expr_enum.NAMES: return [3, 14];
                            case expr_enum.PAREN: return [3, 15];
                            case expr_enum.GROUP: return [3, 16];
                            case expr_enum.CAT: return [3, 20];
                            case expr_enum.PREFIX: return [3, 28];
                            case expr_enum.INFIX: return [3, 30];
                            case expr_enum.CALL: return [3, 44];
                            case expr_enum.INDEX: return [3, 45];
                            case expr_enum.SLICE: return [3, 51];
                        }
                        return [3, 54];
                    case 1:
                        {
                            if (mode === pem_enum.EMPTY)
                                return [2, per_ok(VARLOC_NULL)];
                            else if (mode === pem_enum.CREATE) {
                                ts = symtbl_addTemp(sym);
                                if (!ts.ok)
                                    return [2, per_error(ex.flp, ts.msg)];
                                intoVlc = ts.vlc;
                            }
                            op_nil(prg.ops, intoVlc);
                            return [2, per_ok(intoVlc)];
                        }
                        _b.label = 2;
                    case 2:
                        {
                            if (mode === pem_enum.EMPTY)
                                return [2, per_ok(VARLOC_NULL)];
                            else if (mode === pem_enum.CREATE) {
                                ts = symtbl_addTemp(sym);
                                if (!ts.ok)
                                    return [2, per_error(ex.flp, ts.msg)];
                                intoVlc = ts.vlc;
                            }
                            op_num(prg.ops, intoVlc, ex.num);
                            return [2, per_ok(intoVlc)];
                        }
                        _b.label = 3;
                    case 3:
                        {
                            if (mode === pem_enum.EMPTY)
                                return [2, per_ok(VARLOC_NULL)];
                            else if (mode === pem_enum.CREATE) {
                                ts = symtbl_addTemp(sym);
                                if (!ts.ok)
                                    return [2, per_error(ex.flp, ts.msg)];
                                intoVlc = ts.vlc;
                            }
                            found = false;
                            index = 0;
                            for (; index < prg.strTable.length; index++) {
                                if (ex.str === prg.strTable[index]) {
                                    found = true;
                                    break;
                                }
                            }
                            if (!found) {
                                if (index >= 0x7FFFFFFF)
                                    return [2, per_error(ex.flp, 'Too many string constants')];
                                prg.strTable.push(ex.str);
                            }
                            op_str(prg.ops, intoVlc, index);
                            return [2, per_ok(intoVlc)];
                        }
                        _b.label = 4;
                    case 4:
                        if (mode === pem_enum.EMPTY) {
                            if (ex.ex !== null)
                                return [2, program_eval(pgen, pem_enum.EMPTY, VARLOC_NULL, ex.ex)];
                            return [2, per_ok(VARLOC_NULL)];
                        }
                        else if (mode === pem_enum.CREATE) {
                            ts = symtbl_addTemp(sym);
                            if (!ts.ok)
                                return [2, per_error(ex.flp, ts.msg)];
                            intoVlc = ts.vlc;
                        }
                        if (!(ex.ex !== null)) return [3, 12];
                        if (!(ex.ex.type === expr_enum.GROUP)) return [3, 9];
                        ls = intoVlc;
                        if (mode === pem_enum.INTO) {
                            ts = symtbl_addTemp(sym);
                            if (!ts.ok)
                                return [2, per_error(ex.flp, ts.msg)];
                            ls = ts.vlc;
                        }
                        op_list(prg.ops, ls, ex.ex.group.length);
                        i = 0;
                        _b.label = 5;
                    case 5:
                        if (!(i < ex.ex.group.length)) return [3, 8];
                        return [4, program_eval(pgen, pem_enum.CREATE, VARLOC_NULL, ex.ex.group[i])];
                    case 6:
                        pe = _b.sent();
                        if (!pe.ok)
                            return [2, pe];
                        symtbl_clearTemp(sym, pe.vlc);
                        op_param2(prg.ops, op_enum.LIST_PUSH, ls, ls, pe.vlc);
                        _b.label = 7;
                    case 7:
                        i++;
                        return [3, 5];
                    case 8:
                        if (mode === pem_enum.INTO) {
                            symtbl_clearTemp(sym, ls);
                            op_move(prg.ops, intoVlc, ls);
                        }
                        return [2, per_ok(intoVlc)];
                    case 9: return [4, program_eval(pgen, pem_enum.CREATE, VARLOC_NULL, ex.ex)];
                    case 10:
                        pe = _b.sent();
                        if (!pe.ok)
                            return [2, pe];
                        if (intoVlc.frame === pe.vlc.frame && intoVlc.index === pe.vlc.index) {
                            ts = symtbl_addTemp(sym);
                            if (!ts.ok)
                                return [2, per_error(ex.flp, ts.msg)];
                            symtbl_clearTemp(sym, ts.vlc);
                            symtbl_clearTemp(sym, pe.vlc);
                            op_list(prg.ops, ts.vlc, 1);
                            op_param2(prg.ops, op_enum.LIST_PUSH, ts.vlc, ts.vlc, pe.vlc);
                            op_move(prg.ops, intoVlc, ts.vlc);
                        }
                        else {
                            symtbl_clearTemp(sym, pe.vlc);
                            op_list(prg.ops, intoVlc, 1);
                            op_param2(prg.ops, op_enum.LIST_PUSH, intoVlc, intoVlc, pe.vlc);
                        }
                        return [2, per_ok(intoVlc)];
                    case 11: return [3, 13];
                    case 12:
                        op_list(prg.ops, intoVlc, 0);
                        _b.label = 13;
                    case 13: return [2, per_ok(intoVlc)];
                    case 14:
                        {
                            sl = symtbl_lookup(sym, ex.names);
                            if (!sl.ok)
                                return [2, per_error(ex.flp, sl.msg)];
                            switch (sl.nsn.type) {
                                case nsname_enumt.VAR: {
                                    if (mode === pem_enum.EMPTY)
                                        return [2, per_ok(VARLOC_NULL)];
                                    varVlc = varloc_new(sl.nsn.fr.level, sl.nsn.index);
                                    if (mode === pem_enum.CREATE)
                                        return [2, per_ok(varVlc)];
                                    op_move(prg.ops, intoVlc, varVlc);
                                    return [2, per_ok(intoVlc)];
                                }
                                case nsname_enumt.ENUM: {
                                    if (mode === pem_enum.EMPTY)
                                        return [2, per_ok(VARLOC_NULL)];
                                    if (mode === pem_enum.CREATE) {
                                        ts = symtbl_addTemp(sym);
                                        if (!ts.ok)
                                            return [2, per_error(ex.flp, ts.msg)];
                                        intoVlc = ts.vlc;
                                    }
                                    op_num(prg.ops, intoVlc, sl.nsn.val);
                                    return [2, per_ok(intoVlc)];
                                }
                                case nsname_enumt.CMD_LOCAL:
                                case nsname_enumt.CMD_NATIVE:
                                case nsname_enumt.CMD_OPCODE:
                                    return [2, program_evalCall(pgen, mode, intoVlc, ex.flp, sl.nsn, null)];
                                case nsname_enumt.NAMESPACE:
                                    return [2, per_error(ex.flp, 'Invalid expression')];
                            }
                            throw new Error('Invalid namespace entry');
                        }
                        _b.label = 15;
                    case 15: return [2, program_eval(pgen, mode, intoVlc, ex.ex)];
                    case 16:
                        i = 0;
                        _b.label = 17;
                    case 17:
                        if (!true) return [3, 20];
                        if (i === ex.group.length - 1)
                            return [2, program_eval(pgen, mode, intoVlc, ex.group[i])];
                        return [4, program_eval(pgen, pem_enum.EMPTY, VARLOC_NULL, ex.group[i])];
                    case 18:
                        pe = _b.sent();
                        if (!pe.ok)
                            return [2, pe];
                        _b.label = 19;
                    case 19:
                        i++;
                        return [3, 17];
                    case 20:
                        if (mode === pem_enum.EMPTY || mode === pem_enum.CREATE) {
                            ts = symtbl_addTemp(sym);
                            if (!ts.ok)
                                return [2, per_error(ex.flp, ts.msg)];
                            intoVlc = ts.vlc;
                        }
                        t = VARLOC_NULL;
                        tmax = symtbl_tempAvail(sym) - 128;
                        if (tmax < 16)
                            tmax = 16;
                        if (ex.cat.length > tmax) {
                            tmax--;
                            ts = symtbl_addTemp(sym);
                            if (!ts.ok)
                                return [2, per_error(ex.flp, ts.msg)];
                            t = ts.vlc;
                        }
                        p = [];
                        ci = 0;
                        _b.label = 21;
                    case 21:
                        if (!(ci < ex.cat.length)) return [3, 27];
                        len = ex.cat.length - ci;
                        if (len > tmax)
                            len = tmax;
                        i = 0;
                        _b.label = 22;
                    case 22:
                        if (!(i < len)) return [3, 25];
                        return [4, program_eval(pgen, pem_enum.CREATE, VARLOC_NULL, ex.cat[ci + i])];
                    case 23:
                        pe = _b.sent();
                        if (!pe.ok)
                            return [2, pe];
                        p[i] = pe.vlc;
                        _b.label = 24;
                    case 24:
                        i++;
                        return [3, 22];
                    case 25:
                        op_cat(prg.ops, ci > 0 ? t : intoVlc, len);
                        for (i = 0; i < len; i++) {
                            symtbl_clearTemp(sym, p[i]);
                            op_arg(prg.ops, p[i]);
                        }
                        if (ci > 0) {
                            op_cat(prg.ops, intoVlc, 2);
                            op_arg(prg.ops, intoVlc);
                            op_arg(prg.ops, t);
                        }
                        _b.label = 26;
                    case 26:
                        ci += tmax;
                        return [3, 21];
                    case 27:
                        if (!varloc_isnull(t))
                            symtbl_clearTemp(sym, t);
                        if (mode === pem_enum.EMPTY) {
                            symtbl_clearTemp(sym, intoVlc);
                            return [2, per_ok(VARLOC_NULL)];
                        }
                        return [2, per_ok(intoVlc)];
                    case 28:
                        unop = ks_toUnaryOp(ex.k);
                        if (unop === op_enum.INVALID)
                            return [2, per_error(ex.flp, 'Invalid unary operator')];
                        return [4, program_eval(pgen, pem_enum.CREATE, VARLOC_NULL, ex.ex)];
                    case 29:
                        pe = _b.sent();
                        if (!pe.ok)
                            return [2, pe];
                        if (mode === pem_enum.EMPTY || mode === pem_enum.CREATE) {
                            ts = symtbl_addTemp(sym);
                            if (!ts.ok)
                                return [2, per_error(ex.flp, ts.msg)];
                            intoVlc = ts.vlc;
                        }
                        op_unop(prg.ops, unop, intoVlc, pe.vlc);
                        symtbl_clearTemp(sym, pe.vlc);
                        if (mode === pem_enum.EMPTY) {
                            symtbl_clearTemp(sym, intoVlc);
                            return [2, per_ok(VARLOC_NULL)];
                        }
                        return [2, per_ok(intoVlc)];
                    case 30:
                        mutop = ks_toMutateOp(ex.k);
                        if (!(ex.k === ks_enum.EQU || ex.k === ks_enum.AMP2EQU ||
                            ex.k === ks_enum.PIPE2EQU || mutop !== op_enum.INVALID)) return [3, 37];
                        return [4, lval_prepare(pgen, ex.left)];
                    case 31:
                        lp = _b.sent();
                        if (!lp.ok)
                            return [2, per_error(lp.flp, lp.msg)];
                        if (!(ex.k === ks_enum.AMP2EQU || ex.k === ks_enum.PIPE2EQU)) return [3, 33];
                        skip = label_new('^condsetskip');
                        pe_8 = program_lvalCheckNil(pgen, lp.lv, ex.k === ks_enum.AMP2EQU, false, skip);
                        if (!pe_8.ok)
                            return [2, pe_8];
                        if (ex.right === null)
                            throw new Error('Invalid infix operator (right is null)');
                        return [4, program_eval(pgen, pem_enum.CREATE, VARLOC_NULL, ex.right)];
                    case 32:
                        pe_8 = _b.sent();
                        if (!pe_8.ok)
                            return [2, pe_8];
                        if (!lp.ok)
                            throw new Error('Invalid lvalue conditional assignment');
                        pe_8 = program_lvalCondAssign(pgen, lp.lv, ex.k === ks_enum.AMP2EQU, pe_8.vlc);
                        if (!pe_8.ok)
                            return [2, pe_8];
                        if (mode === pem_enum.EMPTY) {
                            label_declare(skip, prg.ops);
                            lval_clearTemps(lp.lv, sym);
                            return [2, per_ok(VARLOC_NULL)];
                        }
                        label_declare(skip, prg.ops);
                        if (mode === pem_enum.CREATE) {
                            ts = symtbl_addTemp(sym);
                            if (!ts.ok)
                                return [2, per_error(ex.flp, ts.msg)];
                            intoVlc = ts.vlc;
                        }
                        ple = program_lvalGet(pgen, plm_enum.INTO, intoVlc, lp.lv);
                        if (!ple.ok)
                            return [2, ple];
                        lval_clearTemps(lp.lv, sym);
                        return [2, per_ok(intoVlc)];
                    case 33:
                        if (ex.right === null)
                            throw new Error('Invalid assignment (right is null)');
                        if (!(ex.k === ks_enum.EQU && lp.lv.type === lvr_enum.VAR)) return [3, 35];
                        return [4, program_eval(pgen, pem_enum.INTO, lp.lv.vlc, ex.right)];
                    case 34:
                        pe_9 = _b.sent();
                        if (!pe_9.ok)
                            return [2, pe_9];
                        if (mode === pem_enum.EMPTY)
                            return [2, per_ok(VARLOC_NULL)];
                        else if (mode === pem_enum.CREATE) {
                            ts = symtbl_addTemp(sym);
                            if (!ts.ok)
                                return [2, per_error(ex.flp, ts.msg)];
                            intoVlc = ts.vlc;
                        }
                        if (!lp.ok)
                            throw new Error('Lvalue is an error in basic assignment');
                        op_move(prg.ops, intoVlc, lp.lv.vlc);
                        return [2, per_ok(intoVlc)];
                    case 35: return [4, program_eval(pgen, pem_enum.CREATE, VARLOC_NULL, ex.right)];
                    case 36:
                        pe = _b.sent();
                        if (!pe.ok)
                            return [2, pe];
                        if (!lp.ok)
                            throw new Error('Lvalue is an error in assignment');
                        return [2, program_evalLval(pgen, mode, intoVlc, lp.lv, mutop, pe.vlc, true)];
                    case 37:
                        if (mode === pem_enum.EMPTY || mode === pem_enum.CREATE) {
                            ts = symtbl_addTemp(sym);
                            if (!ts.ok)
                                return [2, per_error(ex.flp, ts.msg)];
                            intoVlc = ts.vlc;
                        }
                        binop = ks_toBinaryOp(ex.k);
                        if (!(binop !== op_enum.INVALID)) return [3, 40];
                        return [4, program_eval(pgen, pem_enum.CREATE, VARLOC_NULL, ex.left)];
                    case 38:
                        pe = _b.sent();
                        if (!pe.ok)
                            return [2, pe];
                        left = pe.vlc;
                        if (ex.right === null)
                            throw new Error('Infix operator has null right');
                        return [4, program_eval(pgen, pem_enum.CREATE, VARLOC_NULL, ex.right)];
                    case 39:
                        pe = _b.sent();
                        if (!pe.ok)
                            return [2, pe];
                        program_flp(prg, ex.flp);
                        op_binop(prg.ops, binop, intoVlc, left, pe.vlc);
                        symtbl_clearTemp(sym, left);
                        symtbl_clearTemp(sym, pe.vlc);
                        if (mode === pem_enum.EMPTY) {
                            symtbl_clearTemp(sym, intoVlc);
                            return [2, per_ok(VARLOC_NULL)];
                        }
                        return [2, per_ok(intoVlc)];
                    case 40:
                        if (!(ex.k === ks_enum.AMP2 || ex.k === ks_enum.PIPE2)) return [3, 43];
                        return [4, program_eval(pgen, pem_enum.CREATE, VARLOC_NULL, ex.left)];
                    case 41:
                        pe = _b.sent();
                        if (!pe.ok)
                            return [2, pe];
                        left = pe.vlc;
                        useleft = label_new('^useleft');
                        if (ex.k === ks_enum.AMP2)
                            label_jumpfalse(useleft, prg.ops, left);
                        else
                            label_jumptrue(useleft, prg.ops, left);
                        if (ex.right === null)
                            throw new Error('Infix conditional has null right expression');
                        return [4, program_eval(pgen, pem_enum.INTO, intoVlc, ex.right)];
                    case 42:
                        pe = _b.sent();
                        if (!pe.ok)
                            return [2, pe];
                        finish = label_new('^finish');
                        label_jump(finish, prg.ops);
                        label_declare(useleft, prg.ops);
                        op_move(prg.ops, intoVlc, left);
                        label_declare(finish, prg.ops);
                        symtbl_clearTemp(sym, left);
                        if (mode === pem_enum.EMPTY) {
                            symtbl_clearTemp(sym, intoVlc);
                            return [2, per_ok(VARLOC_NULL)];
                        }
                        return [2, per_ok(intoVlc)];
                    case 43: return [2, per_error(ex.flp, 'Invalid operation')];
                    case 44:
                        {
                            if (ex.cmd.type !== expr_enum.NAMES)
                                return [2, per_error(ex.flp, 'Invalid call')];
                            sl = symtbl_lookup(sym, ex.cmd.names);
                            if (!sl.ok)
                                return [2, per_error(ex.flp, sl.msg)];
                            return [2, program_evalCall(pgen, mode, intoVlc, ex.flp, sl.nsn, ex.params)];
                        }
                        _b.label = 45;
                    case 45:
                        if (!(mode === pem_enum.EMPTY)) return [3, 48];
                        return [4, program_eval(pgen, pem_enum.EMPTY, VARLOC_NULL, ex.obj)];
                    case 46:
                        pe_10 = _b.sent();
                        if (!pe_10.ok)
                            return [2, pe_10];
                        return [4, program_eval(pgen, pem_enum.EMPTY, VARLOC_NULL, ex.key)];
                    case 47:
                        pe_10 = _b.sent();
                        if (!pe_10.ok)
                            return [2, pe_10];
                        return [2, per_ok(VARLOC_NULL)];
                    case 48:
                        if (mode === pem_enum.CREATE) {
                            ts = symtbl_addTemp(sym);
                            if (!ts.ok)
                                return [2, per_error(ex.flp, ts.msg)];
                            intoVlc = ts.vlc;
                        }
                        return [4, program_eval(pgen, pem_enum.CREATE, VARLOC_NULL, ex.obj)];
                    case 49:
                        pe = _b.sent();
                        if (!pe.ok)
                            return [2, pe];
                        obj = pe.vlc;
                        return [4, program_eval(pgen, pem_enum.CREATE, VARLOC_NULL, ex.key)];
                    case 50:
                        pe = _b.sent();
                        if (!pe.ok)
                            return [2, pe];
                        key = pe.vlc;
                        op_getat(prg.ops, intoVlc, obj, key);
                        symtbl_clearTemp(sym, obj);
                        symtbl_clearTemp(sym, key);
                        return [2, per_ok(intoVlc)];
                    case 51:
                        if (mode === pem_enum.EMPTY || mode === pem_enum.CREATE) {
                            ts = symtbl_addTemp(sym);
                            if (!ts.ok)
                                return [2, per_error(ex.flp, ts.msg)];
                            intoVlc = ts.vlc;
                        }
                        return [4, program_eval(pgen, pem_enum.CREATE, VARLOC_NULL, ex.obj)];
                    case 52:
                        pe = _b.sent();
                        if (!pe.ok)
                            return [2, pe];
                        obj = pe.vlc;
                        return [4, program_slice(pgen, ex)];
                    case 53:
                        sr = _b.sent();
                        if (!sr.ok)
                            return [2, per_error(sr.flp, sr.msg)];
                        op_slice(prg.ops, intoVlc, obj, sr.start, sr.len);
                        symtbl_clearTemp(sym, obj);
                        symtbl_clearTemp(sym, sr.start);
                        symtbl_clearTemp(sym, sr.len);
                        if (mode === pem_enum.EMPTY) {
                            symtbl_clearTemp(sym, intoVlc);
                            return [2, per_ok(VARLOC_NULL)];
                        }
                        return [2, per_ok(intoVlc)];
                    case 54: throw new Error('Invalid expression type');
                }
            });
        });
    }
    function program_exprToNum(pgen, ex) {
        if (ex.type === expr_enum.NUM)
            return pen_ok(ex.num);
        else if (ex.type === expr_enum.NAMES) {
            var sl = symtbl_lookup(pgen.sym, ex.names);
            if (!sl.ok)
                return pen_error(sl.msg);
            if (sl.nsn.type === nsname_enumt.ENUM)
                return pen_ok(sl.nsn.val);
        }
        else if (ex.type === expr_enum.PAREN)
            return program_exprToNum(pgen, ex.ex);
        else if (ex.type === expr_enum.PREFIX) {
            var n = program_exprToNum(pgen, ex.ex);
            if (n.ok) {
                var k = ks_toUnaryOp(ex.k);
                if (k === op_enum.TONUM)
                    return pen_ok(n.value);
                else if (k == op_enum.NUM_NEG)
                    return pen_ok(-n.value);
            }
        }
        else if (ex.type === expr_enum.INFIX) {
            var n1 = program_exprToNum(pgen, ex.left);
            if (!n1.ok)
                return n1;
            if (ex.right === null)
                throw new Error('Expression cannot have null right side');
            var n2 = program_exprToNum(pgen, ex.right);
            if (!n2.ok)
                return n2;
            var binop = ks_toBinaryOp(ex.k);
            if (binop === op_enum.NUM_ADD)
                return pen_ok(n1.value + n2.value);
            else if (binop === op_enum.NUM_SUB)
                return pen_ok(n1.value - n2.value);
            else if (binop === op_enum.NUM_MOD)
                return pen_ok(n1.value % n2.value);
            else if (binop === op_enum.NUM_MUL)
                return pen_ok(n1.value * n2.value);
            else if (binop === op_enum.NUM_DIV)
                return pen_ok(n1.value / n2.value);
            else if (binop === op_enum.NUM_POW)
                return pen_ok(Math.pow(n1.value, n2.value));
        }
        return pen_error('Enums must be a constant number');
    }
    var pgr_enum;
    (function (pgr_enum) {
        pgr_enum[pgr_enum["OK"] = 0] = "OK";
        pgr_enum[pgr_enum["PUSH"] = 1] = "PUSH";
        pgr_enum[pgr_enum["POP"] = 2] = "POP";
        pgr_enum[pgr_enum["ERROR"] = 3] = "ERROR";
        pgr_enum[pgr_enum["FORVARS"] = 4] = "FORVARS";
    })(pgr_enum || (pgr_enum = {}));
    function pgr_ok() {
        return { type: pgr_enum.OK };
    }
    function pgr_push(pgs) {
        return { type: pgr_enum.PUSH, pgs: pgs };
    }
    function pgr_pop() {
        return { type: pgr_enum.POP };
    }
    function pgr_error(flp, msg) {
        return { type: pgr_enum.ERROR, flp: flp, msg: msg };
    }
    function pgr_forvars(val_vlc, idx_vlc) {
        return { type: pgr_enum.FORVARS, val_vlc: val_vlc, idx_vlc: idx_vlc };
    }
    function pgs_dowhile_new(top, cond, finish) {
        return { top: top, cond: cond, finish: finish };
    }
    function pgs_dowhile_check(v) {
        return typeof v === 'object' && v !== null && label_check(v.cond);
    }
    function pgs_for_new(t1, t2, t3, t4, val_vlc, idx_vlc, top, inc, finish) {
        return {
            t1: t1, t2: t2, t3: t3, t4: t4,
            val_vlc: val_vlc, idx_vlc: idx_vlc,
            top: top, inc: inc, finish: finish
        };
    }
    function pgs_for_check(v) {
        return typeof v === 'object' && v !== null && label_check(v.inc);
    }
    function pgs_loop_new(lcont, lbrk) {
        return { lcont: lcont, lbrk: lbrk };
    }
    function pgs_loop_check(v) {
        return typeof v === 'object' && v !== null && label_check(v.lcont);
    }
    function pgs_if_new(nextcond, ifdone) {
        return { nextcond: nextcond, ifdone: ifdone };
    }
    function pgs_if_check(v) {
        return typeof v === 'object' && v !== null && label_check(v.ifdone);
    }
    function program_forVarsSingle(sym, forVar, names) {
        if (names === null || forVar) {
            var ts = names === null ? symtbl_addTemp(sym) : symtbl_addVar(sym, names, -1);
            if (!ts.ok)
                return { vlc: VARLOC_NULL, err: ts.msg };
            return { vlc: ts.vlc, err: null };
        }
        else {
            var sl = symtbl_lookup(sym, names);
            if (!sl.ok)
                return { vlc: VARLOC_NULL, err: sl.msg };
            if (sl.nsn.type !== nsname_enumt.VAR)
                return { vlc: VARLOC_NULL, err: 'Cannot use non-variable in for loop' };
            return { vlc: varloc_new(sl.nsn.fr.level, sl.nsn.index), err: null };
        }
    }
    function program_forVars(sym, stmt) {
        var pf1 = { vlc: VARLOC_NULL, err: null };
        if (stmt.names1 !== null) {
            pf1 = program_forVarsSingle(sym, stmt.forVar, stmt.names1);
            if (pf1.err !== null)
                return pgr_error(stmt.flp, pf1.err);
        }
        var pf2 = program_forVarsSingle(sym, stmt.forVar, stmt.names2);
        if (pf2.err !== null)
            return pgr_error(stmt.flp, pf2.err);
        return pgr_forvars(pf1.vlc, pf2.vlc);
    }
    function program_genForRange(pgen, stmt, p1, p2, p3) {
        var prg = pgen.prg;
        var sym = pgen.sym;
        var zerostart = false;
        if (varloc_isnull(p2)) {
            zerostart = true;
            p2 = p1;
            var ts_2 = symtbl_addTemp(sym);
            if (!ts_2.ok)
                return pgr_error(stmt.flp, ts_2.msg);
            p1 = ts_2.vlc;
            op_numint(prg.ops, p1, 0);
        }
        symtbl_pushScope(sym);
        var pgi = program_forVars(sym, stmt);
        if (pgi.type !== pgr_enum.FORVARS)
            return pgi;
        var val_vlc = pgi.val_vlc;
        var idx_vlc = pgi.idx_vlc;
        op_numint(prg.ops, idx_vlc, 0);
        if (!zerostart)
            op_binop(prg.ops, op_enum.NUM_SUB, p2, p2, p1);
        if (!varloc_isnull(p3))
            op_binop(prg.ops, op_enum.NUM_DIV, p2, p2, p3);
        var top = label_new('^forR_top');
        var inc = label_new('^forR_inc');
        var finish = label_new('^forR_finish');
        var ts = symtbl_addTemp(sym);
        if (!ts.ok)
            return pgr_error(stmt.flp, ts.msg);
        var t = ts.vlc;
        label_declare(top, prg.ops);
        op_binop(prg.ops, op_enum.LT, t, idx_vlc, p2);
        label_jumpfalse(finish, prg.ops, t);
        if (!varloc_isnull(val_vlc)) {
            if (varloc_isnull(p3)) {
                if (!zerostart)
                    op_binop(prg.ops, op_enum.NUM_ADD, val_vlc, p1, idx_vlc);
                else
                    op_move(prg.ops, val_vlc, idx_vlc);
            }
            else {
                op_binop(prg.ops, op_enum.NUM_MUL, val_vlc, idx_vlc, p3);
                if (!zerostart)
                    op_binop(prg.ops, op_enum.NUM_ADD, val_vlc, p1, val_vlc);
            }
        }
        sym.sc.lblBreak = finish;
        sym.sc.lblContinue = inc;
        return pgr_push(pgs_for_new(p1, p2, p3, t, val_vlc, idx_vlc, top, inc, finish));
    }
    function program_genForGeneric(pgen, stmt) {
        return __awaiter(this, void 0, void 0, function () {
            var prg, sym, pe, exp_vlc, pgi, val_vlc, idx_vlc, top, inc, finish, ts, t;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        prg = pgen.prg;
                        sym = pgen.sym;
                        return [4, program_eval(pgen, pem_enum.CREATE, VARLOC_NULL, stmt.ex)];
                    case 1:
                        pe = _a.sent();
                        if (!pe.ok)
                            return [2, pgr_error(pe.flp, pe.msg)];
                        symtbl_pushScope(sym);
                        exp_vlc = pe.vlc;
                        pgi = program_forVars(sym, stmt);
                        if (pgi.type !== pgr_enum.FORVARS)
                            return [2, pgi];
                        val_vlc = pgi.val_vlc;
                        idx_vlc = pgi.idx_vlc;
                        op_numint(prg.ops, idx_vlc, 0);
                        top = label_new('^forG_top');
                        inc = label_new('^forG_inc');
                        finish = label_new('^forG_finish');
                        ts = symtbl_addTemp(sym);
                        if (!ts.ok)
                            return [2, pgr_error(stmt.flp, ts.msg)];
                        t = ts.vlc;
                        label_declare(top, prg.ops);
                        op_unop(prg.ops, op_enum.SIZE, t, exp_vlc);
                        op_binop(prg.ops, op_enum.LT, t, idx_vlc, t);
                        label_jumpfalse(finish, prg.ops, t);
                        if (!varloc_isnull(val_vlc))
                            op_getat(prg.ops, val_vlc, exp_vlc, idx_vlc);
                        sym.sc.lblBreak = finish;
                        sym.sc.lblContinue = inc;
                        return [2, pgr_push(pgs_for_new(t, exp_vlc, VARLOC_NULL, VARLOC_NULL, val_vlc, idx_vlc, top, inc, finish))];
                }
            });
        });
    }
    function program_gen(pgen, stmt, state, sayexpr) {
        return __awaiter(this, void 0, void 0, function () {
            var prg, sym, _a, dc, lbl, smsg, smsg, n, lbl, smsg, level, rest, lvs, last_ex, skip, i, ex, arg, argset, pr, lr, pe, lr, skip, top_1, cond, finish, pst, pe, pst_1, pst, last_val, i, ex, v, n, smsg, c, n, sl, nsn, p, rp, ts, pe, i, ts, pe, pst, lcont, lbrk, pst, i, lbl_1, lbl, pst, pr, pst, pst, smsg, nsn, params, ex, sl, sl, argcount, pe, p, nsn_lbl, eb, pe0, i, pr, sl, ns, sf, i, ex1, ex, pr_vlc, pr, lr, pe, pr, ts, lbl, found, i;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        prg = pgen.prg;
                        sym = pgen.sym;
                        program_flp(prg, stmt.flp);
                        _a = stmt.type;
                        switch (_a) {
                            case ast_enumt.BREAK: return [3, 1];
                            case ast_enumt.CONTINUE: return [3, 2];
                            case ast_enumt.DECLARE: return [3, 3];
                            case ast_enumt.DEF1: return [3, 4];
                            case ast_enumt.DEF2: return [3, 11];
                            case ast_enumt.DOWHILE1: return [3, 12];
                            case ast_enumt.DOWHILE2: return [3, 13];
                            case ast_enumt.DOWHILE3: return [3, 16];
                            case ast_enumt.ENUM: return [3, 17];
                            case ast_enumt.FOR1: return [3, 18];
                            case ast_enumt.FOR2: return [3, 26];
                            case ast_enumt.LOOP1: return [3, 27];
                            case ast_enumt.LOOP2: return [3, 28];
                            case ast_enumt.GOTO: return [3, 29];
                            case ast_enumt.IF1: return [3, 30];
                            case ast_enumt.IF2: return [3, 31];
                            case ast_enumt.IF3: return [3, 33];
                            case ast_enumt.IF4: return [3, 34];
                            case ast_enumt.INCLUDE: return [3, 35];
                            case ast_enumt.NAMESPACE1: return [3, 36];
                            case ast_enumt.NAMESPACE2: return [3, 37];
                            case ast_enumt.RETURN: return [3, 38];
                            case ast_enumt.USING: return [3, 42];
                            case ast_enumt.VAR: return [3, 43];
                            case ast_enumt.EVAL: return [3, 49];
                            case ast_enumt.LABEL: return [3, 51];
                        }
                        return [3, 52];
                    case 1:
                        {
                            if (sym.sc.lblBreak === null)
                                return [2, pgr_error(stmt.flp, 'Invalid `break`')];
                            label_jump(sym.sc.lblBreak, prg.ops);
                            return [2, pgr_ok()];
                        }
                        _b.label = 2;
                    case 2:
                        {
                            if (sym.sc.lblContinue === null)
                                return [2, pgr_error(stmt.flp, 'Invalid `continue`')];
                            label_jump(sym.sc.lblContinue, prg.ops);
                            return [2, pgr_ok()];
                        }
                        _b.label = 3;
                    case 3:
                        {
                            dc = stmt.declare;
                            if (dc.local) {
                                lbl = label_new('^def');
                                sym.fr.lbls.push(lbl);
                                smsg = symtbl_addCmdLocal(sym, dc.names, lbl);
                                if (smsg !== null)
                                    return [2, pgr_error(dc.flp, smsg)];
                            }
                            else {
                                if (dc.key === null)
                                    throw new Error('Expecting native declaration to have key');
                                smsg = symtbl_addCmdNative(sym, dc.names, native_hash(dc.key));
                                if (smsg !== null)
                                    return [2, pgr_error(dc.flp, smsg)];
                            }
                            return [2, pgr_ok()];
                        }
                        _b.label = 4;
                    case 4:
                        n = namespace_lookupImmediate(sym.sc.ns, stmt.names);
                        lbl = void 0;
                        if (n.found && n.nsn.type === nsname_enumt.CMD_LOCAL) {
                            lbl = n.nsn.lbl;
                            if (!sym.repl && lbl.pos >= 0)
                                return [2, pgr_error(stmt.flpN, 'Cannot redefine: ' + stmt.names.join('.'))];
                        }
                        else {
                            lbl = label_new('^def');
                            sym.fr.lbls.push(lbl);
                            smsg = symtbl_addCmdLocal(sym, stmt.names, lbl);
                            if (smsg !== null)
                                return [2, pgr_error(stmt.flpN, smsg)];
                        }
                        level = sym.fr.level + 1;
                        if (level > 255)
                            return [2, pgr_error(stmt.flp, 'Too many nested commands')];
                        rest = 0xFF;
                        lvs = stmt.lvalues.length;
                        if (lvs > 255)
                            return [2, pgr_error(stmt.flp, 'Too many parameters')];
                        if (lvs > 0) {
                            last_ex = stmt.lvalues[lvs - 1];
                            if (last_ex.type === expr_enum.PREFIX && last_ex.k === ks_enum.PERIOD3)
                                rest = lvs - 1;
                        }
                        skip = label_new('^after_def');
                        label_jump(skip, prg.ops);
                        label_declare(lbl, prg.ops);
                        symtbl_pushFrame(sym);
                        program_cmdhint(prg, stmt.names);
                        op_cmdhead(prg.ops, level, rest);
                        symtbl_reserveVars(sym, lvs);
                        i = 0;
                        _b.label = 5;
                    case 5:
                        if (!(i < lvs)) return [3, 10];
                        ex = stmt.lvalues[i];
                        if (!(ex.type === expr_enum.INFIX)) return [3, 8];
                        arg = varloc_new(level, i);
                        if (!(ex.right !== null)) return [3, 7];
                        argset = label_new('^argset');
                        label_jumptrue(argset, prg.ops, arg);
                        return [4, program_eval(pgen, pem_enum.INTO, arg, ex.right)];
                    case 6:
                        pr = _b.sent();
                        if (!pr.ok)
                            return [2, pgr_error(pr.flp, pr.msg)];
                        label_declare(argset, prg.ops);
                        _b.label = 7;
                    case 7:
                        if (ex.type !== expr_enum.INFIX)
                            throw new Error('Expecting parameter expression to be infix');
                        lr = lval_addVars(sym, ex.left, i);
                        if (!lr.ok)
                            return [2, pgr_error(lr.flp, lr.msg)];
                        pe = program_evalLval(pgen, pem_enum.EMPTY, VARLOC_NULL, lr.lv, op_enum.INVALID, arg, true);
                        if (!pe.ok)
                            return [2, pgr_error(pe.flp, pe.msg)];
                        return [3, 9];
                    case 8:
                        if (i === lvs - 1 && ex.type === expr_enum.PREFIX && ex.k === ks_enum.PERIOD3) {
                            lr = lval_addVars(sym, ex.ex, i);
                            if (!lr.ok)
                                return [2, pgr_error(lr.flp, lr.msg)];
                            if (lr.lv.type !== lvr_enum.VAR)
                                throw new Error('Assertion failed: `...rest` parameter must be identifier');
                        }
                        else
                            throw new Error('Assertion failed: parameter must be infix expression');
                        _b.label = 9;
                    case 9:
                        i++;
                        return [3, 5];
                    case 10: return [2, pgr_push(skip)];
                    case 11:
                        {
                            program_cmdhint(prg, null);
                            op_cmdtail(prg.ops);
                            symtbl_popFrame(sym);
                            if (!label_check(state))
                                throw new Error('Expecting state to be a label');
                            skip = state;
                            label_declare(skip, prg.ops);
                            return [2, pgr_pop()];
                        }
                        _b.label = 12;
                    case 12:
                        {
                            top_1 = label_new('^dowhile_top');
                            cond = label_new('^dowhile_cond');
                            finish = label_new('^dowhile_finish');
                            symtbl_pushScope(sym);
                            sym.sc.lblBreak = finish;
                            sym.sc.lblContinue = cond;
                            label_declare(top_1, prg.ops);
                            return [2, pgr_push(pgs_dowhile_new(top_1, cond, finish))];
                        }
                        _b.label = 13;
                    case 13:
                        if (!pgs_dowhile_check(state))
                            throw new Error('Expecting state to be do-while structure');
                        pst = state;
                        label_declare(pst.cond, prg.ops);
                        if (!(stmt.cond === null)) return [3, 14];
                        pst.top = null;
                        return [2, pgr_ok()];
                    case 14: return [4, program_eval(pgen, pem_enum.CREATE, VARLOC_NULL, stmt.cond)];
                    case 15:
                        pe = _b.sent();
                        if (!pgs_dowhile_check(state))
                            throw new Error('Expecting state to be do-while structure');
                        pst_1 = state;
                        if (!pe.ok)
                            return [2, pgr_error(pe.flp, pe.msg)];
                        label_jumpfalse(pst_1.finish, prg.ops, pe.vlc);
                        symtbl_clearTemp(sym, pe.vlc);
                        sym.sc.lblContinue = pst_1.top;
                        return [2, pgr_ok()];
                    case 16:
                        {
                            if (!pgs_dowhile_check(state))
                                throw new Error('Expecting state to be do-while structure');
                            pst = state;
                            if (pst.top !== null)
                                label_jump(pst.top, prg.ops);
                            label_declare(pst.finish, prg.ops);
                            symtbl_popScope(sym);
                            return [2, pgr_pop()];
                        }
                        _b.label = 17;
                    case 17:
                        {
                            last_val = -1;
                            for (i = 0; i < stmt.lvalues.length; i++) {
                                ex = stmt.lvalues[i];
                                if (ex.type !== expr_enum.INFIX)
                                    throw new Error('Enum expression must be infix');
                                v = last_val + 1;
                                if (ex.right !== null) {
                                    n = program_exprToNum(pgen, ex.right);
                                    if (!n.ok)
                                        return [2, pgr_error(stmt.flp, n.msg)];
                                    v = n.value;
                                }
                                if (ex.left.type !== expr_enum.NAMES)
                                    return [2, pgr_error(stmt.flp, 'Enum name must only consist of identifiers')];
                                last_val = v;
                                smsg = symtbl_addEnum(sym, ex.left.names, v);
                                if (smsg !== null)
                                    return [2, pgr_error(stmt.flp, smsg)];
                            }
                            return [2, pgr_ok()];
                        }
                        _b.label = 18;
                    case 18:
                        if (!(stmt.ex.type === expr_enum.CALL)) return [3, 25];
                        c = stmt.ex;
                        if (!(c.cmd.type === expr_enum.NAMES)) return [3, 25];
                        n = c.cmd;
                        sl = symtbl_lookup(sym, n.names);
                        if (!sl.ok)
                            return [2, pgr_error(stmt.flp, sl.msg)];
                        nsn = sl.nsn;
                        if (!(nsn.type === nsname_enumt.CMD_OPCODE && nsn.opcode === op_enum.RANGE)) return [3, 25];
                        p = c.params;
                        rp = [VARLOC_NULL, VARLOC_NULL, VARLOC_NULL];
                        if (!(p.type !== expr_enum.GROUP)) return [3, 20];
                        ts = symtbl_addTemp(sym);
                        if (!ts.ok)
                            return [2, pgr_error(stmt.flp, ts.msg)];
                        rp[0] = ts.vlc;
                        return [4, program_eval(pgen, pem_enum.INTO, rp[0], p)];
                    case 19:
                        pe = _b.sent();
                        if (!pe.ok)
                            return [2, pgr_error(pe.flp, pe.msg)];
                        return [3, 24];
                    case 20:
                        i = 0;
                        _b.label = 21;
                    case 21:
                        if (!(i < p.group.length)) return [3, 24];
                        if (i < 3) {
                            ts = symtbl_addTemp(sym);
                            if (!ts.ok)
                                return [2, pgr_error(stmt.flp, ts.msg)];
                            rp[i] = ts.vlc;
                        }
                        return [4, program_eval(pgen, i < 3 ? pem_enum.INTO : pem_enum.EMPTY, i < 3 ? rp[i] : VARLOC_NULL, p.group[i])];
                    case 22:
                        pe = _b.sent();
                        if (!pe.ok)
                            return [2, pgr_error(pe.flp, pe.msg)];
                        _b.label = 23;
                    case 23:
                        i++;
                        return [3, 21];
                    case 24: return [2, program_genForRange(pgen, stmt, rp[0], rp[1], rp[2])];
                    case 25: return [2, program_genForGeneric(pgen, stmt)];
                    case 26:
                        {
                            if (!pgs_for_check(state))
                                throw new Error('Expecting state to be for structure');
                            pst = state;
                            label_declare(pst.inc, prg.ops);
                            op_inc(prg.ops, pst.idx_vlc);
                            label_jump(pst.top, prg.ops);
                            label_declare(pst.finish, prg.ops);
                            symtbl_clearTemp(sym, pst.t1);
                            symtbl_clearTemp(sym, pst.t2);
                            if (!varloc_isnull(pst.t3))
                                symtbl_clearTemp(sym, pst.t3);
                            if (!varloc_isnull(pst.t4))
                                symtbl_clearTemp(sym, pst.t4);
                            if (!varloc_isnull(pst.val_vlc))
                                symtbl_clearTemp(sym, pst.val_vlc);
                            symtbl_clearTemp(sym, pst.idx_vlc);
                            symtbl_popScope(sym);
                            return [2, pgr_pop()];
                        }
                        _b.label = 27;
                    case 27:
                        {
                            symtbl_pushScope(sym);
                            lcont = label_new('^loop_continue');
                            lbrk = label_new('^loop_break');
                            sym.sc.lblContinue = lcont;
                            sym.sc.lblBreak = lbrk;
                            label_declare(lcont, prg.ops);
                            return [2, pgr_push(pgs_loop_new(lcont, lbrk))];
                        }
                        _b.label = 28;
                    case 28:
                        {
                            if (!pgs_loop_check(state))
                                throw new Error('Expecting state to be loop structure');
                            pst = state;
                            label_jump(pst.lcont, prg.ops);
                            label_declare(pst.lbrk, prg.ops);
                            symtbl_popScope(sym);
                            return [2, pgr_pop()];
                        }
                        _b.label = 29;
                    case 29:
                        {
                            for (i = 0; i < sym.fr.lbls.length; i++) {
                                lbl_1 = sym.fr.lbls[i];
                                if (lbl_1.name !== null && lbl_1.name === stmt.ident) {
                                    label_jump(lbl_1, prg.ops);
                                    return [2, pgr_ok()];
                                }
                            }
                            lbl = label_new(stmt.ident);
                            label_jump(lbl, prg.ops);
                            sym.fr.lbls.push(lbl);
                            return [2, pgr_ok()];
                        }
                        _b.label = 30;
                    case 30:
                        {
                            return [2, pgr_push(pgs_if_new(null, label_new('^ifdone')))];
                        }
                        _b.label = 31;
                    case 31:
                        if (!pgs_if_check(state))
                            throw new Error('Expecting state to be if struture');
                        pst = state;
                        if (pst.nextcond !== null) {
                            symtbl_popScope(sym);
                            label_jump(pst.ifdone, prg.ops);
                            label_declare(pst.nextcond, prg.ops);
                        }
                        pst.nextcond = label_new('^nextcond');
                        return [4, program_eval(pgen, pem_enum.CREATE, VARLOC_NULL, stmt.cond)];
                    case 32:
                        pr = _b.sent();
                        if (!pgs_if_check(state))
                            throw new Error('Expecting state to be if struture');
                        if (!pr.ok)
                            return [2, pgr_error(pr.flp, pr.msg)];
                        if (pst.nextcond === null)
                            throw new Error('If2 nextcond must not be null');
                        label_jumpfalse(pst.nextcond, prg.ops, pr.vlc);
                        symtbl_clearTemp(sym, pr.vlc);
                        symtbl_pushScope(sym);
                        return [2, pgr_ok()];
                    case 33:
                        {
                            if (!pgs_if_check(state))
                                throw new Error('Expecting state to be if structure');
                            pst = state;
                            symtbl_popScope(sym);
                            label_jump(pst.ifdone, prg.ops);
                            if (pst.nextcond === null)
                                throw new Error('Next condition label must exist');
                            label_declare(pst.nextcond, prg.ops);
                            symtbl_pushScope(sym);
                            return [2, pgr_ok()];
                        }
                        _b.label = 34;
                    case 34:
                        {
                            if (!pgs_if_check(state))
                                throw new Error('Expecting state to be if structure');
                            pst = state;
                            symtbl_popScope(sym);
                            label_declare(pst.ifdone, prg.ops);
                            return [2, pgr_pop()];
                        }
                        _b.label = 35;
                    case 35:
                        {
                            throw new Error('Cannot generate code for include statement');
                        }
                        _b.label = 36;
                    case 36:
                        {
                            smsg = symtbl_pushNamespace(sym, stmt.names);
                            if (smsg !== null)
                                return [2, pgr_error(stmt.flp, smsg)];
                            return [2, pgr_push(null)];
                        }
                        _b.label = 37;
                    case 37:
                        {
                            symtbl_popNamespace(sym);
                            return [2, pgr_pop()];
                        }
                        _b.label = 38;
                    case 38:
                        nsn = null;
                        params = null;
                        ex = stmt.ex;
                        if (ex.type === expr_enum.CALL) {
                            if (ex.cmd.type !== expr_enum.NAMES)
                                return [2, pgr_error(ex.flp, 'Invalid call')];
                            sl = symtbl_lookup(sym, ex.cmd.names);
                            if (!sl.ok)
                                return [2, pgr_error(ex.flp, sl.msg)];
                            nsn = sl.nsn;
                            params = ex.params;
                        }
                        else if (ex.type === expr_enum.NAMES) {
                            sl = symtbl_lookup(sym, ex.names);
                            if (!sl.ok)
                                return [2, pgr_error(ex.flp, sl.msg)];
                            nsn = sl.nsn;
                        }
                        if (!(nsn !== null && nsn.type === nsname_enumt.CMD_LOCAL &&
                            nsn.fr.level + 1 === sym.fr.level)) return [3, 40];
                        argcount = [];
                        pe = [];
                        p = [];
                        nsn_lbl = nsn.lbl;
                        return [4, program_evalCallArgcount(pgen, params, argcount, pe, p)];
                    case 39:
                        eb = _b.sent();
                        if (!eb) {
                            pe0 = pe[0];
                            if (pe0.ok)
                                throw new Error('Expecting error message from evalCallArgcount');
                            return [2, pgr_error(pe0.flp, pe0.msg)];
                        }
                        label_returntail(nsn_lbl, prg.ops, argcount[0]);
                        for (i = 0; i < argcount[0]; i++) {
                            op_arg(prg.ops, p[i]);
                            symtbl_clearTemp(sym, p[i]);
                        }
                        return [2, pgr_ok()];
                    case 40: return [4, program_eval(pgen, pem_enum.CREATE, VARLOC_NULL, ex)];
                    case 41:
                        pr = _b.sent();
                        if (!pr.ok)
                            return [2, pgr_error(pr.flp, pr.msg)];
                        symtbl_clearTemp(sym, pr.vlc);
                        op_return(prg.ops, pr.vlc);
                        return [2, pgr_ok()];
                    case 42:
                        {
                            sl = symtbl_lookupfast(sym, stmt.names);
                            ns = void 0;
                            if (!sl.ok) {
                                sf = symtbl_findNamespace(sym, stmt.names, stmt.names.length);
                                if (!sf.ok)
                                    return [2, pgr_error(stmt.flp, sf.msg)];
                                ns = sf.ns;
                            }
                            else {
                                if (sl.nsn.type !== nsname_enumt.NAMESPACE)
                                    return [2, pgr_error(stmt.flp, 'Expecting namespace')];
                                ns = sl.nsn.ns;
                            }
                            if (sym.sc.ns.usings.indexOf(ns) < 0)
                                sym.sc.ns.usings.push(ns);
                            return [2, pgr_ok()];
                        }
                        _b.label = 43;
                    case 43:
                        i = 0;
                        _b.label = 44;
                    case 44:
                        if (!(i < stmt.lvalues.length)) return [3, 48];
                        ex1 = stmt.lvalues[i];
                        if (ex1.type !== expr_enum.INFIX)
                            throw new Error('Var expressions must be infix');
                        ex = ex1;
                        pr_vlc = VARLOC_NULL;
                        if (!(ex.right !== null)) return [3, 46];
                        return [4, program_eval(pgen, pem_enum.CREATE, VARLOC_NULL, ex.right)];
                    case 45:
                        pr = _b.sent();
                        if (!pr.ok)
                            return [2, pgr_error(pr.flp, pr.msg)];
                        pr_vlc = pr.vlc;
                        _b.label = 46;
                    case 46:
                        lr = lval_addVars(sym, ex.left, -1);
                        if (!lr.ok)
                            return [2, pgr_error(lr.flp, lr.msg)];
                        if (ex.right !== null) {
                            pe = program_evalLval(pgen, pem_enum.EMPTY, VARLOC_NULL, lr.lv, op_enum.INVALID, pr_vlc, true);
                            if (!pe.ok)
                                return [2, pgr_error(pe.flp, pe.msg)];
                            symtbl_clearTemp(sym, pr_vlc);
                        }
                        else
                            program_varInit(prg, lr.lv);
                        _b.label = 47;
                    case 47:
                        i++;
                        return [3, 44];
                    case 48: return [2, pgr_ok()];
                    case 49: return [4, program_eval(pgen, sayexpr ? pem_enum.CREATE : pem_enum.EMPTY, VARLOC_NULL, stmt.ex)];
                    case 50:
                        pr = _b.sent();
                        if (!pr.ok)
                            return [2, pgr_error(pr.flp, pr.msg)];
                        if (sayexpr) {
                            ts = symtbl_addTemp(sym);
                            if (!ts.ok)
                                return [2, pgr_error(stmt.flp, ts.msg)];
                            op_parama(prg.ops, op_enum.SAY, ts.vlc, 1);
                            op_arg(prg.ops, pr.vlc);
                            symtbl_clearTemp(sym, pr.vlc);
                            symtbl_clearTemp(sym, ts.vlc);
                        }
                        return [2, pgr_ok()];
                    case 51:
                        {
                            lbl = null;
                            found = false;
                            for (i = 0; i < sym.fr.lbls.length; i++) {
                                lbl = sym.fr.lbls[i];
                                if (lbl.name !== null && lbl.name === stmt.ident) {
                                    if (lbl.pos >= 0)
                                        return [2, pgr_error(stmt.flp, 'Cannot redeclare label "' + stmt.ident + '"')];
                                    found = true;
                                    break;
                                }
                            }
                            if (!found) {
                                lbl = label_new(stmt.ident);
                                sym.fr.lbls.push(lbl);
                            }
                            if (lbl === null)
                                throw new Error('Label cannot be null');
                            label_declare(lbl, prg.ops);
                            return [2, pgr_ok()];
                        }
                        _b.label = 52;
                    case 52: throw new Error('Invalid AST type');
                }
            });
        });
    }
    function ccs_new(pc, frame, index, lex_index) {
        return { pc: pc, frame: frame, index: index, lex_index: lex_index };
    }
    function lxs_new(args, next) {
        var ls = { vals: args.concat(), next: next };
        for (var i = args.length; i < 256; i++)
            ls.vals.push(exports.NIL);
        return ls;
    }
    function native_new(hash, natuser, f_native) {
        return { natuser: natuser, hash: hash, f_native: f_native };
    }
    function lxs_get(ctx, args, next) {
        if (ctx.lxs_avail.length > 0) {
            var ls = ctx.lxs_avail.pop();
            if (typeof ls === 'undefined')
                throw new Error('No lxs structures available');
            ls.vals = args.concat();
            for (var i = args.length; i < 256; i++)
                ls.vals.push(exports.NIL);
            ls.next = next;
            return ls;
        }
        return lxs_new(args, next);
    }
    function lxs_release(ctx, ls) {
        ctx.lxs_avail.push(ls);
    }
    function ccs_get(ctx, pc, frame, index, lex_index) {
        if (ctx.ccs_avail.length > 0) {
            var c = ctx.ccs_avail.pop();
            if (typeof c === 'undefined')
                throw new Error('No ccs structures available');
            c.pc = pc;
            c.frame = frame;
            c.index = index;
            c.lex_index = lex_index;
            return c;
        }
        return ccs_new(pc, frame, index, lex_index);
    }
    function ccs_release(ctx, c) {
        ctx.ccs_avail.push(c);
    }
    function context_native(ctx, hash, natuser, f_native) {
        if (ctx.prg.repl)
            ctx.natives.push(native_new(hash, natuser, f_native));
        else {
            for (var i = 0; i < ctx.natives.length; i++) {
                var nat = ctx.natives[i];
                if (u64_equ(nat.hash, hash)) {
                    if (nat.f_native !== null) {
                        throw new Error('Hash collision; cannot redefine native command ' +
                            '(did you call sink.ctx_native twice for the same command?)');
                    }
                    nat.natuser = natuser;
                    nat.f_native = f_native;
                    return;
                }
            }
        }
    }
    function context_new(prg, io) {
        var ctx = {
            user: null,
            natives: [],
            call_stk: [],
            lex_stk: [lxs_new([], null)],
            ccs_avail: [],
            lxs_avail: [],
            prg: prg,
            user_hint: [],
            io: io,
            lex_index: 0,
            pc: 0,
            lastpc: 0,
            timeout: 0,
            timeout_left: 0,
            rand_seed: 0,
            rand_i: 0,
            err: null,
            passed: false,
            failed: false,
            async: false,
            gc_level: gc_level.DEFAULT
        };
        if (!prg.repl) {
            for (var i = 0; i < prg.keyTable.length; i++)
                ctx.natives.push(native_new(prg.keyTable[i], null, null));
        }
        rand_seedauto(ctx);
        return ctx;
    }
    function context_reset(ctx) {
        while (ctx.call_stk.length > 0) {
            var s = ctx.call_stk.pop();
            if (typeof s === 'undefined')
                throw new Error('Cannot unwind call stack');
            var lx = ctx.lex_stk[ctx.lex_index];
            if (lx === null)
                throw new Error('Bad lexical stack');
            ctx.lex_stk[ctx.lex_index] = lx.next;
            lxs_release(ctx, lx);
            ctx.lex_index = s.lex_index;
            ctx.pc = s.pc;
            ccs_release(ctx, s);
        }
        ctx.passed = false;
        ctx.failed = false;
        ctx.pc = ctx.prg.ops.length;
        ctx.timeout_left = ctx.timeout;
    }
    function var_get(ctx, frame, index) {
        return ctx.lex_stk[frame].vals[index];
    }
    function var_set(ctx, frame, index, val) {
        ctx.lex_stk[frame].vals[index] = val;
    }
    function arget(ar, index) {
        if (islist(ar))
            return index >= ar.length ? 0 : ar[index];
        return ar;
    }
    function arsize(ar) {
        if (islist(ar))
            return ar.length;
        return 1;
    }
    var LT_ALLOWNIL = 1;
    var LT_ALLOWNUM = 2;
    var LT_ALLOWSTR = 4;
    function oper_typemask(a, mask) {
        switch (sink_typeof(a)) {
            case type.NIL: return (mask & LT_ALLOWNIL) !== 0;
            case type.NUM: return (mask & LT_ALLOWNUM) !== 0;
            case type.STR: return (mask & LT_ALLOWSTR) !== 0;
            case type.LIST: return false;
        }
    }
    function oper_typelist(a, mask) {
        if (islist(a)) {
            for (var i = 0; i < a.length; i++) {
                if (!oper_typemask(a[i], mask))
                    return false;
            }
            return true;
        }
        return oper_typemask(a, mask);
    }
    function oper_un(a, f_unary) {
        if (islist(a)) {
            var ret = new list();
            for (var i = 0; i < a.length; i++)
                ret.push(f_unary(a[i]));
            return ret;
        }
        return f_unary(a);
    }
    function oper_bin(a, b, f_binary) {
        if (islist(a) || islist(b)) {
            var m = Math.max(arsize(a), arsize(b));
            var ret = new list();
            for (var i = 0; i < m; i++)
                ret.push(f_binary(arget(a, i), arget(b, i)));
            return ret;
        }
        return f_binary(a, b);
    }
    function oper_tri(a, b, c, f_trinary) {
        if (islist(a) || islist(b) || islist(c)) {
            var m = Math.max(arsize(a), arsize(b), arsize(c));
            var ret = new list();
            for (var i = 0; i < m; i++)
                ret.push(f_trinary(arget(a, i), arget(b, i), arget(c, i)));
            return ret;
        }
        return f_trinary(a, b, c);
    }
    function str_cmp(a, b) {
        return a === b ? 0 : (a < b ? -1 : 1);
    }
    function opihelp_num_max(vals, li) {
        var max = exports.NIL;
        for (var i = 0; i < vals.length; i++) {
            var v = vals[i];
            if (isnum(v)) {
                if (isnil(max) || v > max)
                    max = v;
            }
            else if (islist(v)) {
                if (li.indexOf(v) >= 0)
                    return exports.NIL;
                li.push(v);
                var lm = opihelp_num_max(v, li);
                if (!isnil(lm) && (isnil(max) || lm > max))
                    max = lm;
                li.pop();
            }
        }
        return max;
    }
    function opi_num_max(vals) {
        return opihelp_num_max(vals, []);
    }
    function opihelp_num_min(vals, li) {
        var min = exports.NIL;
        for (var i = 0; i < vals.length; i++) {
            var v = vals[i];
            if (isnum(v)) {
                if (isnil(min) || v < min)
                    min = v;
            }
            else if (islist(v)) {
                if (li.indexOf(v) >= 0)
                    return exports.NIL;
                li.push(v);
                var lm = opihelp_num_min(v, li);
                if (!isnil(lm) && (isnil(min) || lm < min))
                    min = lm;
                li.pop();
            }
        }
        return min;
    }
    function opi_num_min(vals) {
        return opihelp_num_min(vals, []);
    }
    function opi_num_base(num, len, base) {
        if (len > 256)
            len = 256;
        var digits = '0123456789ABCDEF';
        var buf = '';
        if (num < 0) {
            buf = '-';
            num = -num;
        }
        if (base === 16)
            buf += '0x';
        else if (base === 8)
            buf += '0c';
        else if (base === 2)
            buf += '0b';
        else
            throw new Error('Bad base for number conversion');
        var buf2 = '';
        var bodysize = 0;
        var nint = Math.floor(num);
        var nfra = num - nint;
        while (nint > 0 && bodysize < 50) {
            buf2 = digits.charAt(nint % base) + buf2;
            bodysize++;
            nint = Math.floor(nint / base);
        }
        var bi = 0;
        while (bodysize + bi < len && bodysize + bi < 32 && buf.length < 50) {
            buf += '0';
            bi++;
        }
        if (bodysize > 0)
            buf += buf2;
        else if (len <= 0)
            buf += '0';
        if (nfra > 0.00001) {
            buf += '.';
            var i = 0;
            while (nfra > 0.00001 && i < 16) {
                nfra *= base;
                nint = Math.floor(nfra);
                buf += digits.charAt(nint);
                nfra -= nint;
                i++;
            }
        }
        return buf;
    }
    function rand_seedauto(ctx) {
        ctx.rand_seed = (Math.random() * 0x10000000) | 0;
        ctx.rand_i = (Math.random() * 0x10000000) | 0;
        for (var i = 0; i < 1000; i++)
            rand_int(ctx);
        ctx.rand_i = 0;
    }
    exports.rand_seedauto = rand_seedauto;
    function rand_seed(ctx, n) {
        ctx.rand_seed = n | 0;
        ctx.rand_i = 0;
    }
    exports.rand_seed = rand_seed;
    function rand_int(ctx) {
        var m = 0x5bd1e995;
        var k = Math.imul(ctx.rand_i, m);
        ctx.rand_i = (ctx.rand_i + 1) | 0;
        ctx.rand_seed = Math.imul(k ^ (k >>> 24) ^ Math.imul(ctx.rand_seed, m), m);
        var res = (ctx.rand_seed ^ (ctx.rand_seed >>> 13)) | 0;
        if (res < 0)
            return res + 0x100000000;
        return res;
    }
    exports.rand_int = rand_int;
    function rand_num(ctx) {
        var M1 = rand_int(ctx);
        var M2 = rand_int(ctx);
        var view = new DataView(new ArrayBuffer(8));
        view.setInt32(0, (M1 << 20) | (M2 >>> 12), true);
        view.setInt32(4, 0x3FF00000 | (M1 >>> 12), true);
        return view.getFloat64(0, true) - 1;
    }
    exports.rand_num = rand_num;
    function rand_getstate(ctx) {
        if (ctx.rand_i < 0) {
            if (ctx.rand_seed < 0)
                return new list(ctx.rand_seed + 0x100000000, ctx.rand_i + 0x100000000);
            return new list(ctx.rand_seed, ctx.rand_i + 0x100000000);
        }
        else if (ctx.rand_seed < 0)
            return new list(ctx.rand_seed + 0x100000000, ctx.rand_i);
        return new list(ctx.rand_seed, ctx.rand_i);
    }
    exports.rand_getstate = rand_getstate;
    function rand_setstate(ctx, a) {
        if (!islist(a) || a.length < 2) {
            opi_abort(ctx, 'Expecting list of two integers');
            return;
        }
        var A = a[0];
        var B = a[1];
        if (!isnum(A) || !isnum(B)) {
            opi_abort(ctx, 'Expecting list of two integers');
            return;
        }
        ctx.rand_seed = A | 0;
        ctx.rand_i = B | 0;
    }
    exports.rand_setstate = rand_setstate;
    function rand_pick(ctx, a) {
        if (!islist(a)) {
            opi_abort(ctx, 'Expecting list');
            return exports.NIL;
        }
        if (a.length <= 0)
            return exports.NIL;
        return a[Math.floor(rand_num(ctx) * a.length)];
    }
    exports.rand_pick = rand_pick;
    function rand_shuffle(ctx, a) {
        if (!islist(a)) {
            opi_abort(ctx, 'Expecting list');
            return;
        }
        var m = a.length;
        while (m > 1) {
            var i = Math.floor(rand_num(ctx) * m);
            m--;
            if (m != i) {
                var t = a[m];
                a[m] = a[i];
                a[i] = t;
            }
        }
    }
    exports.rand_shuffle = rand_shuffle;
    function str_new(ctx, vals) {
        return list_joinplain(vals, ' ');
    }
    exports.str_new = str_new;
    function str_split(ctx, a, b) {
        if ((!isstr(a) && !isnum(a)) || (!isstr(b) && !isnum(b))) {
            opi_abort(ctx, 'Expecting strings');
            return exports.NIL;
        }
        var haystack = tostr(a);
        var needle = tostr(b);
        var result = new list();
        result.push.apply(result, haystack.split(needle));
        return result;
    }
    exports.str_split = str_split;
    function str_replace(ctx, a, b, c) {
        var ls = str_split(ctx, a, b);
        if (ctx.failed)
            return exports.NIL;
        return list_join(ctx, ls, c);
    }
    exports.str_replace = str_replace;
    function str_find(ctx, a, b, c) {
        var hx = 0;
        if (isnil(c))
            hx = 0;
        else if (isnum(c))
            hx = c;
        else {
            opi_abort(ctx, 'Expecting number');
            return exports.NIL;
        }
        if ((!isstr(a) && !isnum(a)) || (!isstr(b) && !isnum(b))) {
            opi_abort(ctx, 'Expecting strings');
            return exports.NIL;
        }
        var haystack = tostr(a);
        var needle = tostr(b);
        if (needle.length <= 0)
            return 0;
        if (hx < 0)
            hx += haystack.length;
        var pos = haystack.indexOf(needle, hx);
        if (pos >= 0)
            return pos;
        return exports.NIL;
    }
    exports.str_find = str_find;
    function str_rfind(ctx, a, b, c) {
        var hx = 0;
        if (isnum(c))
            hx = c;
        else if (!isnil(c)) {
            opi_abort(ctx, 'Expecting number');
            return exports.NIL;
        }
        if ((!isstr(a) && !isnum(a)) || (!isstr(b) && !isnum(b))) {
            opi_abort(ctx, 'Expecting strings');
            return exports.NIL;
        }
        var haystack = tostr(a);
        var needle = tostr(b);
        if (needle.length <= 0)
            return haystack.length;
        if (isnil(c))
            hx = haystack.length - needle.length;
        if (hx < 0)
            hx += haystack.length;
        var pos = haystack.lastIndexOf(needle, hx);
        if (pos >= 0)
            return pos;
        return exports.NIL;
    }
    exports.str_rfind = str_rfind;
    function str_begins(ctx, a, b) {
        if ((!isstr(a) && !isnum(a)) || (!isstr(b) && !isnum(b))) {
            opi_abort(ctx, 'Expecting strings');
            return false;
        }
        var s1 = tostr(a);
        var s2 = tostr(b);
        return s2.length == 0 || (s1.length >= s2.length && s1.substr(0, s2.length) === s2);
    }
    exports.str_begins = str_begins;
    function str_ends(ctx, a, b) {
        if ((!isstr(a) && !isnum(a)) || (!isstr(b) && !isnum(b))) {
            opi_abort(ctx, 'Expecting strings');
            return false;
        }
        var s1 = tostr(a);
        var s2 = tostr(b);
        return s2.length === 0 || (s1.length >= s2.length && s1.substr(-s2.length) === s2);
    }
    exports.str_ends = str_ends;
    function str_pad(ctx, a, b) {
        if (!isstr(a) && !isnum(a)) {
            opi_abort(ctx, 'Expecting string');
            return exports.NIL;
        }
        var s = tostr(a);
        b |= 0;
        if (b < 0) {
            b = -b;
            if (s.length >= b)
                return s;
            return (new Array(b - s.length + 1)).join(' ') + s;
        }
        else {
            if (s.length >= b)
                return s;
            return s + (new Array(b - s.length + 1)).join(' ');
        }
    }
    exports.str_pad = str_pad;
    function opihelp_str_lower(ctx, a) {
        if (!isstr(a) && !isnum(a)) {
            opi_abort(ctx, 'Expecting string');
            return exports.NIL;
        }
        var s = tostr(a);
        return s.replace(/[A-Z]/g, function (ch) { return ch.toLowerCase(); });
    }
    function opihelp_str_upper(ctx, a) {
        if (!isstr(a) && !isnum(a)) {
            opi_abort(ctx, 'Expecting string');
            return exports.NIL;
        }
        var s = tostr(a);
        return s.replace(/[a-z]/g, function (ch) { return ch.toUpperCase(); });
    }
    function opihelp_str_trim(ctx, a) {
        if (!isstr(a) && !isnum(a)) {
            opi_abort(ctx, 'Expecting string');
            return exports.NIL;
        }
        var s = tostr(a);
        return s.replace(/^[\x09\x0A\x0B\x0C\x0D\x20]*|[\x09\x0A\x0B\x0C\x0D\x20]*$/g, '');
    }
    function opihelp_str_rev(ctx, a) {
        if (!isstr(a) && !isnum(a)) {
            opi_abort(ctx, 'Expecting string');
            return exports.NIL;
        }
        var s = tostr(a);
        if (s.length <= 0)
            return a;
        return s.split('').reverse().join('');
    }
    function opi_str_unop(ctx, a, single) {
        if (islist(a)) {
            var ret = new list();
            for (var i = 0; i < a.length; i++)
                ret.push(single(ctx, a[i]));
            return ret;
        }
        return single(ctx, a);
    }
    function str_lower(ctx, a) {
        return opi_str_unop(ctx, a, opihelp_str_lower);
    }
    exports.str_lower = str_lower;
    function str_upper(ctx, a) {
        return opi_str_unop(ctx, a, opihelp_str_upper);
    }
    exports.str_upper = str_upper;
    function str_trim(ctx, a) {
        return opi_str_unop(ctx, a, opihelp_str_trim);
    }
    exports.str_trim = str_trim;
    function str_rev(ctx, a) {
        return opi_str_unop(ctx, a, opihelp_str_rev);
    }
    exports.str_rev = str_rev;
    function str_rep(ctx, a, rep) {
        if (!isstr(a) && !isnum(a)) {
            opi_abort(ctx, 'Expecting string');
            return exports.NIL;
        }
        if (rep <= 0)
            return '';
        else if (rep === 1)
            return a;
        var s = tostr(a);
        if (s.length <= 0)
            return s;
        var size = s.length * rep;
        if (size > 100000000) {
            opi_abort(ctx, 'Constructed string is too large');
            return exports.NIL;
        }
        return (new Array(rep + 1)).join(s);
    }
    exports.str_rep = str_rep;
    function str_list(ctx, a) {
        if (!isstr(a) && !isnum(a)) {
            opi_abort(ctx, 'Expecting string');
            return exports.NIL;
        }
        var s = tostr(a);
        var r = new list();
        for (var i = 0; i < s.length; i++)
            r.push(s.charCodeAt(i));
        return r;
    }
    exports.str_list = str_list;
    function str_byte(ctx, a, b) {
        if (!isstr(a)) {
            opi_abort(ctx, 'Expecting string');
            return exports.NIL;
        }
        if (b < 0)
            b += a.length;
        if (b < 0 || b >= a.length)
            return exports.NIL;
        return a.charCodeAt(b);
    }
    exports.str_byte = str_byte;
    function str_hash(ctx, a, seed) {
        if (!isstr(a) && !isnum(a)) {
            opi_abort(ctx, 'Expecting string');
            return exports.NIL;
        }
        var s = tostr(a);
        var out = str_hashplain(s, seed);
        return new list(out[0], out[1], out[2], out[3]);
    }
    exports.str_hash = str_hash;
    function opihelp_codepoint(b) {
        return isnum(b) &&
            Math.floor(b) == b &&
            b >= 0 && b < 0x110000 &&
            (b < 0xD800 || b >= 0xE000);
    }
    function utf8_valid(ctx, a) {
        if (isstr(a)) {
            var state = 0;
            var codepoint = 0;
            var min = 0;
            for (var i = 0; i < a.length; i++) {
                var b = a.charCodeAt(i);
                if (state == 0) {
                    if (b < 0x80)
                        continue;
                    else if (b < 0xC0)
                        return false;
                    else if (b < 0xE0) {
                        codepoint = b & 0x1F;
                        min = 0x80;
                        state = 1;
                    }
                    else if (b < 0xF0) {
                        codepoint = b & 0x0F;
                        min = 0x800;
                        state = 2;
                    }
                    else if (b < 0xF8) {
                        codepoint = b & 0x07;
                        min = 0x10000;
                        state = 3;
                    }
                    else
                        return false;
                }
                else {
                    if (b < 0x80 || b >= 0xC0)
                        return false;
                    codepoint = (codepoint << 6) | (b & 0x3F);
                    state--;
                    if (state == 0) {
                        if (codepoint < min ||
                            codepoint >= 0x110000 ||
                            (codepoint >= 0xD800 && codepoint < 0xE000))
                            return false;
                    }
                }
            }
            return state == 0;
        }
        else if (islist(a)) {
            for (var i = 0; i < a.length; i++) {
                if (!opihelp_codepoint(a[i]))
                    return false;
            }
            return true;
        }
        return false;
    }
    exports.utf8_valid = utf8_valid;
    function utf8_list(ctx, a) {
        if (!isstr(a)) {
            opi_abort(ctx, 'Expecting string');
            return exports.NIL;
        }
        var res = new list();
        var state = 0;
        var codepoint = 0;
        var min = 0;
        for (var i = 0; i < a.length; i++) {
            var b = a.charCodeAt(i);
            if (state == 0) {
                if (b < 0x80)
                    res.push(b);
                else if (b < 0xC0) {
                    opi_abort(ctx, 'Invalid UTF-8 string');
                    return exports.NIL;
                }
                else if (b < 0xE0) {
                    codepoint = b & 0x1F;
                    min = 0x80;
                    state = 1;
                }
                else if (b < 0xF0) {
                    codepoint = b & 0x0F;
                    min = 0x800;
                    state = 2;
                }
                else if (b < 0xF8) {
                    codepoint = b & 0x07;
                    min = 0x10000;
                    state = 3;
                }
                else {
                    opi_abort(ctx, 'Invalid UTF-8 string');
                    return exports.NIL;
                }
            }
            else {
                if (b < 0x80 || b >= 0xC0) {
                    opi_abort(ctx, 'Invalid UTF-8 string');
                    return exports.NIL;
                }
                codepoint = (codepoint << 6) | (b & 0x3F);
                state--;
                if (state == 0) {
                    if (codepoint < min ||
                        codepoint >= 0x110000 ||
                        (codepoint >= 0xD800 && codepoint < 0xE000)) {
                        opi_abort(ctx, 'Invalid UTF-8 string');
                        return exports.NIL;
                    }
                    res.push(codepoint);
                }
            }
        }
        return res;
    }
    exports.utf8_list = utf8_list;
    function utf8_str(ctx, a) {
        if (!islist(a)) {
            opi_abort(ctx, "Expecting list");
            return exports.NIL;
        }
        var bytes = '';
        for (var i = 0; i < a.length; i++) {
            var b = a[i];
            if (!opihelp_codepoint(b)) {
                opi_abort(ctx, 'Invalid list of codepoints');
                return exports.NIL;
            }
            if (typeof b !== 'number')
                throw new Error('Expecting list of numbers for utf8.str');
            if (b < 0x80)
                bytes += String.fromCharCode(b);
            else if (b < 0x800) {
                bytes += String.fromCharCode(0xC0 | (b >> 6));
                bytes += String.fromCharCode(0x80 | (b & 0x3F));
            }
            else if (b < 0x10000) {
                bytes += String.fromCharCode(0xE0 | (b >> 12));
                bytes += String.fromCharCode(0x80 | ((b >> 6) & 0x3F));
                bytes += String.fromCharCode(0x80 | (b & 0x3F));
            }
            else {
                bytes += String.fromCharCode(0xF0 | (b >> 18));
                bytes += String.fromCharCode(0x80 | ((b >> 12) & 0x3F));
                bytes += String.fromCharCode(0x80 | ((b >> 6) & 0x3F));
                bytes += String.fromCharCode(0x80 | (b & 0x3F));
            }
        }
        return bytes;
    }
    exports.utf8_str = utf8_str;
    function struct_size(ctx, a) {
        if (!islist(a))
            return exports.NIL;
        var tot = 0;
        for (var i = 0; i < a.length; i++) {
            var b = a[i];
            if (!isnum(b))
                return exports.NIL;
            switch (b) {
                case struct_enum.U8:
                    tot += 1;
                    break;
                case struct_enum.U16:
                    tot += 2;
                    break;
                case struct_enum.UL16:
                    tot += 2;
                    break;
                case struct_enum.UB16:
                    tot += 2;
                    break;
                case struct_enum.U32:
                    tot += 4;
                    break;
                case struct_enum.UL32:
                    tot += 4;
                    break;
                case struct_enum.UB32:
                    tot += 4;
                    break;
                case struct_enum.S8:
                    tot += 1;
                    break;
                case struct_enum.S16:
                    tot += 2;
                    break;
                case struct_enum.SL16:
                    tot += 2;
                    break;
                case struct_enum.SB16:
                    tot += 2;
                    break;
                case struct_enum.S32:
                    tot += 4;
                    break;
                case struct_enum.SL32:
                    tot += 4;
                    break;
                case struct_enum.SB32:
                    tot += 4;
                    break;
                case struct_enum.F32:
                    tot += 4;
                    break;
                case struct_enum.FL32:
                    tot += 4;
                    break;
                case struct_enum.FB32:
                    tot += 4;
                    break;
                case struct_enum.F64:
                    tot += 8;
                    break;
                case struct_enum.FL64:
                    tot += 8;
                    break;
                case struct_enum.FB64:
                    tot += 8;
                    break;
                default:
                    return exports.NIL;
            }
        }
        return tot <= 0 ? exports.NIL : tot;
    }
    exports.struct_size = struct_size;
    var LE = (function () {
        var b = new ArrayBuffer(2);
        (new DataView(b)).setInt16(0, 1, true);
        return (new Int16Array(b))[0] === 1;
    })();
    function struct_str(ctx, a, b) {
        if (!islist(a) || !islist(b)) {
            opi_abort(ctx, 'Expecting list');
            return exports.NIL;
        }
        if (b.length <= 0 || a.length % b.length != 0) {
            opi_abort(ctx, 'Invalid conversion');
            return exports.NIL;
        }
        var arsize = a.length / b.length;
        var res = '';
        for (var ar = 0; ar < arsize; ar++) {
            for (var i = 0; i < b.length; i++) {
                var d = a[i + ar * b.length];
                var t = b[i];
                if (!isnum(d) || !isnum(t)) {
                    opi_abort(ctx, 'Invalid conversion');
                    return exports.NIL;
                }
                if (t === struct_enum.U8 || t === struct_enum.S8)
                    res += String.fromCharCode(d & 0xFF);
                else if (t === struct_enum.UL16 || t === struct_enum.SL16 ||
                    (LE && (t === struct_enum.U16 || t === struct_enum.S16))) {
                    dview.setUint16(0, d & 0xFFFF, true);
                    res += String.fromCharCode(dview.getUint8(0));
                    res += String.fromCharCode(dview.getUint8(1));
                }
                else if (t === struct_enum.UB16 || t === struct_enum.SB16 ||
                    (!LE && (t === struct_enum.U16 || t === struct_enum.S16))) {
                    dview.setUint16(0, d & 0xFFFF, false);
                    res += String.fromCharCode(dview.getUint8(0));
                    res += String.fromCharCode(dview.getUint8(1));
                }
                else if (t === struct_enum.UL32 || t === struct_enum.SL32 ||
                    (LE && (t === struct_enum.U32 || t === struct_enum.S32))) {
                    dview.setUint32(0, d & 0xFFFFFFFF, true);
                    res += String.fromCharCode(dview.getUint8(0));
                    res += String.fromCharCode(dview.getUint8(1));
                    res += String.fromCharCode(dview.getUint8(2));
                    res += String.fromCharCode(dview.getUint8(3));
                }
                else if (t === struct_enum.UB32 || t === struct_enum.SB32 ||
                    (!LE && (t === struct_enum.U32 || t === struct_enum.S32))) {
                    dview.setUint32(0, d & 0xFFFFFFFF, false);
                    res += String.fromCharCode(dview.getUint8(0));
                    res += String.fromCharCode(dview.getUint8(1));
                    res += String.fromCharCode(dview.getUint8(2));
                    res += String.fromCharCode(dview.getUint8(3));
                }
                else if (t === struct_enum.FL32 || (LE && t === struct_enum.F32)) {
                    dview.setFloat32(0, d, true);
                    res += String.fromCharCode(dview.getUint8(0));
                    res += String.fromCharCode(dview.getUint8(1));
                    res += String.fromCharCode(dview.getUint8(2));
                    res += String.fromCharCode(dview.getUint8(3));
                }
                else if (t === struct_enum.FB32 || (!LE && t === struct_enum.F32)) {
                    dview.setFloat32(0, d, false);
                    res += String.fromCharCode(dview.getUint8(0));
                    res += String.fromCharCode(dview.getUint8(1));
                    res += String.fromCharCode(dview.getUint8(2));
                    res += String.fromCharCode(dview.getUint8(3));
                }
                else if (t === struct_enum.FL64 || (LE && t === struct_enum.F64)) {
                    dview.setFloat64(0, d, true);
                    res += String.fromCharCode(dview.getUint8(0));
                    res += String.fromCharCode(dview.getUint8(1));
                    res += String.fromCharCode(dview.getUint8(2));
                    res += String.fromCharCode(dview.getUint8(3));
                    res += String.fromCharCode(dview.getUint8(4));
                    res += String.fromCharCode(dview.getUint8(5));
                    res += String.fromCharCode(dview.getUint8(6));
                    res += String.fromCharCode(dview.getUint8(7));
                }
                else if (t === struct_enum.FB64 || (!LE && t === struct_enum.F64)) {
                    dview.setFloat64(0, d, false);
                    res += String.fromCharCode(dview.getUint8(0));
                    res += String.fromCharCode(dview.getUint8(1));
                    res += String.fromCharCode(dview.getUint8(2));
                    res += String.fromCharCode(dview.getUint8(3));
                    res += String.fromCharCode(dview.getUint8(4));
                    res += String.fromCharCode(dview.getUint8(5));
                    res += String.fromCharCode(dview.getUint8(6));
                    res += String.fromCharCode(dview.getUint8(7));
                }
                else {
                    opi_abort(ctx, 'Invalid conversion');
                    return exports.NIL;
                }
            }
        }
        return res;
    }
    exports.struct_str = struct_str;
    function struct_list(ctx, a, b) {
        if (!isstr(a)) {
            opi_abort(ctx, 'Expecting string');
            return exports.NIL;
        }
        if (!islist(b)) {
            opi_abort(ctx, 'Expecting list');
            return exports.NIL;
        }
        var size = struct_size(ctx, b);
        if (!isnum(size) || a.length % size !== 0) {
            opi_abort(ctx, 'Invalid conversion');
            return exports.NIL;
        }
        var res = new list();
        var pos = 0;
        while (pos < a.length) {
            for (var i = 0; i < b.length; i++) {
                var t = b[i];
                if (!isnum(t)) {
                    opi_abort(ctx, 'Invalid conversion');
                    return exports.NIL;
                }
                if (t === struct_enum.U8) {
                    dview.setUint8(0, a.charCodeAt(pos++));
                    res.push(dview.getUint8(0));
                }
                else if (t === struct_enum.S8) {
                    dview.setUint8(0, a.charCodeAt(pos++));
                    res.push(dview.getInt8(0));
                }
                else if (t === struct_enum.UL16 || (LE && t === struct_enum.U16)) {
                    dview.setUint8(0, a.charCodeAt(pos++));
                    dview.setUint8(1, a.charCodeAt(pos++));
                    res.push(dview.getUint16(0, true));
                }
                else if (t === struct_enum.SL16 || (LE && t === struct_enum.S16)) {
                    dview.setUint8(0, a.charCodeAt(pos++));
                    dview.setUint8(1, a.charCodeAt(pos++));
                    res.push(dview.getInt16(0, true));
                }
                else if (t === struct_enum.UB16 || (!LE && t === struct_enum.U16)) {
                    dview.setUint8(0, a.charCodeAt(pos++));
                    dview.setUint8(1, a.charCodeAt(pos++));
                    res.push(dview.getUint16(0, false));
                }
                else if (t === struct_enum.SB16 || (!LE && t === struct_enum.S16)) {
                    dview.setUint8(0, a.charCodeAt(pos++));
                    dview.setUint8(1, a.charCodeAt(pos++));
                    res.push(dview.getInt16(0, false));
                }
                else if (t === struct_enum.UL32 || (LE && t === struct_enum.U32)) {
                    dview.setUint8(0, a.charCodeAt(pos++));
                    dview.setUint8(1, a.charCodeAt(pos++));
                    dview.setUint8(2, a.charCodeAt(pos++));
                    dview.setUint8(3, a.charCodeAt(pos++));
                    res.push(dview.getUint32(0, true));
                }
                else if (t === struct_enum.SL32 || (LE && t === struct_enum.S32)) {
                    dview.setUint8(0, a.charCodeAt(pos++));
                    dview.setUint8(1, a.charCodeAt(pos++));
                    dview.setUint8(2, a.charCodeAt(pos++));
                    dview.setUint8(3, a.charCodeAt(pos++));
                    res.push(dview.getInt32(0, true));
                }
                else if (t === struct_enum.UB32 || (!LE && t === struct_enum.U32)) {
                    dview.setUint8(0, a.charCodeAt(pos++));
                    dview.setUint8(1, a.charCodeAt(pos++));
                    dview.setUint8(2, a.charCodeAt(pos++));
                    dview.setUint8(3, a.charCodeAt(pos++));
                    res.push(dview.getUint32(0, false));
                }
                else if (t === struct_enum.SB32 || (!LE && t === struct_enum.S32)) {
                    dview.setUint8(0, a.charCodeAt(pos++));
                    dview.setUint8(1, a.charCodeAt(pos++));
                    dview.setUint8(2, a.charCodeAt(pos++));
                    dview.setUint8(3, a.charCodeAt(pos++));
                    res.push(dview.getInt32(0, false));
                }
                else if (t === struct_enum.FL32 || (LE && t === struct_enum.F32)) {
                    dview.setUint8(0, a.charCodeAt(pos++));
                    dview.setUint8(1, a.charCodeAt(pos++));
                    dview.setUint8(2, a.charCodeAt(pos++));
                    dview.setUint8(3, a.charCodeAt(pos++));
                    res.push(dview.getFloat32(0, true));
                }
                else if (t === struct_enum.FB32 || (!LE && t === struct_enum.F32)) {
                    dview.setUint8(0, a.charCodeAt(pos++));
                    dview.setUint8(1, a.charCodeAt(pos++));
                    dview.setUint8(2, a.charCodeAt(pos++));
                    dview.setUint8(3, a.charCodeAt(pos++));
                    res.push(dview.getFloat32(0, false));
                }
                else if (t === struct_enum.FL64 || (LE && t === struct_enum.F64)) {
                    dview.setUint8(0, a.charCodeAt(pos++));
                    dview.setUint8(1, a.charCodeAt(pos++));
                    dview.setUint8(2, a.charCodeAt(pos++));
                    dview.setUint8(3, a.charCodeAt(pos++));
                    dview.setUint8(4, a.charCodeAt(pos++));
                    dview.setUint8(5, a.charCodeAt(pos++));
                    dview.setUint8(6, a.charCodeAt(pos++));
                    dview.setUint8(7, a.charCodeAt(pos++));
                    res.push(dview.getFloat64(0, true));
                }
                else if (t === struct_enum.FB64 || (!LE && t === struct_enum.F64)) {
                    dview.setUint8(0, a.charCodeAt(pos++));
                    dview.setUint8(1, a.charCodeAt(pos++));
                    dview.setUint8(2, a.charCodeAt(pos++));
                    dview.setUint8(3, a.charCodeAt(pos++));
                    dview.setUint8(4, a.charCodeAt(pos++));
                    dview.setUint8(5, a.charCodeAt(pos++));
                    dview.setUint8(6, a.charCodeAt(pos++));
                    dview.setUint8(7, a.charCodeAt(pos++));
                    res.push(dview.getFloat64(0, false));
                }
                else {
                    opi_abort(ctx, 'Invalid conversion');
                    return exports.NIL;
                }
            }
        }
        return res;
    }
    exports.struct_list = struct_list;
    function struct_isLE() {
        return LE;
    }
    exports.struct_isLE = struct_isLE;
    function unop_num_neg(a) {
        return -a;
    }
    function unop_tonum(a) {
        if (isnum(a))
            return a;
        if (!isstr(a))
            return exports.NIL;
        var npi = numpart_new();
        var tonum_enum;
        (function (tonum_enum) {
            tonum_enum[tonum_enum["START"] = 0] = "START";
            tonum_enum[tonum_enum["NEG"] = 1] = "NEG";
            tonum_enum[tonum_enum["N0"] = 2] = "N0";
            tonum_enum[tonum_enum["N2"] = 3] = "N2";
            tonum_enum[tonum_enum["BODY"] = 4] = "BODY";
            tonum_enum[tonum_enum["FRAC"] = 5] = "FRAC";
            tonum_enum[tonum_enum["EXP"] = 6] = "EXP";
            tonum_enum[tonum_enum["EXP_BODY"] = 7] = "EXP_BODY";
        })(tonum_enum || (tonum_enum = {}));
        var state = tonum_enum.START;
        var hasval = false;
        for (var i = 0; i < a.length; i++) {
            var ch = a.charAt(i);
            switch (state) {
                case tonum_enum.START:
                    if (isNum(ch)) {
                        hasval = true;
                        npi.val = toHex(ch);
                        if (npi.val === 0)
                            state = tonum_enum.N0;
                        else
                            state = tonum_enum.BODY;
                    }
                    else if (ch === '-') {
                        npi.sign = -1;
                        state = tonum_enum.NEG;
                    }
                    else if (ch === '.')
                        state = tonum_enum.FRAC;
                    else if (!isSpace(ch))
                        return exports.NIL;
                    break;
                case tonum_enum.NEG:
                    if (isNum(ch)) {
                        hasval = true;
                        npi.val = toHex(ch);
                        if (npi.val === 0)
                            state = tonum_enum.N0;
                        else
                            state = tonum_enum.BODY;
                    }
                    else if (ch === '.')
                        state = tonum_enum.FRAC;
                    else
                        return exports.NIL;
                    break;
                case tonum_enum.N0:
                    if (ch === 'b') {
                        npi.base = 2;
                        state = tonum_enum.N2;
                    }
                    else if (ch === 'c') {
                        npi.base = 8;
                        state = tonum_enum.N2;
                    }
                    else if (ch === 'x') {
                        npi.base = 16;
                        state = tonum_enum.N2;
                    }
                    else if (ch === '_')
                        state = tonum_enum.BODY;
                    else if (ch === '.')
                        state = tonum_enum.FRAC;
                    else if (ch === 'e' || ch === 'E')
                        state = tonum_enum.EXP;
                    else if (isNum(ch)) {
                        npi.val = toHex(ch);
                        state = tonum_enum.BODY;
                    }
                    else
                        return 0;
                    break;
                case tonum_enum.N2:
                    if (isHex(ch)) {
                        npi.val = toHex(ch);
                        if (npi.val >= npi.base)
                            return 0;
                        state = tonum_enum.BODY;
                    }
                    else if (ch !== '_')
                        return 0;
                    break;
                case tonum_enum.BODY:
                    if (ch === '.')
                        state = tonum_enum.FRAC;
                    else if ((npi.base === 10 && (ch === 'e' || ch === 'E')) ||
                        (npi.base !== 10 && (ch === 'p' || ch === 'P')))
                        state = tonum_enum.EXP;
                    else if (isHex(ch)) {
                        var v = toHex(ch);
                        if (v >= npi.base)
                            return numpart_calc(npi);
                        else
                            npi.val = npi.val * npi.base + v;
                    }
                    else if (ch !== '_')
                        return numpart_calc(npi);
                    break;
                case tonum_enum.FRAC:
                    if (hasval && ((npi.base === 10 && (ch === 'e' || ch === 'E')) ||
                        (npi.base !== 10 && (ch === 'p' || ch === 'P'))))
                        state = tonum_enum.EXP;
                    else if (isHex(ch)) {
                        hasval = true;
                        var v = toHex(ch);
                        if (v >= npi.base)
                            return numpart_calc(npi);
                        npi.frac = npi.frac * npi.base + v;
                        npi.flen++;
                    }
                    else if (ch !== '_')
                        return numpart_calc(npi);
                    break;
                case tonum_enum.EXP:
                    if (ch !== '_') {
                        npi.esign = ch === '-' ? -1 : 1;
                        state = tonum_enum.EXP_BODY;
                        if (ch !== '+' && ch !== '-')
                            i--;
                    }
                    break;
                case tonum_enum.EXP_BODY:
                    if (isNum(ch))
                        npi.eval = npi.eval * 10.0 + toHex(ch);
                    else if (ch !== '_')
                        return numpart_calc(npi);
                    break;
            }
        }
        if (state === tonum_enum.START || state === tonum_enum.NEG || (state === tonum_enum.FRAC && !hasval))
            return exports.NIL;
        return numpart_calc(npi);
    }
    var unop_num_abs = Math.abs;
    function unop_num_sign(a) {
        return isNaN(a) ? NAN : (a < 0 ? -1 : (a > 0 ? 1 : 0));
    }
    var unop_num_floor = Math.floor;
    var unop_num_ceil = Math.ceil;
    var unop_num_round = Math.round;
    var unop_num_trunc = Math.trunc;
    function unop_num_isnan(a) {
        return bool(isNaN(a));
    }
    function unop_num_isfinite(a) {
        return bool(isFinite(a));
    }
    var unop_num_sin = Math.sin;
    var unop_num_cos = Math.cos;
    var unop_num_tan = Math.tan;
    var unop_num_asin = Math.asin;
    var unop_num_acos = Math.acos;
    var unop_num_atan = Math.atan;
    var unop_num_log = Math.log;
    var unop_num_log2 = Math.log2;
    var unop_num_log10 = Math.log10;
    var unop_num_exp = Math.exp;
    function binop_num_add(a, b) {
        return a + b;
    }
    function binop_num_sub(a, b) {
        return a - b;
    }
    function binop_num_mul(a, b) {
        return a * b;
    }
    function binop_num_div(a, b) {
        return a / b;
    }
    function binop_num_mod(a, b) {
        return a % b;
    }
    var binop_num_pow = Math.pow;
    var binop_num_atan2 = Math.atan2;
    function binop_num_hex(a, b) {
        return isNaN(a) ? NAN :
            opi_num_base(a, isnil(b) ? 0 : b, 16);
    }
    function binop_num_oct(a, b) {
        return isNaN(a) ? NAN :
            opi_num_base(a, isnil(b) ? 0 : b, 8);
    }
    function binop_num_bin(a, b) {
        return isNaN(a) ? NAN :
            opi_num_base(a, isnil(b) ? 0 : b, 2);
    }
    function triop_num_clamp(a, b, c) {
        return isNaN(a) || isNaN(b) || isNaN(c) ? NAN :
            (a < b ? b :
                (a > c ? c : a));
    }
    function triop_num_lerp(a, b, c) {
        return a + (b - a) * c;
    }
    function unop_int_new(a) {
        return a | 0;
    }
    function unop_int_not(a) {
        return ~(a | 0);
    }
    var unop_int_clz = Math.clz32;
    function unop_int_pop(a) {
        var n = a | 0;
        n = (n & 0x55555555) + ((n >> 1) & 0x55555555);
        n = (n & 0x33333333) + ((n >> 2) & 0x33333333);
        n = (n & 0x0F0F0F0F) + ((n >> 4) & 0x0F0F0F0F);
        n = (n & 0x00FF00FF) + ((n >> 8) & 0x00FF00FF);
        n = (n & 0x0000FFFF) + ((n >> 16) & 0x0000FFFF);
        return n;
    }
    function unop_int_bswap(a) {
        var n = a | 0;
        n = (n >>> 24) | ((n >>> 8) & 0xFF00) | ((n << 8) & 0xFF0000) | (n << 24);
        if (n < 0)
            n += 0x100000000;
        return n;
    }
    function binop_int_and(a, b) {
        return (a | 0) & (b | 0);
    }
    function binop_int_or(a, b) {
        return (a | 0) | (b | 0);
    }
    function binop_int_xor(a, b) {
        return (a | 0) ^ (b | 0);
    }
    function binop_int_shl(a, b) {
        return (a | 0) << (b | 0);
    }
    function binop_int_shr(a, b) {
        return (a | 0) >>> (b | 0);
    }
    function binop_int_sar(a, b) {
        return (a | 0) >> (b | 0);
    }
    function binop_int_add(a, b) {
        return (a | 0) + (b | 0);
    }
    function binop_int_sub(a, b) {
        return (a | 0) - (b | 0);
    }
    function binop_int_mul(a, b) {
        return (a | 0) * (b | 0);
    }
    function binop_int_div(a, b) {
        var i = b | 0;
        if (i == 0)
            return 0;
        return (a | 0) / i;
    }
    function binop_int_mod(a, b) {
        var i = b | 0;
        if (i == 0)
            return 0;
        return (a | 0) % i;
    }
    function size(ctx, a) {
        if (islist(a))
            return a.length;
        else if (isstr(a))
            return a.length;
        opi_abort(ctx, "Expecting string or list for size");
        return 0;
    }
    exports.size = size;
    function tonum(ctx, a) {
        if (!oper_typelist(a, LT_ALLOWNIL | LT_ALLOWNUM | LT_ALLOWSTR)) {
            opi_abort(ctx, 'Expecting string when converting to number');
            return exports.NIL;
        }
        return oper_un(a, unop_tonum);
    }
    exports.tonum = tonum;
    function say(ctx, vals) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                if (ctx.io.f_say) {
                    return [2, ctx.io.f_say(ctx, list_joinplain(vals, ' '), ctx.io.user)];
                }
                return [2, exports.NIL];
            });
        });
    }
    exports.say = say;
    function warn(ctx, vals) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                if (ctx.io.f_warn) {
                    return [2, ctx.io.f_warn(ctx, list_joinplain(vals, ' '), ctx.io.user)];
                }
                return [2, exports.NIL];
            });
        });
    }
    exports.warn = warn;
    function ask(ctx, vals) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                if (ctx.io.f_ask) {
                    return [2, ctx.io.f_ask(ctx, list_joinplain(vals, ' '), ctx.io.user)];
                }
                return [2, exports.NIL];
            });
        });
    }
    exports.ask = ask;
    function opi_exit(ctx) {
        ctx.passed = true;
        return run.PASS;
    }
    function callstack_flp(ctx, pc) {
        var flp = FILEPOS_NULL;
        var i = 0;
        for (; i < ctx.prg.posTable.length; i++) {
            var p = ctx.prg.posTable[i];
            if (p.pc > pc) {
                if (i > 0)
                    flp = ctx.prg.posTable[i - 1].flp;
                break;
            }
        }
        if (i > 0 && i === ctx.prg.posTable.length)
            flp = ctx.prg.posTable[i - 1].flp;
        return flp;
    }
    function callstack_cmdhint(ctx, pc) {
        for (var i = 0; i < ctx.prg.cmdTable.length; i++) {
            var p = ctx.prg.cmdTable[i];
            if (p.pc > pc) {
                var nest = 0;
                for (var j = i - 1; j >= 0; j--) {
                    p = ctx.prg.cmdTable[j];
                    if (p.cmdhint < 0)
                        nest++;
                    else {
                        nest--;
                        if (nest < 0)
                            return p.cmdhint;
                    }
                }
                break;
            }
        }
        return -1;
    }
    function callstack_append(ctx, err, pc) {
        var flp = callstack_flp(ctx, pc);
        var cmdhint = callstack_cmdhint(ctx, pc);
        var chn = null;
        if (cmdhint >= 0)
            chn = program_getdebugstr(ctx.prg, cmdhint);
        if (flp.line >= 0) {
            var err2 = program_errormsg(ctx.prg, flp, null);
            if (chn) {
                if (err)
                    return err + '\n    at ' + chn + ' (' + err2 + ')';
                return chn + ' (' + err2 + ')';
            }
            else {
                if (err)
                    return err + '\n    at ' + err2;
                return err2;
            }
        }
        else if (chn) {
            if (err)
                return err + '\n    at ' + chn;
            return chn;
        }
        return err;
    }
    function opi_abort(ctx, err) {
        ctx.failed = true;
        if (err === null)
            return run.FAIL;
        err = callstack_append(ctx, err, ctx.lastpc);
        for (var i = ctx.call_stk.length - 1, j = 0; i >= 0 && j < 9; i--, j++) {
            var here = ctx.call_stk[i];
            err = callstack_append(ctx, err, here.pc - 1);
        }
        ctx.err = 'Error: ' + err;
        return run.FAIL;
    }
    function stacktrace(ctx) {
        var ls = new list();
        var err = callstack_append(ctx, null, ctx.lastpc);
        if (err)
            ls.push(err);
        for (var i = ctx.call_stk.length - 1; i >= 0; i--) {
            var here = ctx.call_stk[i];
            err = callstack_append(ctx, null, here.pc - 1);
            if (err)
                ls.push(err);
        }
        return ls;
    }
    exports.stacktrace = stacktrace;
    function opi_unop(ctx, a, f_unary, erop) {
        if (!oper_typelist(a, LT_ALLOWNUM))
            return opi_abort(ctx, 'Expecting number or list of numbers when ' + erop);
        return oper_un(a, f_unary);
    }
    function opi_binop(ctx, a, b, f_binary, erop, t1, t2) {
        if (!oper_typelist(a, t1))
            return opi_abort(ctx, 'Expecting number or list of numbers when ' + erop);
        if (!oper_typelist(b, t2))
            return opi_abort(ctx, 'Expecting number or list of numbers when ' + erop);
        return oper_bin(a, b, f_binary);
    }
    function opi_triop(ctx, a, b, c, f_trinary, erop) {
        if (!oper_typelist(a, LT_ALLOWNUM))
            return opi_abort(ctx, 'Expecting number or list of numbers when ' + erop);
        if (!oper_typelist(b, LT_ALLOWNUM))
            return opi_abort(ctx, 'Expecting number or list of numbers when ' + erop);
        if (!oper_typelist(c, LT_ALLOWNUM))
            return opi_abort(ctx, 'Expecting number or list of numbers when ' + erop);
        return oper_tri(a, b, c, f_trinary);
    }
    function opi_combop(ctx, vals, f_binary, erop) {
        if (vals.length <= 0)
            return opi_abort(ctx, 'Expecting number or list of numbers when ' + erop);
        var listsize = -1;
        for (var i = 0; i < vals.length; i++) {
            var ls = vals[i];
            if (islist(ls)) {
                if (ls.length > listsize)
                    listsize = ls.length;
                for (var j = 0; j < ls.length; j++) {
                    if (!isnum(ls[j]))
                        return opi_abort(ctx, 'Expecting number or list of numbers when ' + erop);
                }
            }
            else if (!isnum(ls))
                return opi_abort(ctx, 'Expecting number or list of numbers when ' + erop);
        }
        if (listsize < 0) {
            for (var i = 1; i < vals.length; i++)
                vals[0] = f_binary(vals[0], vals[i]);
            return vals[0];
        }
        else if (listsize > 0) {
            var ret = new list();
            for (var j = 0; j < listsize; j++)
                ret.push(arget(vals[0], j));
            for (var i = 1; i < vals.length; i++) {
                for (var j = 0; j < listsize; j++)
                    ret[j] = f_binary(ret[j], arget(vals[i], j));
            }
            return ret;
        }
        return new list();
    }
    function str_cat(ctx, vals) {
        return list_joinplain(vals, '');
    }
    exports.str_cat = str_cat;
    function fix_slice(startv, lenv, objsize) {
        var start = Math.round(startv);
        if (lenv === null) {
            if (start < 0)
                start += objsize;
            if (start < 0)
                start = 0;
            if (start >= objsize)
                return { start: 0, len: 0 };
            return { start: start, len: objsize - start };
        }
        else {
            var len = Math.round(lenv);
            var wasneg = start < 0;
            if (len < 0) {
                wasneg = start <= 0;
                start += len;
                len = -len;
            }
            if (wasneg)
                start += objsize;
            if (start < 0) {
                len += start;
                start = 0;
            }
            if (len <= 0)
                return { start: 0, len: 0 };
            if (start + len > objsize)
                len = objsize - start;
            return { start: start, len: len };
        }
    }
    function str_slice(ctx, a, b, c) {
        if (!isstr(a)) {
            opi_abort(ctx, 'Expecting list or string when slicing');
            return exports.NIL;
        }
        if (!isnum(b) || (!isnil(c) && !isnum(c))) {
            opi_abort(ctx, 'Expecting slice values to be numbers');
            return exports.NIL;
        }
        if (a.length <= 0)
            return a;
        var sl = fix_slice(b, c, a.length);
        if (sl.len <= 0)
            return '';
        return a.substr(sl.start, sl.len);
    }
    exports.str_slice = str_slice;
    function str_splice(ctx, a, b, c, d) {
        if (!isstr(a)) {
            opi_abort(ctx, 'Expecting list or string when splicing');
            return exports.NIL;
        }
        if (!isnum(b) || (!isnil(c) && !isnum(c))) {
            opi_abort(ctx, 'Expecting splice values to be numbers');
            return exports.NIL;
        }
        if (!isnil(d) && !isstr(d)) {
            opi_abort(ctx, 'Expecting spliced value to be a string');
            return exports.NIL;
        }
        var sl = fix_slice(b, c, a.length);
        if (isnil(d)) {
            if (sl.len <= 0)
                return a;
            var tot = a.length - sl.len;
            if (tot <= 0)
                return '';
            return a.substr(0, sl.start) + a.substr(sl.start + sl.len);
        }
        else {
            var tot = a.length - sl.len + d.length;
            if (tot <= 0)
                return '';
            return a.substr(0, sl.start) + d + a.substr(sl.start + sl.len);
        }
    }
    exports.str_splice = str_splice;
    function list_new(ctx, a, b) {
        if (!isnil(a) && !isnum(a)) {
            opi_abort(ctx, 'Expecting number for list.new');
            return exports.NIL;
        }
        var size = isnil(a) ? 0 : a;
        var ret = new list();
        for (var i = 0; i < size; i++)
            ret.push(b);
        return ret;
    }
    exports.list_new = list_new;
    function opi_list_cat(ctx, vals) {
        var res = new list();
        for (var i = 0; i < vals.length; i++)
            res.push.apply(res, vals[i]);
        return res;
    }
    function list_slice(ctx, a, b, c) {
        if (!islist(a)) {
            opi_abort(ctx, 'Expecting list or string when slicing');
            return exports.NIL;
        }
        if (!isnum(b) || (!isnil(c) && !isnum(c))) {
            opi_abort(ctx, 'Expecting slice values to be numbers');
            return exports.NIL;
        }
        var sl = fix_slice(b, c, a.length);
        var res = new list();
        if (a.length <= 0 || sl.len <= 0)
            return new list();
        for (var i = 0; i < sl.len; i++)
            res.push(a[sl.start + i]);
        return res;
    }
    exports.list_slice = list_slice;
    function list_splice(ctx, a, b, c, d) {
        if (!islist(a)) {
            opi_abort(ctx, 'Expecting list or string when splicing');
            return;
        }
        if (!isnum(b) || (!isnil(c) && !isnum(c))) {
            opi_abort(ctx, 'Expecting splice values to be numbers');
            return;
        }
        if (!isnil(d) && !islist(d)) {
            opi_abort(ctx, 'Expecting spliced value to be a list');
            return;
        }
        var sl = fix_slice(b, c, a.length);
        if (isnil(d)) {
            if (sl.len <= 0)
                return;
            a.splice(sl.start, sl.len);
        }
        else {
            var t = d.concat();
            t.unshift(sl.len);
            t.unshift(sl.start);
            a.splice.apply(a, t);
        }
    }
    exports.list_splice = list_splice;
    function list_shift(ctx, a) {
        if (!islist(a)) {
            opi_abort(ctx, 'Expecting list when shifting');
            return exports.NIL;
        }
        if (a.length <= 0)
            return exports.NIL;
        return a.shift();
    }
    exports.list_shift = list_shift;
    function list_pop(ctx, a) {
        if (!islist(a)) {
            opi_abort(ctx, 'Expecting list when popping');
            return exports.NIL;
        }
        if (a.length <= 0)
            return exports.NIL;
        return a.pop();
    }
    exports.list_pop = list_pop;
    function list_push(ctx, a, b) {
        if (!islist(a)) {
            opi_abort(ctx, 'Expecting list when pushing');
            return exports.NIL;
        }
        a.push(b);
        return a;
    }
    exports.list_push = list_push;
    function list_unshift(ctx, a, b) {
        if (!islist(a)) {
            opi_abort(ctx, 'Expecting list when unshifting');
            return exports.NIL;
        }
        a.unshift(b);
        return a;
    }
    exports.list_unshift = list_unshift;
    function list_append(ctx, a, b) {
        if (!islist(a) || !islist(b)) {
            opi_abort(ctx, 'Expecting list when appending');
            return exports.NIL;
        }
        if (b.length > 0)
            a.push.apply(a, b);
        return a;
    }
    exports.list_append = list_append;
    function list_prepend(ctx, a, b) {
        if (!islist(a) || !islist(b)) {
            opi_abort(ctx, 'Expecting list when prepending');
            return exports.NIL;
        }
        if (b.length > 0)
            a.unshift.apply(a, b);
        return a;
    }
    exports.list_prepend = list_prepend;
    function list_find(ctx, a, b, c) {
        if (!islist(a)) {
            opi_abort(ctx, 'Expecting list for list.find');
            return exports.NIL;
        }
        if (!isnil(c) && !isnum(c)) {
            opi_abort(ctx, 'Expecting number for list.find');
            return exports.NIL;
        }
        var pos = (isnil(c) || isNaN(c)) ? 0 : c;
        if (pos < 0)
            pos = 0;
        var res = a.indexOf(b, pos);
        if (res >= 0)
            return res;
        return exports.NIL;
    }
    exports.list_find = list_find;
    function list_rfind(ctx, a, b, c) {
        if (!islist(a)) {
            opi_abort(ctx, 'Expecting list for list.rfind');
            return exports.NIL;
        }
        if (!isnil(c) && !isnum(c)) {
            opi_abort(ctx, 'Expecting number for list.rfind');
            return exports.NIL;
        }
        var pos = (isnil(c) || isNaN(c)) ? a.length - 1 : c;
        if (pos < 0 || pos >= a.length)
            pos = a.length - 1;
        var res = a.lastIndexOf(b, pos);
        if (res >= 0)
            return res;
        return exports.NIL;
    }
    exports.list_rfind = list_rfind;
    function list_join(ctx, a, b) {
        if (!islist(a)) {
            opi_abort(ctx, 'Expecting list for list.join');
            return exports.NIL;
        }
        return list_joinplain(a, isnil(b) ? '' : tostr(b));
    }
    exports.list_join = list_join;
    function list_rev(ctx, a) {
        if (!islist(a)) {
            opi_abort(ctx, 'Expecting list for list.rev');
            return exports.NIL;
        }
        a.reverse();
        return a;
    }
    exports.list_rev = list_rev;
    function list_str(ctx, a) {
        if (!islist(a)) {
            opi_abort(ctx, 'Expecting list for list.str');
            return exports.NIL;
        }
        var res = '';
        for (var i = 0; i < a.length; i++) {
            var b = a[i];
            if (!isnum(b)) {
                opi_abort(ctx, 'Expecting list of integers for list.str');
                return exports.NIL;
            }
            if (b < 0)
                b = 0;
            else if (b > 255)
                b = 255;
            res += String.fromCharCode(b);
        }
        return res;
    }
    exports.list_str = list_str;
    function sortboth(ctx, li, a, b) {
        var atype = sink_typeof(a);
        var btype = sink_typeof(b);
        if (a === b)
            return 0;
        if (atype !== btype) {
            if (atype === type.NIL)
                return -1;
            else if (atype === type.NUM)
                return btype === type.NIL ? 1 : -1;
            else if (atype === type.STR)
                return btype === type.LIST ? -1 : 1;
            return 1;
        }
        if (atype === type.NUM) {
            if (isNaN(a)) {
                if (isNaN(b))
                    return 0;
                return -1;
            }
            else if (isNaN(b))
                return 1;
            return a < b ? -1 : 1;
        }
        else if (atype === type.STR)
            return a < b ? -1 : 1;
        if (li.indexOf(a) >= 0 || li.indexOf(b) >= 0) {
            opi_abort(ctx, 'Cannot sort circular lists');
            return -1;
        }
        var ls1 = a;
        var ls2 = b;
        if (ls1.length === 0) {
            if (ls2.length === 0)
                return 0;
            return -1;
        }
        else if (ls2.length === 0)
            return 1;
        var minsize = Math.min(ls1.length, ls2.length);
        li.push(a, b);
        for (var i = 0; i < minsize; i++) {
            var res = sortboth(ctx, li, ls1[i], ls2[i]);
            if (res < 0) {
                li.pop();
                li.pop();
                return -1;
            }
            else if (res > 0) {
                li.pop();
                li.pop();
                return 1;
            }
        }
        li.pop();
        li.pop();
        if (ls1.length < ls2.length)
            return -1;
        else if (ls1.length > ls2.length)
            return 1;
        return 0;
    }
    function list_sort(ctx, a) {
        if (!islist(a)) {
            opi_abort(ctx, 'Expecting list for list.sort');
            return;
        }
        var li = [];
        a.sort(function (a, b) {
            return sortboth(ctx, li, a, b);
        });
    }
    exports.list_sort = list_sort;
    function list_rsort(ctx, a) {
        if (!islist(a)) {
            opi_abort(ctx, 'Expecting list for list.rsort');
            return;
        }
        var li = [];
        a.sort(function (a, b) {
            return -sortboth(ctx, li, a, b);
        });
    }
    exports.list_rsort = list_rsort;
    function order(ctx, a, b) {
        return sortboth(ctx, [], a, b);
    }
    exports.order = order;
    function range(ctx, start, stop, step) {
        var count = Math.ceil((stop - start) / step);
        if (count > 10000000) {
            opi_abort(ctx, 'Range too large (maximum 10000000)');
            return exports.NIL;
        }
        var ret = new list();
        for (var i = 0; i < count; i++)
            ret.push(start + i * step);
        return ret;
    }
    exports.range = range;
    function numtostr(num) {
        if (isNaN(num))
            return 'nan';
        else if (num === Infinity)
            return 'inf';
        else if (num === -Infinity)
            return '-inf';
        return '' + num;
    }
    function pk_isjson(s) {
        var pkv_enum;
        (function (pkv_enum) {
            pkv_enum[pkv_enum["START"] = 0] = "START";
            pkv_enum[pkv_enum["NULL1"] = 1] = "NULL1";
            pkv_enum[pkv_enum["NULL2"] = 2] = "NULL2";
            pkv_enum[pkv_enum["NULL3"] = 3] = "NULL3";
            pkv_enum[pkv_enum["NUM_0"] = 4] = "NUM_0";
            pkv_enum[pkv_enum["NUM_NEG"] = 5] = "NUM_NEG";
            pkv_enum[pkv_enum["NUM_INT"] = 6] = "NUM_INT";
            pkv_enum[pkv_enum["NUM_FRAC"] = 7] = "NUM_FRAC";
            pkv_enum[pkv_enum["NUM_FRACE"] = 8] = "NUM_FRACE";
            pkv_enum[pkv_enum["NUM_FRACE2"] = 9] = "NUM_FRACE2";
            pkv_enum[pkv_enum["NUM_EXP"] = 10] = "NUM_EXP";
            pkv_enum[pkv_enum["STR"] = 11] = "STR";
            pkv_enum[pkv_enum["STR_ESC"] = 12] = "STR_ESC";
            pkv_enum[pkv_enum["STR_U1"] = 13] = "STR_U1";
            pkv_enum[pkv_enum["STR_U2"] = 14] = "STR_U2";
            pkv_enum[pkv_enum["STR_U3"] = 15] = "STR_U3";
            pkv_enum[pkv_enum["STR_U4"] = 16] = "STR_U4";
            pkv_enum[pkv_enum["ARRAY"] = 17] = "ARRAY";
            pkv_enum[pkv_enum["ENDVAL"] = 18] = "ENDVAL";
        })(pkv_enum || (pkv_enum = {}));
        var state = pkv_enum.START;
        var arrays = 0;
        for (var i = 0; i < s.length; i++) {
            var b = s.charAt(i);
            var nb = i < s.length - 1 ? s.charAt(i + 1) : '';
            switch (state) {
                case pkv_enum.START:
                    if (b === 'n') {
                        if (nb !== 'u')
                            return false;
                        state = pkv_enum.NULL1;
                    }
                    else if (b === '0') {
                        if (nb === '.' || nb === 'e' || nb === 'E')
                            state = pkv_enum.NUM_0;
                        else
                            state = pkv_enum.ENDVAL;
                    }
                    else if (b === '-')
                        state = pkv_enum.NUM_NEG;
                    else if (isNum(b)) {
                        if (isNum(nb))
                            state = pkv_enum.NUM_INT;
                        else if (nb === '.' || nb === 'e' || nb === 'E')
                            state = pkv_enum.NUM_0;
                        else
                            state = pkv_enum.ENDVAL;
                    }
                    else if (b === '"')
                        state = pkv_enum.STR;
                    else if (b === '[') {
                        arrays++;
                        if (isSpace(nb) || nb === ']')
                            state = pkv_enum.ARRAY;
                    }
                    else if (!isSpace(b))
                        return false;
                    break;
                case pkv_enum.NULL1:
                    if (nb !== 'l')
                        return false;
                    state = pkv_enum.NULL2;
                    break;
                case pkv_enum.NULL2:
                    if (nb !== 'l')
                        return false;
                    state = pkv_enum.NULL3;
                    break;
                case pkv_enum.NULL3:
                    state = pkv_enum.ENDVAL;
                    break;
                case pkv_enum.NUM_0:
                    if (b === '.')
                        state = pkv_enum.NUM_FRAC;
                    else if (b === 'e' || b === 'E') {
                        if (nb === '+' || nb === '-')
                            i++;
                        state = pkv_enum.NUM_EXP;
                    }
                    else
                        return false;
                    break;
                case pkv_enum.NUM_NEG:
                    if (b === '0') {
                        if (nb === '.' || nb === 'e' || nb === 'E')
                            state = pkv_enum.NUM_0;
                        else
                            state = pkv_enum.ENDVAL;
                    }
                    else if (isNum(b)) {
                        if (isNum(nb))
                            state = pkv_enum.NUM_INT;
                        else if (nb === '.' || nb === 'e' || nb === 'E')
                            state = pkv_enum.NUM_0;
                        else
                            state = pkv_enum.ENDVAL;
                    }
                    else
                        return false;
                    break;
                case pkv_enum.NUM_INT:
                    if (!isNum(b))
                        return false;
                    if (nb === '.' || nb === 'e' || nb === 'E')
                        state = pkv_enum.NUM_0;
                    else if (!isNum(nb))
                        state = pkv_enum.ENDVAL;
                    break;
                case pkv_enum.NUM_FRAC:
                    if (!isNum(b))
                        return false;
                    if (nb === 'e' || nb === 'E')
                        state = pkv_enum.NUM_FRACE;
                    else if (!isNum(nb))
                        state = pkv_enum.ENDVAL;
                    break;
                case pkv_enum.NUM_FRACE:
                    state = pkv_enum.NUM_FRACE2;
                    break;
                case pkv_enum.NUM_FRACE2:
                    if (isNum(b)) {
                        if (isNum(nb))
                            state = pkv_enum.NUM_EXP;
                        else
                            state = pkv_enum.ENDVAL;
                    }
                    else if (b === '+' || b === '-')
                        state = pkv_enum.NUM_EXP;
                    else
                        return false;
                    break;
                case pkv_enum.NUM_EXP:
                    if (!isNum(b))
                        return false;
                    if (!isNum(nb))
                        state = pkv_enum.ENDVAL;
                    break;
                case pkv_enum.STR:
                    if (b === '\\')
                        state = pkv_enum.STR_ESC;
                    else if (b === '"')
                        state = pkv_enum.ENDVAL;
                    else if (b < ' ')
                        return false;
                    break;
                case pkv_enum.STR_ESC:
                    if (b === '"' || b === '\\' || b === '/' || b === 'b' ||
                        b === 'f' || b === 'n' || b === 'r' || b === 't')
                        state = pkv_enum.STR;
                    else if (b === 'u') {
                        if (nb !== '0')
                            return false;
                        state = pkv_enum.STR_U1;
                    }
                    else
                        return false;
                    break;
                case pkv_enum.STR_U1:
                    if (nb !== '0')
                        return false;
                    state = pkv_enum.STR_U2;
                    break;
                case pkv_enum.STR_U2:
                    if (!isHex(nb))
                        return false;
                    state = pkv_enum.STR_U3;
                    break;
                case pkv_enum.STR_U3:
                    if (!isHex(nb))
                        return false;
                    state = pkv_enum.STR_U4;
                    break;
                case pkv_enum.STR_U4:
                    state = pkv_enum.STR;
                    break;
                case pkv_enum.ARRAY:
                    if (b === ']')
                        state = pkv_enum.ENDVAL;
                    else if (!isSpace(nb) && nb !== ']')
                        state = pkv_enum.START;
                    break;
                case pkv_enum.ENDVAL:
                    if (arrays > 0) {
                        if (b === ',')
                            state = pkv_enum.START;
                        else if (b === ']')
                            arrays--;
                        else if (!isSpace(b))
                            return false;
                    }
                    else if (!isSpace(b))
                        return false;
                    break;
            }
        }
        return state === pkv_enum.ENDVAL;
    }
    function pk_tojson(a, li) {
        if (a === null)
            return 'null';
        else if (typeof a === 'number') {
            var s = numtostr(a);
            if (pk_isjson(s))
                return s;
            return 'null';
        }
        else if (typeof a === 'string') {
            return '"' +
                a.replace(/\\|"|[\x00-\x1F]|[\x80-\xFF]/g, function (a) {
                    if (a === '\\' || a === '"')
                        return '\\' + a;
                    else if (a === '\b')
                        return '\\b';
                    else if (a === '\f')
                        return '\\f';
                    else if (a === '\n')
                        return '\\n';
                    else if (a === '\r')
                        return '\\r';
                    else if (a === '\t')
                        return '\\t';
                    var s = a.charCodeAt(0).toString(16).toUpperCase();
                    if (s.length <= 1)
                        s = '0' + s;
                    return '\\u00' + s;
                }) + '"';
        }
        else {
            if (li.indexOf(a) >= 0)
                return null;
            li.push(a);
            var res = [];
            for (var i = 0; i < a.length; i++) {
                var s2 = pk_tojson(a[i], li);
                if (s2 === null)
                    return null;
                res.push(s2);
            }
            li.pop();
            return '[' + res.join(',') + ']';
        }
    }
    function pickle_json(ctx, a) {
        var res = pk_tojson(a, []);
        if (res === null) {
            opi_abort(ctx, 'Cannot pickle circular structure to JSON format');
            return exports.NIL;
        }
        return res;
    }
    exports.pickle_json = pickle_json;
    function pk_tobin_vint(body, i) {
        if (i < 128)
            body.push(i);
        else {
            body.push(0x80 | (i >>> 24), (i >>> 16) & 0xFF, (i >>> 8) & 0xFF, i & 0xFF);
        }
    }
    function pk_tobin(a, li, strs, body) {
        if (a === null)
            body.push(0xF7);
        else if (typeof a === 'number') {
            if (Math.floor(a) === a && a >= -4294967296 && a < 4294967296) {
                var num = a;
                if (num < 0) {
                    if (num >= -256) {
                        num += 256;
                        body.push(0xF1, num & 0xFF);
                    }
                    else if (num >= -65536) {
                        num += 65536;
                        body.push(0xF3, num & 0xFF, num >>> 8);
                    }
                    else {
                        num += 4294967296;
                        body.push(0xF5, num & 0xFF, (num >>> 8) & 0xFF, (num >>> 16) & 0xFF, (num >>> 24) & 0xFF);
                    }
                }
                else {
                    if (num < 256)
                        body.push(0xF0, num & 0xFF);
                    else if (num < 65536)
                        body.push(0xF2, num & 0xFF, num >>> 8);
                    else {
                        body.push(0xF4, num & 0xFF, (num >>> 8) & 0xFF, (num >>> 16) & 0xFF, (num >>> 24) & 0xFF);
                    }
                }
            }
            else {
                dview.setFloat64(0, a, true);
                body.push(0xF6, dview.getUint8(0), dview.getUint8(1), dview.getUint8(2), dview.getUint8(3), dview.getUint8(4), dview.getUint8(5), dview.getUint8(6), dview.getUint8(7));
            }
        }
        else if (typeof a === 'string') {
            var sidx = 0;
            var found = false;
            for (; sidx < strs.length; sidx++) {
                if (strs[sidx] === a) {
                    found = true;
                    break;
                }
            }
            if (!found) {
                sidx = strs.length;
                strs.push(a);
            }
            body.push(0xF8);
            pk_tobin_vint(body, sidx);
        }
        else {
            var idxat = li.indexOf(a);
            if (idxat < 0) {
                li.push(a);
                body.push(0xF9);
                pk_tobin_vint(body, a.length);
                for (var i = 0; i < a.length; i++)
                    pk_tobin(a[i], li, strs, body);
            }
            else {
                body.push(0xFA);
                pk_tobin_vint(body, idxat);
            }
        }
    }
    function pickle_binstr(a) {
        var strs = [];
        var body = [];
        pk_tobin(a, [], strs, body);
        var out = String.fromCharCode(0x01);
        var vsize = [];
        pk_tobin_vint(vsize, strs.length);
        out += String.fromCharCode.apply(null, vsize);
        for (var i = 0; i < strs.length; i++) {
            vsize = [];
            pk_tobin_vint(vsize, strs[i].length);
            out += String.fromCharCode.apply(null, vsize) + strs[i];
        }
        return out + String.fromCharCode.apply(null, body);
    }
    exports.pickle_binstr = pickle_binstr;
    function pickle_bin(ctx, a) {
        return pickle_binstr(a);
    }
    exports.pickle_bin = pickle_bin;
    function pk_fmbin_vint(sp) {
        if (sp.s.length <= sp.pos)
            return -1;
        var v = sp.s.charCodeAt(sp.pos);
        sp.pos++;
        if (v < 128)
            return v;
        if (sp.s.length <= sp.pos + 2)
            return -1;
        v = ((v ^ 0x80) << 24) |
            (sp.s.charCodeAt(sp.pos) << 16) |
            (sp.s.charCodeAt(sp.pos + 1) << 8) |
            (sp.s.charCodeAt(sp.pos + 2));
        sp.pos += 3;
        return v;
    }
    function pk_fmbin(sp, strs, li) {
        if (sp.pos >= sp.s.length)
            return false;
        var cmd = sp.s.charCodeAt(sp.pos);
        sp.pos++;
        switch (cmd) {
            case 0xF0: {
                if (sp.pos >= sp.s.length)
                    return false;
                var res = sp.s.charCodeAt(sp.pos);
                sp.pos++;
                return res;
            }
            case 0xF1: {
                if (sp.pos >= sp.s.length)
                    return false;
                var res = sp.s.charCodeAt(sp.pos) - 256;
                sp.pos++;
                return res;
            }
            case 0xF2: {
                if (sp.pos + 1 >= sp.s.length)
                    return false;
                var res = (sp.s.charCodeAt(sp.pos) |
                    (sp.s.charCodeAt(sp.pos + 1) << 8));
                sp.pos += 2;
                return res;
            }
            case 0xF3: {
                if (sp.pos + 1 >= sp.s.length)
                    return false;
                var res = (sp.s.charCodeAt(sp.pos) |
                    (sp.s.charCodeAt(sp.pos + 1) << 8)) - 65536;
                sp.pos += 2;
                return res;
            }
            case 0xF4: {
                if (sp.pos + 3 >= sp.s.length)
                    return false;
                var res = (sp.s.charCodeAt(sp.pos) +
                    (sp.s.charCodeAt(sp.pos + 1) << 8) +
                    (sp.s.charCodeAt(sp.pos + 2) << 16) +
                    ((sp.s.charCodeAt(sp.pos + 3) << 23) * 2));
                sp.pos += 4;
                return res;
            }
            case 0xF5: {
                if (sp.pos + 3 >= sp.s.length)
                    return false;
                var res = (sp.s.charCodeAt(sp.pos) +
                    (sp.s.charCodeAt(sp.pos + 1) << 8) +
                    (sp.s.charCodeAt(sp.pos + 2) << 16) +
                    ((sp.s.charCodeAt(sp.pos + 3) << 23) * 2)) - 4294967296;
                sp.pos += 4;
                return res;
            }
            case 0xF6: {
                if (sp.pos + 7 >= sp.s.length)
                    return false;
                dview.setUint8(0, sp.s.charCodeAt(sp.pos + 0));
                dview.setUint8(1, sp.s.charCodeAt(sp.pos + 1));
                dview.setUint8(2, sp.s.charCodeAt(sp.pos + 2));
                dview.setUint8(3, sp.s.charCodeAt(sp.pos + 3));
                dview.setUint8(4, sp.s.charCodeAt(sp.pos + 4));
                dview.setUint8(5, sp.s.charCodeAt(sp.pos + 5));
                dview.setUint8(6, sp.s.charCodeAt(sp.pos + 6));
                dview.setUint8(7, sp.s.charCodeAt(sp.pos + 7));
                var res = dview.getFloat64(0, true);
                sp.pos += 8;
                return res;
            }
            case 0xF7: {
                return null;
            }
            case 0xF8: {
                var id = pk_fmbin_vint(sp);
                if (id < 0 || id >= strs.length)
                    return false;
                return strs[id];
            }
            case 0xF9: {
                var sz = pk_fmbin_vint(sp);
                if (sz < 0)
                    return false;
                var res = new list();
                li.push(res);
                for (var i = 0; i < sz; i++) {
                    var e = pk_fmbin(sp, strs, li);
                    if (e === false)
                        return false;
                    res.push(e);
                }
                return res;
            }
            case 0xFA: {
                var id = pk_fmbin_vint(sp);
                if (id < 0 || id >= li.length)
                    return false;
                return li[id];
            }
        }
        return false;
    }
    function pk_fmjson(sp) {
        while (sp.pos < sp.s.length && isSpace(sp.s.charAt(sp.pos)))
            sp.pos++;
        if (sp.pos >= sp.s.length)
            return false;
        var b = sp.s.charAt(sp.pos);
        sp.pos++;
        if (b === 'n') {
            if (sp.pos + 2 >= sp.s.length)
                return false;
            if (sp.s.charAt(sp.pos + 0) !== 'u' ||
                sp.s.charAt(sp.pos + 1) !== 'l' ||
                sp.s.charAt(sp.pos + 2) !== 'l')
                return false;
            sp.pos += 3;
            return exports.NIL;
        }
        else if (isNum(b) || b === '-') {
            var npi = numpart_new();
            if (b === '-') {
                if (sp.pos >= sp.s.length)
                    return false;
                npi.sign = -1;
                b = sp.s.charAt(sp.pos);
                sp.pos++;
                if (!isNum(b))
                    return false;
            }
            if (b >= '1' && b <= '9') {
                npi.val = b.charCodeAt(0) - 48;
                while (sp.pos < sp.s.length && isNum(sp.s.charAt(sp.pos))) {
                    npi.val = 10 * npi.val + sp.s.charCodeAt(sp.pos) - 48;
                    sp.pos++;
                }
            }
            if (sp.s.charAt(sp.pos) === '.') {
                sp.pos++;
                if (sp.pos >= sp.s.length || !isNum(sp.s.charAt(sp.pos)))
                    return false;
                while (sp.pos < sp.s.length && isNum(sp.s.charAt(sp.pos))) {
                    npi.frac = npi.frac * 10 + sp.s.charCodeAt(sp.pos) - 48;
                    npi.flen++;
                    sp.pos++;
                }
            }
            if (sp.s.charAt(sp.pos) === 'e' || sp.s.charAt(sp.pos) === 'E') {
                sp.pos++;
                if (sp.pos >= sp.s.length)
                    return false;
                if (sp.s.charAt(sp.pos) === '-' || sp.s.charAt(sp.pos) === '+') {
                    npi.esign = sp.s.charAt(sp.pos) === '-' ? -1 : 1;
                    sp.pos++;
                    if (sp.pos >= sp.s.length)
                        return false;
                }
                if (!isNum(sp.s.charAt(sp.pos)))
                    return false;
                while (sp.pos < sp.s.length && isNum(sp.s.charAt(sp.pos))) {
                    npi.eval = npi.eval * 10 + sp.s.charCodeAt(sp.pos) - 48;
                    sp.pos++;
                }
            }
            return numpart_calc(npi);
        }
        else if (b === '"') {
            var str = '';
            while (sp.pos < sp.s.length) {
                b = sp.s.charAt(sp.pos);
                if (b === '"') {
                    sp.pos++;
                    return str;
                }
                else if (b === '\\') {
                    sp.pos++;
                    if (sp.pos >= sp.s.length)
                        return false;
                    b = sp.s.charAt(sp.pos);
                    if (b === '"' || b === '\\')
                        str += b;
                    else if (b === 'b')
                        str += '\b';
                    else if (b === 'f')
                        str += '\f';
                    else if (b === 'n')
                        str += '\n';
                    else if (b === 'r')
                        str += '\r';
                    else if (b === 't')
                        str += '\t';
                    else if (b === 'u') {
                        if (sp.pos + 4 >= sp.s.length ||
                            sp.s.charAt(sp.pos + 1) !== '0' || sp.s.charAt(sp.pos + 2) !== '0' ||
                            !isHex(sp.s.charAt(sp.pos + 3)) || !isHex(sp.s.charAt(sp.pos + 4)))
                            return false;
                        str += String.fromCharCode((toHex(sp.s.charAt(sp.pos + 3)) << 4) | toHex(sp.s.charAt(sp.pos + 4)));
                        sp.pos += 4;
                    }
                    else
                        return false;
                }
                else if (b < ' ')
                    return false;
                else
                    str += b;
                sp.pos++;
            }
            return false;
        }
        else if (b === '[') {
            while (sp.pos < sp.s.length && isSpace(sp.s.charAt(sp.pos)))
                sp.pos++;
            if (sp.pos >= sp.s.length)
                return false;
            var res = new list();
            if (sp.s.charAt(sp.pos) === ']') {
                sp.pos++;
                return res;
            }
            while (true) {
                var item = pk_fmjson(sp);
                if (item === false)
                    return false;
                res.push(item);
                while (sp.pos < sp.s.length && isSpace(sp.s.charAt(sp.pos)))
                    sp.pos++;
                if (sp.pos >= sp.s.length)
                    return false;
                if (sp.s.charAt(sp.pos) === ']') {
                    sp.pos++;
                    return res;
                }
                else if (sp.s.charAt(sp.pos) === ',')
                    sp.pos++;
                else
                    return false;
            }
        }
        return false;
    }
    function pickle_valstr(s) {
        if (s.length < 1 || s.charCodeAt(0) !== 0x01)
            return false;
        var sp = { s: s, pos: 1 };
        var str_table_size = pk_fmbin_vint(sp);
        if (str_table_size < 0)
            return false;
        var strs = [];
        for (var i = 0; i < str_table_size; i++) {
            var str_size = pk_fmbin_vint(sp);
            if (str_size < 0 || sp.pos + str_size > sp.s.length)
                return false;
            strs.push(s.substr(sp.pos, str_size));
            sp.pos += str_size;
        }
        return pk_fmbin(sp, strs, []);
    }
    exports.pickle_valstr = pickle_valstr;
    function pickle_val(ctx, a) {
        if (!isstr(a) || a.length < 1) {
            opi_abort(ctx, 'Invalid pickle data');
            return exports.NIL;
        }
        if (a.charCodeAt(0) === 0x01) {
            var res_1 = pickle_valstr(a);
            if (res_1 === false) {
                opi_abort(ctx, 'Invalid pickle data');
                return exports.NIL;
            }
            return res_1;
        }
        var sp = { s: a, pos: 0 };
        var res = pk_fmjson(sp);
        if (res === false) {
            opi_abort(ctx, 'Invalid pickle data');
            return exports.NIL;
        }
        while (sp.pos < a.length) {
            if (!isSpace(a.charAt(sp.pos))) {
                opi_abort(ctx, 'Invalid pickle data');
                return exports.NIL;
            }
            sp.pos++;
        }
        return res;
    }
    exports.pickle_val = pickle_val;
    function pk_isbin_adv(sp, amt) {
        sp.pos += amt;
        return sp.pos <= sp.s.length;
    }
    function pk_isbin(sp, index, str_table_size) {
        if (sp.s.length <= sp.pos)
            return false;
        var cmd = sp.s.charCodeAt(sp.pos);
        sp.pos++;
        switch (cmd) {
            case 0xF0: return pk_isbin_adv(sp, 1);
            case 0xF1: return pk_isbin_adv(sp, 1);
            case 0xF2: return pk_isbin_adv(sp, 2);
            case 0xF3: return pk_isbin_adv(sp, 2);
            case 0xF4: return pk_isbin_adv(sp, 4);
            case 0xF5: return pk_isbin_adv(sp, 4);
            case 0xF6: return pk_isbin_adv(sp, 8);
            case 0xF7: return true;
            case 0xF8: {
                var str_id = pk_fmbin_vint(sp);
                if (str_id < 0 || str_id >= str_table_size)
                    return false;
                return true;
            }
            case 0xF9: {
                index[0]++;
                var list_size = pk_fmbin_vint(sp);
                if (list_size < 0)
                    return false;
                for (var i = 0; i < list_size; i++) {
                    if (!pk_isbin(sp, index, str_table_size))
                        return false;
                }
                return true;
            }
            case 0xFA: {
                var ref = pk_fmbin_vint(sp);
                if (ref < 0 || ref >= index[0])
                    return false;
                return true;
            }
        }
        return false;
    }
    function pickle_valid(ctx, a) {
        if (!isstr(a))
            return 0;
        if (a.length === 0)
            return 0;
        if (a.charCodeAt(0) === 0x01) {
            var sp = { s: a, pos: 1 };
            var str_table_size = pk_fmbin_vint(sp);
            if (str_table_size < 0)
                return 0;
            for (var i = 0; i < str_table_size; i++) {
                var str_size = pk_fmbin_vint(sp);
                if (str_size < 0)
                    return 0;
                sp.pos += str_size;
            }
            if (!pk_isbin(sp, [0], str_table_size))
                return 0;
            if (sp.pos !== a.length)
                return 0;
            return 2;
        }
        return pk_isjson(a) ? 1 : 0;
    }
    exports.pickle_valid = pickle_valid;
    function pk_sib(a, all, parents) {
        if (parents.indexOf(a) >= 0)
            return false;
        if (all.indexOf(a) >= 0)
            return true;
        all.push(a);
        parents.push(a);
        for (var i = 0; i < a.length; i++) {
            var b = a[i];
            if (!islist(b))
                continue;
            if (pk_sib(b, all, parents))
                return true;
        }
        parents.pop();
        return false;
    }
    function pickle_sibling(ctx, a) {
        if (!islist(a))
            return false;
        return pk_sib(a, [], []);
    }
    exports.pickle_sibling = pickle_sibling;
    function pk_cir(a, li) {
        if (li.indexOf(a) >= 0)
            return true;
        li.push(a);
        for (var i = 0; i < a.length; i++) {
            var b = a[i];
            if (!islist(b))
                continue;
            if (pk_cir(b, li))
                return true;
        }
        li.pop();
        return false;
    }
    function pickle_circular(ctx, a) {
        if (!islist(a))
            return false;
        return pk_cir(a, []);
    }
    exports.pickle_circular = pickle_circular;
    function pk_copy(a, li_src, li_tgt) {
        if (a === null || typeof a === 'number' || typeof a === 'string')
            return a;
        var idxat = li_src.indexOf(a);
        if (idxat >= 0)
            return li_tgt[idxat];
        var res = new list();
        li_src.push(a);
        li_tgt.push(res);
        for (var i = 0; i < a.length; i++)
            res.push(pk_copy(a[i], li_src, li_tgt));
        return res;
    }
    function pickle_copy(ctx, a) {
        return pk_copy(a, [], []);
    }
    exports.pickle_copy = pickle_copy;
    var txt_num_neg = 'negating';
    var txt_num_add = 'adding';
    var txt_num_sub = 'subtracting';
    var txt_num_mul = 'multiplying';
    var txt_num_div = 'dividing';
    var txt_num_mod = 'taking modular';
    var txt_num_pow = 'exponentiating';
    var txt_num_abs = 'taking absolute value';
    var txt_num_sign = 'taking sign';
    var txt_num_clamp = 'clamping';
    var txt_num_floor = 'taking floor';
    var txt_num_ceil = 'taking ceil';
    var txt_num_round = 'rounding';
    var txt_num_trunc = 'truncating';
    var txt_num_isnan = 'testing if NaN';
    var txt_num_isfinite = 'testing if finite';
    var txt_num_sin = 'taking sin';
    var txt_num_cos = 'taking cos';
    var txt_num_tan = 'taking tan';
    var txt_num_asin = 'taking arc-sin';
    var txt_num_acos = 'taking arc-cos';
    var txt_num_atan = 'taking arc-tan';
    var txt_num_log = 'taking logarithm';
    var txt_num_lerp = 'lerping';
    var txt_num_hex = 'converting to hex';
    var txt_num_oct = 'converting to oct';
    var txt_num_bin = 'converting to bin';
    var txt_int_new = 'casting to int';
    var txt_int_not = 'NOTing';
    var txt_int_and = 'ANDing';
    var txt_int_or = 'ORing';
    var txt_int_xor = 'XORing';
    var txt_int_shl = 'shifting left';
    var txt_int_shr = 'shifting right';
    var txt_int_clz = 'counting leading zeros';
    var txt_int_pop = 'population count';
    var txt_int_bswap = 'byte swaping';
    function context_run(ctx) {
        return __awaiter(this, void 0, void 0, function () {
            function RUNDONE(result) {
                if (result === run.PASS || result === run.FAIL)
                    context_reset(ctx);
                return result;
            }
            function LOAD_ab() {
                ctx.pc++;
                A = ops[ctx.pc++];
                B = ops[ctx.pc++];
            }
            function LOAD_abc() {
                ctx.pc++;
                A = ops[ctx.pc++];
                B = ops[ctx.pc++];
                C = ops[ctx.pc++];
            }
            function LOAD_abcd() {
                ctx.pc++;
                A = ops[ctx.pc++];
                B = ops[ctx.pc++];
                C = ops[ctx.pc++];
                D = ops[ctx.pc++];
            }
            function LOAD_abcde() {
                ctx.pc++;
                A = ops[ctx.pc++];
                B = ops[ctx.pc++];
                C = ops[ctx.pc++];
                D = ops[ctx.pc++];
                E = ops[ctx.pc++];
            }
            function LOAD_abcdef() {
                ctx.pc++;
                A = ops[ctx.pc++];
                B = ops[ctx.pc++];
                C = ops[ctx.pc++];
                D = ops[ctx.pc++];
                E = ops[ctx.pc++];
                F = ops[ctx.pc++];
            }
            function LOAD_abcdefg() {
                ctx.pc++;
                A = ops[ctx.pc++];
                B = ops[ctx.pc++];
                C = ops[ctx.pc++];
                D = ops[ctx.pc++];
                E = ops[ctx.pc++];
                F = ops[ctx.pc++];
                G = ops[ctx.pc++];
            }
            function LOAD_abcdefgh() {
                ctx.pc++;
                A = ops[ctx.pc++];
                B = ops[ctx.pc++];
                C = ops[ctx.pc++];
                D = ops[ctx.pc++];
                E = ops[ctx.pc++];
                F = ops[ctx.pc++];
                G = ops[ctx.pc++];
                H = ops[ctx.pc++];
            }
            function LOAD_abcdefghi() {
                ctx.pc++;
                A = ops[ctx.pc++];
                B = ops[ctx.pc++];
                C = ops[ctx.pc++];
                D = ops[ctx.pc++];
                E = ops[ctx.pc++];
                F = ops[ctx.pc++];
                G = ops[ctx.pc++];
                H = ops[ctx.pc++];
                I = ops[ctx.pc++];
            }
            function LOAD_abcdefghij() {
                ctx.pc++;
                A = ops[ctx.pc++];
                B = ops[ctx.pc++];
                C = ops[ctx.pc++];
                D = ops[ctx.pc++];
                E = ops[ctx.pc++];
                F = ops[ctx.pc++];
                G = ops[ctx.pc++];
                H = ops[ctx.pc++];
                I = ops[ctx.pc++];
                J = ops[ctx.pc++];
            }
            function INLINE_UNOP(func, erop) {
                LOAD_abcd();
                var_set(ctx, A, B, opi_unop(ctx, var_get(ctx, C, D), func, erop));
            }
            function INLINE_BINOP_T(func, erop, t1, t2) {
                LOAD_abcdef();
                var_set(ctx, A, B, opi_binop(ctx, var_get(ctx, C, D), var_get(ctx, E, F), func, erop, t1, t2));
            }
            function INLINE_BINOP(func, erop) {
                INLINE_BINOP_T(func, erop, LT_ALLOWNUM, LT_ALLOWNUM);
            }
            function INLINE_TRIOP(func, erop) {
                LOAD_abcdefgh();
                var_set(ctx, A, B, opi_triop(ctx, var_get(ctx, C, D), var_get(ctx, E, F), var_get(ctx, G, H), func, erop));
            }
            var A, B, C, D, E, F, G, H, I, J, X, Y, Z, W, ls, str, ops, _a, listcat, p, s, lx, p, sl, np, p, nat, hash, i, nat2, e_1, s, lx, p, sl, np, lx, lx2, p, p, p, p, err, p, p, p, p, p, p, p;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (ctx.passed)
                            return [2, RUNDONE(run.PASS)];
                        if (ctx.failed)
                            return [2, RUNDONE(run.FAIL)];
                        if (ctx.async)
                            return [2, RUNDONE(run.ASYNC)];
                        if (ctx.timeout > 0 && ctx.timeout_left <= 0) {
                            ctx.timeout_left = ctx.timeout;
                            return [2, RUNDONE(run.TIMEOUT)];
                        }
                        A = 0, B = 0, C = 0, D = 0, E = 0;
                        F = 0, G = 0, H = 0, I = 0, J = 0;
                        X = 0, Y = 0, Z = 0, W = 0;
                        ops = ctx.prg.ops;
                        _b.label = 1;
                    case 1:
                        if (!(ctx.pc < ops.length)) return [3, 163];
                        ctx.lastpc = ctx.pc;
                        _a = ops[ctx.pc];
                        switch (_a) {
                            case op_enum.NOP: return [3, 2];
                            case op_enum.MOVE: return [3, 3];
                            case op_enum.INC: return [3, 4];
                            case op_enum.NIL: return [3, 5];
                            case op_enum.NUMP8: return [3, 6];
                            case op_enum.NUMN8: return [3, 7];
                            case op_enum.NUMP16: return [3, 8];
                            case op_enum.NUMN16: return [3, 9];
                            case op_enum.NUMP32: return [3, 10];
                            case op_enum.NUMN32: return [3, 11];
                            case op_enum.NUMDBL: return [3, 12];
                            case op_enum.STR: return [3, 13];
                            case op_enum.LIST: return [3, 14];
                            case op_enum.ISNUM: return [3, 15];
                            case op_enum.ISSTR: return [3, 16];
                            case op_enum.ISLIST: return [3, 17];
                            case op_enum.NOT: return [3, 18];
                            case op_enum.SIZE: return [3, 19];
                            case op_enum.TONUM: return [3, 20];
                            case op_enum.CAT: return [3, 21];
                            case op_enum.LT: return [3, 22];
                            case op_enum.LTE: return [3, 23];
                            case op_enum.NEQ: return [3, 24];
                            case op_enum.EQU: return [3, 25];
                            case op_enum.GETAT: return [3, 26];
                            case op_enum.SLICE: return [3, 27];
                            case op_enum.SETAT: return [3, 28];
                            case op_enum.SPLICE: return [3, 29];
                            case op_enum.JUMP: return [3, 30];
                            case op_enum.JUMPTRUE: return [3, 31];
                            case op_enum.JUMPFALSE: return [3, 32];
                            case op_enum.CMDTAIL: return [3, 33];
                            case op_enum.CALL: return [3, 34];
                            case op_enum.NATIVE: return [3, 35];
                            case op_enum.RETURN: return [3, 40];
                            case op_enum.RETURNTAIL: return [3, 41];
                            case op_enum.RANGE: return [3, 42];
                            case op_enum.ORDER: return [3, 43];
                            case op_enum.SAY: return [3, 44];
                            case op_enum.WARN: return [3, 46];
                            case op_enum.ASK: return [3, 48];
                            case op_enum.EXIT: return [3, 50];
                            case op_enum.ABORT: return [3, 53];
                            case op_enum.STACKTRACE: return [3, 54];
                            case op_enum.NUM_NEG: return [3, 55];
                            case op_enum.NUM_ADD: return [3, 56];
                            case op_enum.NUM_SUB: return [3, 57];
                            case op_enum.NUM_MUL: return [3, 58];
                            case op_enum.NUM_DIV: return [3, 59];
                            case op_enum.NUM_MOD: return [3, 60];
                            case op_enum.NUM_POW: return [3, 61];
                            case op_enum.NUM_ABS: return [3, 62];
                            case op_enum.NUM_SIGN: return [3, 63];
                            case op_enum.NUM_MAX: return [3, 64];
                            case op_enum.NUM_MIN: return [3, 65];
                            case op_enum.NUM_CLAMP: return [3, 66];
                            case op_enum.NUM_FLOOR: return [3, 67];
                            case op_enum.NUM_CEIL: return [3, 68];
                            case op_enum.NUM_ROUND: return [3, 69];
                            case op_enum.NUM_TRUNC: return [3, 70];
                            case op_enum.NUM_NAN: return [3, 71];
                            case op_enum.NUM_INF: return [3, 72];
                            case op_enum.NUM_ISNAN: return [3, 73];
                            case op_enum.NUM_ISFINITE: return [3, 74];
                            case op_enum.NUM_SIN: return [3, 75];
                            case op_enum.NUM_COS: return [3, 76];
                            case op_enum.NUM_TAN: return [3, 77];
                            case op_enum.NUM_ASIN: return [3, 78];
                            case op_enum.NUM_ACOS: return [3, 79];
                            case op_enum.NUM_ATAN: return [3, 80];
                            case op_enum.NUM_ATAN2: return [3, 81];
                            case op_enum.NUM_LOG: return [3, 82];
                            case op_enum.NUM_LOG2: return [3, 83];
                            case op_enum.NUM_LOG10: return [3, 84];
                            case op_enum.NUM_EXP: return [3, 85];
                            case op_enum.NUM_LERP: return [3, 86];
                            case op_enum.NUM_HEX: return [3, 87];
                            case op_enum.NUM_OCT: return [3, 88];
                            case op_enum.NUM_BIN: return [3, 89];
                            case op_enum.INT_NEW: return [3, 90];
                            case op_enum.INT_NOT: return [3, 91];
                            case op_enum.INT_AND: return [3, 92];
                            case op_enum.INT_OR: return [3, 93];
                            case op_enum.INT_XOR: return [3, 94];
                            case op_enum.INT_SHL: return [3, 95];
                            case op_enum.INT_SHR: return [3, 96];
                            case op_enum.INT_SAR: return [3, 97];
                            case op_enum.INT_ADD: return [3, 98];
                            case op_enum.INT_SUB: return [3, 99];
                            case op_enum.INT_MUL: return [3, 100];
                            case op_enum.INT_DIV: return [3, 101];
                            case op_enum.INT_MOD: return [3, 102];
                            case op_enum.INT_CLZ: return [3, 103];
                            case op_enum.INT_POP: return [3, 104];
                            case op_enum.INT_BSWAP: return [3, 105];
                            case op_enum.RAND_SEED: return [3, 106];
                            case op_enum.RAND_SEEDAUTO: return [3, 107];
                            case op_enum.RAND_INT: return [3, 108];
                            case op_enum.RAND_NUM: return [3, 109];
                            case op_enum.RAND_GETSTATE: return [3, 110];
                            case op_enum.RAND_SETSTATE: return [3, 111];
                            case op_enum.RAND_PICK: return [3, 112];
                            case op_enum.RAND_SHUFFLE: return [3, 113];
                            case op_enum.STR_NEW: return [3, 114];
                            case op_enum.STR_SPLIT: return [3, 115];
                            case op_enum.STR_REPLACE: return [3, 116];
                            case op_enum.STR_BEGINS: return [3, 117];
                            case op_enum.STR_ENDS: return [3, 118];
                            case op_enum.STR_PAD: return [3, 119];
                            case op_enum.STR_FIND: return [3, 120];
                            case op_enum.STR_RFIND: return [3, 121];
                            case op_enum.STR_LOWER: return [3, 122];
                            case op_enum.STR_UPPER: return [3, 123];
                            case op_enum.STR_TRIM: return [3, 124];
                            case op_enum.STR_REV: return [3, 125];
                            case op_enum.STR_REP: return [3, 126];
                            case op_enum.STR_LIST: return [3, 127];
                            case op_enum.STR_BYTE: return [3, 128];
                            case op_enum.STR_HASH: return [3, 129];
                            case op_enum.UTF8_VALID: return [3, 130];
                            case op_enum.UTF8_LIST: return [3, 131];
                            case op_enum.UTF8_STR: return [3, 132];
                            case op_enum.STRUCT_SIZE: return [3, 133];
                            case op_enum.STRUCT_STR: return [3, 134];
                            case op_enum.STRUCT_LIST: return [3, 135];
                            case op_enum.STRUCT_ISLE: return [3, 136];
                            case op_enum.LIST_NEW: return [3, 137];
                            case op_enum.LIST_SHIFT: return [3, 138];
                            case op_enum.LIST_POP: return [3, 139];
                            case op_enum.LIST_PUSH: return [3, 140];
                            case op_enum.LIST_UNSHIFT: return [3, 141];
                            case op_enum.LIST_APPEND: return [3, 142];
                            case op_enum.LIST_PREPEND: return [3, 143];
                            case op_enum.LIST_FIND: return [3, 144];
                            case op_enum.LIST_RFIND: return [3, 145];
                            case op_enum.LIST_JOIN: return [3, 146];
                            case op_enum.LIST_REV: return [3, 147];
                            case op_enum.LIST_STR: return [3, 148];
                            case op_enum.LIST_SORT: return [3, 149];
                            case op_enum.LIST_RSORT: return [3, 150];
                            case op_enum.PICKLE_JSON: return [3, 151];
                            case op_enum.PICKLE_BIN: return [3, 152];
                            case op_enum.PICKLE_VAL: return [3, 153];
                            case op_enum.PICKLE_VALID: return [3, 154];
                            case op_enum.PICKLE_SIBLING: return [3, 155];
                            case op_enum.PICKLE_CIRCULAR: return [3, 156];
                            case op_enum.PICKLE_COPY: return [3, 157];
                            case op_enum.GC_GETLEVEL: return [3, 158];
                            case op_enum.GC_SETLEVEL: return [3, 159];
                            case op_enum.GC_RUN: return [3, 160];
                        }
                        return [3, 161];
                    case 2:
                        {
                            ctx.pc++;
                        }
                        return [3, 162];
                    case 3:
                        {
                            LOAD_abcd();
                            var_set(ctx, A, B, var_get(ctx, C, D));
                        }
                        return [3, 162];
                    case 4:
                        {
                            LOAD_ab();
                            X = var_get(ctx, A, B);
                            if (!isnum(X))
                                return [2, RUNDONE(opi_abort(ctx, 'Expecting number when incrementing'))];
                            var_set(ctx, A, B, X + 1);
                        }
                        return [3, 162];
                    case 5:
                        {
                            LOAD_ab();
                            var_set(ctx, A, B, exports.NIL);
                        }
                        return [3, 162];
                    case 6:
                        {
                            LOAD_abc();
                            var_set(ctx, A, B, C);
                        }
                        return [3, 162];
                    case 7:
                        {
                            LOAD_abc();
                            var_set(ctx, A, B, C - 256);
                        }
                        return [3, 162];
                    case 8:
                        {
                            LOAD_abcd();
                            var_set(ctx, A, B, C | (D << 8));
                        }
                        return [3, 162];
                    case 9:
                        {
                            LOAD_abcd();
                            var_set(ctx, A, B, (C | (D << 8)) - 65536);
                        }
                        return [3, 162];
                    case 10:
                        {
                            LOAD_abcdef();
                            C |= (D << 8) | (E << 16) | (F << 24);
                            if (C < 0)
                                C += 4294967296;
                            var_set(ctx, A, B, C);
                        }
                        return [3, 162];
                    case 11:
                        {
                            LOAD_abcdef();
                            C |= (D << 8) | (E << 16) | (F << 24);
                            if (C < 0)
                                C += 4294967296;
                            var_set(ctx, A, B, C - 4294967296);
                        }
                        return [3, 162];
                    case 12:
                        {
                            LOAD_abcdefghij();
                            dview.setUint8(0, C);
                            dview.setUint8(1, D);
                            dview.setUint8(2, E);
                            dview.setUint8(3, F);
                            dview.setUint8(4, G);
                            dview.setUint8(5, H);
                            dview.setUint8(6, I);
                            dview.setUint8(7, J);
                            var_set(ctx, A, B, dview.getFloat64(0, true));
                        }
                        return [3, 162];
                    case 13:
                        {
                            LOAD_abcdef();
                            C = C + (D << 8) + (E << 16) + ((F << 23) * 2);
                            var_set(ctx, A, B, ctx.prg.strTable[C]);
                        }
                        return [3, 162];
                    case 14:
                        {
                            LOAD_abc();
                            var_set(ctx, A, B, new list());
                        }
                        return [3, 162];
                    case 15:
                        {
                            LOAD_abcd();
                            X = var_get(ctx, C, D);
                            var_set(ctx, A, B, bool(isnum(X)));
                        }
                        return [3, 162];
                    case 16:
                        {
                            LOAD_abcd();
                            X = var_get(ctx, C, D);
                            var_set(ctx, A, B, bool(isstr(X)));
                        }
                        return [3, 162];
                    case 17:
                        {
                            LOAD_abcd();
                            X = var_get(ctx, C, D);
                            var_set(ctx, A, B, bool(islist(X)));
                        }
                        return [3, 162];
                    case 18:
                        {
                            LOAD_abcd();
                            X = var_get(ctx, C, D);
                            var_set(ctx, A, B, bool(isfalse(X)));
                        }
                        return [3, 162];
                    case 19:
                        {
                            LOAD_abcd();
                            var_set(ctx, A, B, size(ctx, var_get(ctx, C, D)));
                            if (ctx.failed)
                                return [2, RUNDONE(run.FAIL)];
                        }
                        return [3, 162];
                    case 20:
                        {
                            LOAD_abcd();
                            var_set(ctx, A, B, tonum(ctx, var_get(ctx, C, D)));
                            if (ctx.failed)
                                return [2, RUNDONE(run.FAIL)];
                        }
                        return [3, 162];
                    case 21:
                        {
                            LOAD_abc();
                            listcat = C > 0;
                            p = [];
                            for (D = 0; D < C; D++) {
                                E = ops[ctx.pc++];
                                F = ops[ctx.pc++];
                                p.push(var_get(ctx, E, F));
                                if (!islist(p[D]))
                                    listcat = false;
                            }
                            if (listcat)
                                var_set(ctx, A, B, opi_list_cat(ctx, p));
                            else {
                                var_set(ctx, A, B, str_cat(ctx, p));
                                if (ctx.failed)
                                    return [2, RUNDONE(run.FAIL)];
                            }
                        }
                        return [3, 162];
                    case 22:
                        {
                            LOAD_abcdef();
                            X = var_get(ctx, C, D);
                            Y = var_get(ctx, E, F);
                            if ((isstr(X) && isstr(Y)) ||
                                (isnum(X) && isnum(Y)))
                                var_set(ctx, A, B, bool(X < Y));
                            else
                                return [2, RUNDONE(opi_abort(ctx, 'Expecting numbers or strings'))];
                        }
                        return [3, 162];
                    case 23:
                        {
                            LOAD_abcdef();
                            X = var_get(ctx, C, D);
                            Y = var_get(ctx, E, F);
                            if ((isstr(X) && isstr(Y)) ||
                                (isnum(X) && isnum(Y)))
                                var_set(ctx, A, B, bool(X <= Y));
                            else
                                return [2, RUNDONE(opi_abort(ctx, 'Expecting numbers or strings'))];
                        }
                        return [3, 162];
                    case 24:
                        {
                            LOAD_abcdef();
                            X = var_get(ctx, C, D);
                            Y = var_get(ctx, E, F);
                            var_set(ctx, A, B, bool(X !== Y));
                        }
                        return [3, 162];
                    case 25:
                        {
                            LOAD_abcdef();
                            X = var_get(ctx, C, D);
                            Y = var_get(ctx, E, F);
                            var_set(ctx, A, B, bool(X === Y));
                        }
                        return [3, 162];
                    case 26:
                        {
                            LOAD_abcdef();
                            X = var_get(ctx, C, D);
                            if (!islist(X) && !isstr(X))
                                return [2, RUNDONE(opi_abort(ctx, 'Expecting list or string when indexing'))];
                            Y = var_get(ctx, E, F);
                            if (!isnum(Y))
                                return [2, RUNDONE(opi_abort(ctx, 'Expecting index to be number'))];
                            I = Y;
                            if (islist(X)) {
                                ls = X;
                                if (I < 0)
                                    I += ls.length;
                                if (I < 0 || I >= ls.length)
                                    var_set(ctx, A, B, exports.NIL);
                                else
                                    var_set(ctx, A, B, ls[I]);
                            }
                            else {
                                str = X;
                                if (I < 0)
                                    I += str.length;
                                if (I < 0 || I >= str.length)
                                    var_set(ctx, A, B, exports.NIL);
                                else
                                    var_set(ctx, A, B, str.charAt(I));
                            }
                        }
                        return [3, 162];
                    case 27:
                        {
                            LOAD_abcdefgh();
                            X = var_get(ctx, C, D);
                            Y = var_get(ctx, E, F);
                            Z = var_get(ctx, G, H);
                            if (islist(X))
                                var_set(ctx, A, B, list_slice(ctx, X, Y, Z));
                            else
                                var_set(ctx, A, B, str_slice(ctx, X, Y, Z));
                            if (ctx.failed)
                                return [2, RUNDONE(run.FAIL)];
                        }
                        return [3, 162];
                    case 28:
                        {
                            LOAD_abcdef();
                            X = var_get(ctx, A, B);
                            if (!islist(X))
                                return [2, RUNDONE(opi_abort(ctx, 'Expecting list when setting index'))];
                            Y = var_get(ctx, C, D);
                            if (!isnum(Y))
                                return [2, RUNDONE(opi_abort(ctx, 'Expecting index to be number'))];
                            ls = X;
                            A = Y;
                            if (A < 0)
                                A += ls.length;
                            while (ls.length < A + 1)
                                ls.push(exports.NIL);
                            if (A >= 0 && A < ls.length)
                                ls[A] = var_get(ctx, E, F);
                        }
                        return [3, 162];
                    case 29:
                        {
                            LOAD_abcdefgh();
                            X = var_get(ctx, A, B);
                            Y = var_get(ctx, C, D);
                            Z = var_get(ctx, E, F);
                            W = var_get(ctx, G, H);
                            if (islist(X))
                                list_splice(ctx, X, Y, Z, W);
                            else if (isstr(X))
                                var_set(ctx, A, B, str_splice(ctx, X, Y, Z, W));
                            else
                                return [2, RUNDONE(opi_abort(ctx, 'Expecting list or string when splicing'))];
                        }
                        return [3, 162];
                    case 30:
                        {
                            LOAD_abcd();
                            A = A + (B << 8) + (C << 16) + ((D << 23) * 2);
                            if (ctx.prg.repl && A === 0xFFFFFFFF) {
                                ctx.pc -= 5;
                                return [2, RUNDONE(run.REPLMORE)];
                            }
                            ctx.pc = A;
                        }
                        return [3, 162];
                    case 31:
                        {
                            LOAD_abcdef();
                            C = C + (D << 8) + (E << 16) + ((F << 23) * 2);
                            if (var_get(ctx, A, B) !== null) {
                                if (ctx.prg.repl && C === 0xFFFFFFFF) {
                                    ctx.pc -= 7;
                                    return [2, RUNDONE(run.REPLMORE)];
                                }
                                ctx.pc = C;
                            }
                        }
                        return [3, 162];
                    case 32:
                        {
                            LOAD_abcdef();
                            C = C + (D << 8) + (E << 16) + ((F << 23) * 2);
                            if (var_get(ctx, A, B) === null) {
                                if (ctx.prg.repl && C === 0xFFFFFFFF) {
                                    ctx.pc -= 7;
                                    return [2, RUNDONE(run.REPLMORE)];
                                }
                                ctx.pc = C;
                            }
                        }
                        return [3, 162];
                    case 33:
                        {
                            s = ctx.call_stk.pop();
                            lx = ctx.lex_stk[ctx.lex_index];
                            ctx.lex_stk[ctx.lex_index] = lx.next;
                            lxs_release(ctx, lx);
                            ctx.lex_index = s.lex_index;
                            var_set(ctx, s.frame, s.index, exports.NIL);
                            ctx.pc = s.pc;
                            ccs_release(ctx, s);
                        }
                        return [3, 162];
                    case 34:
                        {
                            LOAD_abcdefg();
                            C = C + (D << 8) + (E << 16) + ((F << 23) * 2);
                            if (C === 0xFFFFFFFF) {
                                ctx.pc -= 8;
                                return [2, RUNDONE(run.REPLMORE)];
                            }
                            p = [];
                            for (I = 0; I < G; I++) {
                                E = ops[ctx.pc++];
                                F = ops[ctx.pc++];
                                p.push(var_get(ctx, E, F));
                            }
                            ctx.call_stk.push(ccs_get(ctx, ctx.pc, A, B, ctx.lex_index));
                            ctx.pc = C - 1;
                            LOAD_abc();
                            if (C !== 0xFF) {
                                if (G <= C) {
                                    while (G < C)
                                        p[G++] = exports.NIL;
                                    p[G] = new list();
                                }
                                else {
                                    sl = p.slice(C, G);
                                    np = new list();
                                    np.push.apply(np, sl);
                                    p[C] = np;
                                }
                                G = C + 1;
                            }
                            ctx.lex_index = B;
                            while (ctx.lex_index >= ctx.lex_stk.length)
                                ctx.lex_stk.push(null);
                            ctx.lex_stk[ctx.lex_index] = lxs_get(ctx, p, ctx.lex_stk[ctx.lex_index]);
                        }
                        return [3, 162];
                    case 35:
                        LOAD_abcdefg();
                        p = [];
                        for (I = 0; I < G; I++) {
                            J = ops[ctx.pc++];
                            H = ops[ctx.pc++];
                            p.push(var_get(ctx, J, H));
                        }
                        C = C + (D << 8) + (E << 16) + ((F << 23) * 2);
                        nat = null;
                        if (ctx.prg.repl) {
                            hash = ctx.prg.keyTable[C];
                            for (i = 0; i < ctx.natives.length; i++) {
                                nat2 = ctx.natives[i];
                                if (u64_equ(nat2.hash, hash)) {
                                    nat = nat2;
                                    break;
                                }
                            }
                        }
                        else
                            nat = ctx.natives[C];
                        if (nat === null || nat.f_native === null)
                            return [2, RUNDONE(opi_abort(ctx, 'Native call not implemented'))];
                        ctx.async = true;
                        _b.label = 36;
                    case 36:
                        _b.trys.push([36, 38, , 39]);
                        return [4, nat.f_native(ctx, p, nat.natuser)];
                    case 37:
                        X = _b.sent();
                        return [3, 39];
                    case 38:
                        e_1 = _b.sent();
                        ctx.async = false;
                        ctx.failed = true;
                        return [2, RUNDONE(opi_abort(ctx, '' + e_1))];
                    case 39:
                        ctx.async = false;
                        if (ctx.failed)
                            return [2, RUNDONE(run.FAIL)];
                        var_set(ctx, A, B, X);
                        return [3, 162];
                    case 40:
                        {
                            if (ctx.call_stk.length <= 0)
                                return [2, RUNDONE(opi_exit(ctx))];
                            LOAD_ab();
                            X = var_get(ctx, A, B);
                            s = ctx.call_stk.pop();
                            lx = ctx.lex_stk[ctx.lex_index];
                            ctx.lex_stk[ctx.lex_index] = lx.next;
                            lxs_release(ctx, lx);
                            ctx.lex_index = s.lex_index;
                            var_set(ctx, s.frame, s.index, X);
                            ctx.pc = s.pc;
                            ccs_release(ctx, s);
                        }
                        return [3, 162];
                    case 41:
                        {
                            LOAD_abcde();
                            A = A + (B << 8) + (C << 16) + ((D << 23) * 2);
                            if (A === 0xFFFFFFFF) {
                                ctx.pc -= 6;
                                return [2, RUNDONE(run.REPLMORE)];
                            }
                            p = [];
                            for (I = 0; I < E; I++) {
                                G = ops[ctx.pc++];
                                H = ops[ctx.pc++];
                                p.push(var_get(ctx, G, H));
                            }
                            ctx.pc = A - 1;
                            LOAD_abc();
                            if (C !== 0xFF) {
                                if (E <= C) {
                                    while (E < C)
                                        p[E++] = exports.NIL;
                                    p[E] = new list();
                                }
                                else {
                                    sl = p.slice(C, E);
                                    np = new list();
                                    np.push.apply(np, sl);
                                    p[C] = np;
                                }
                                E = C + 1;
                            }
                            lx = ctx.lex_stk[ctx.lex_index];
                            lx2 = lx.next;
                            lxs_release(ctx, lx);
                            ctx.lex_stk[ctx.lex_index] = lxs_get(ctx, p, lx2);
                        }
                        return [3, 162];
                    case 42:
                        {
                            LOAD_abcdefgh();
                            X = var_get(ctx, C, D);
                            Y = var_get(ctx, E, F);
                            Z = var_get(ctx, G, H);
                            if (!isnum(X))
                                return [2, RUNDONE(opi_abort(ctx, 'Expecting number for range'))];
                            if (isnum(Y)) {
                                if (isnil(Z))
                                    Z = 1;
                                if (!isnum(Z))
                                    return [2, RUNDONE(opi_abort(ctx, 'Expecting number for range step'))];
                                X = range(ctx, X, Y, Z);
                            }
                            else if (isnil(Y)) {
                                if (!isnil(Z))
                                    return [2, RUNDONE(opi_abort(ctx, 'Expecting number for range stop'))];
                                X = range(ctx, 0, X, 1);
                            }
                            else
                                return [2, RUNDONE(opi_abort(ctx, 'Expecting number for range stop'))];
                            var_set(ctx, A, B, X);
                            if (ctx.failed)
                                return [2, RUNDONE(run.FAIL)];
                        }
                        return [3, 162];
                    case 43:
                        {
                            LOAD_abcdef();
                            X = var_get(ctx, C, D);
                            Y = var_get(ctx, E, F);
                            var_set(ctx, A, B, order(ctx, X, Y));
                        }
                        return [3, 162];
                    case 44:
                        LOAD_abc();
                        p = [];
                        for (D = 0; D < C; D++) {
                            E = ops[ctx.pc++];
                            F = ops[ctx.pc++];
                            p.push(var_get(ctx, E, F));
                        }
                        ctx.async = true;
                        return [4, say(ctx, p)];
                    case 45:
                        X = _b.sent();
                        ctx.async = false;
                        if (ctx.failed) {
                            var_set(ctx, A, B, exports.NIL);
                            return [2, RUNDONE(run.FAIL)];
                        }
                        else
                            var_set(ctx, A, B, X);
                        return [3, 162];
                    case 46:
                        LOAD_abc();
                        p = [];
                        for (D = 0; D < C; D++) {
                            E = ops[ctx.pc++];
                            F = ops[ctx.pc++];
                            p.push(var_get(ctx, E, F));
                        }
                        ctx.async = true;
                        return [4, warn(ctx, p)];
                    case 47:
                        X = _b.sent();
                        ctx.async = false;
                        if (ctx.failed) {
                            var_set(ctx, A, B, exports.NIL);
                            return [2, RUNDONE(run.FAIL)];
                        }
                        else
                            var_set(ctx, A, B, X);
                        return [3, 162];
                    case 48:
                        LOAD_abc();
                        p = [];
                        for (D = 0; D < C; D++) {
                            E = ops[ctx.pc++];
                            F = ops[ctx.pc++];
                            p.push(var_get(ctx, E, F));
                        }
                        ctx.async = true;
                        return [4, ask(ctx, p)];
                    case 49:
                        X = _b.sent();
                        ctx.async = false;
                        if (ctx.failed) {
                            var_set(ctx, A, B, exports.NIL);
                            return [2, RUNDONE(run.FAIL)];
                        }
                        else
                            var_set(ctx, A, B, X);
                        return [3, 162];
                    case 50:
                        LOAD_abc();
                        if (!(C > 0)) return [3, 52];
                        p = [];
                        for (D = 0; D < C; D++) {
                            E = ops[ctx.pc++];
                            F = ops[ctx.pc++];
                            p.push(var_get(ctx, E, F));
                        }
                        ctx.async = true;
                        return [4, say(ctx, p)];
                    case 51:
                        _b.sent();
                        ctx.async = false;
                        if (ctx.failed)
                            return [2, RUNDONE(run.FAIL)];
                        _b.label = 52;
                    case 52: return [2, RUNDONE(opi_exit(ctx))];
                    case 53:
                        {
                            LOAD_abc();
                            err = null;
                            if (C > 0) {
                                p = [];
                                for (D = 0; D < C; D++) {
                                    E = ops[ctx.pc++];
                                    F = ops[ctx.pc++];
                                    p.push(var_get(ctx, E, F));
                                }
                                err = list_joinplain(p, ' ');
                            }
                            return [2, RUNDONE(opi_abort(ctx, err))];
                        }
                        _b.label = 54;
                    case 54:
                        {
                            LOAD_ab();
                            var_set(ctx, A, B, stacktrace(ctx));
                        }
                        return [3, 162];
                    case 55:
                        {
                            INLINE_UNOP(unop_num_neg, txt_num_neg);
                            if (ctx.failed)
                                return [2, RUNDONE(run.FAIL)];
                        }
                        return [3, 162];
                    case 56:
                        {
                            INLINE_BINOP(binop_num_add, txt_num_add);
                            if (ctx.failed)
                                return [2, RUNDONE(run.FAIL)];
                        }
                        return [3, 162];
                    case 57:
                        {
                            INLINE_BINOP(binop_num_sub, txt_num_sub);
                            if (ctx.failed)
                                return [2, RUNDONE(run.FAIL)];
                        }
                        return [3, 162];
                    case 58:
                        {
                            INLINE_BINOP(binop_num_mul, txt_num_mul);
                            if (ctx.failed)
                                return [2, RUNDONE(run.FAIL)];
                        }
                        return [3, 162];
                    case 59:
                        {
                            INLINE_BINOP(binop_num_div, txt_num_div);
                            if (ctx.failed)
                                return [2, RUNDONE(run.FAIL)];
                        }
                        return [3, 162];
                    case 60:
                        {
                            INLINE_BINOP(binop_num_mod, txt_num_mod);
                            if (ctx.failed)
                                return [2, RUNDONE(run.FAIL)];
                        }
                        return [3, 162];
                    case 61:
                        {
                            INLINE_BINOP(binop_num_pow, txt_num_pow);
                            if (ctx.failed)
                                return [2, RUNDONE(run.FAIL)];
                        }
                        return [3, 162];
                    case 62:
                        {
                            INLINE_UNOP(unop_num_abs, txt_num_abs);
                            if (ctx.failed)
                                return [2, RUNDONE(run.FAIL)];
                        }
                        return [3, 162];
                    case 63:
                        {
                            INLINE_UNOP(unop_num_sign, txt_num_sign);
                            if (ctx.failed)
                                return [2, RUNDONE(run.FAIL)];
                        }
                        return [3, 162];
                    case 64:
                        {
                            LOAD_abc();
                            p = [];
                            for (D = 0; D < C; D++) {
                                E = ops[ctx.pc++];
                                F = ops[ctx.pc++];
                                p.push(var_get(ctx, E, F));
                            }
                            var_set(ctx, A, B, opi_num_max(p));
                        }
                        return [3, 162];
                    case 65:
                        {
                            LOAD_abc();
                            p = [];
                            for (D = 0; D < C; D++) {
                                E = ops[ctx.pc++];
                                F = ops[ctx.pc++];
                                p.push(var_get(ctx, E, F));
                            }
                            var_set(ctx, A, B, opi_num_min(p));
                        }
                        return [3, 162];
                    case 66:
                        {
                            INLINE_TRIOP(triop_num_clamp, txt_num_clamp);
                            if (ctx.failed)
                                return [2, RUNDONE(run.FAIL)];
                        }
                        return [3, 162];
                    case 67:
                        {
                            INLINE_UNOP(unop_num_floor, txt_num_floor);
                            if (ctx.failed)
                                return [2, RUNDONE(run.FAIL)];
                        }
                        return [3, 162];
                    case 68:
                        {
                            INLINE_UNOP(unop_num_ceil, txt_num_ceil);
                            if (ctx.failed)
                                return [2, RUNDONE(run.FAIL)];
                        }
                        return [3, 162];
                    case 69:
                        {
                            INLINE_UNOP(unop_num_round, txt_num_round);
                            if (ctx.failed)
                                return [2, RUNDONE(run.FAIL)];
                        }
                        return [3, 162];
                    case 70:
                        {
                            INLINE_UNOP(unop_num_trunc, txt_num_trunc);
                            if (ctx.failed)
                                return [2, RUNDONE(run.FAIL)];
                        }
                        return [3, 162];
                    case 71:
                        {
                            LOAD_ab();
                            var_set(ctx, A, B, num_nan());
                        }
                        return [3, 162];
                    case 72:
                        {
                            LOAD_ab();
                            var_set(ctx, A, B, num_inf());
                        }
                        return [3, 162];
                    case 73:
                        {
                            INLINE_UNOP(unop_num_isnan, txt_num_isnan);
                            if (ctx.failed)
                                return [2, RUNDONE(run.FAIL)];
                        }
                        return [3, 162];
                    case 74:
                        {
                            INLINE_UNOP(unop_num_isfinite, txt_num_isfinite);
                            if (ctx.failed)
                                return [2, RUNDONE(run.FAIL)];
                        }
                        return [3, 162];
                    case 75:
                        {
                            INLINE_UNOP(unop_num_sin, txt_num_sin);
                            if (ctx.failed)
                                return [2, RUNDONE(run.FAIL)];
                        }
                        return [3, 162];
                    case 76:
                        {
                            INLINE_UNOP(unop_num_cos, txt_num_cos);
                            if (ctx.failed)
                                return [2, RUNDONE(run.FAIL)];
                        }
                        return [3, 162];
                    case 77:
                        {
                            INLINE_UNOP(unop_num_tan, txt_num_tan);
                            if (ctx.failed)
                                return [2, RUNDONE(run.FAIL)];
                        }
                        return [3, 162];
                    case 78:
                        {
                            INLINE_UNOP(unop_num_asin, txt_num_asin);
                            if (ctx.failed)
                                return [2, RUNDONE(run.FAIL)];
                        }
                        return [3, 162];
                    case 79:
                        {
                            INLINE_UNOP(unop_num_acos, txt_num_acos);
                            if (ctx.failed)
                                return [2, RUNDONE(run.FAIL)];
                        }
                        return [3, 162];
                    case 80:
                        {
                            INLINE_UNOP(unop_num_atan, txt_num_atan);
                            if (ctx.failed)
                                return [2, RUNDONE(run.FAIL)];
                        }
                        return [3, 162];
                    case 81:
                        {
                            INLINE_BINOP(binop_num_atan2, txt_num_atan);
                            if (ctx.failed)
                                return [2, RUNDONE(run.FAIL)];
                        }
                        return [3, 162];
                    case 82:
                        {
                            INLINE_UNOP(unop_num_log, txt_num_log);
                            if (ctx.failed)
                                return [2, RUNDONE(run.FAIL)];
                        }
                        return [3, 162];
                    case 83:
                        {
                            INLINE_UNOP(unop_num_log2, txt_num_log);
                            if (ctx.failed)
                                return [2, RUNDONE(run.FAIL)];
                        }
                        return [3, 162];
                    case 84:
                        {
                            INLINE_UNOP(unop_num_log10, txt_num_log);
                            if (ctx.failed)
                                return [2, RUNDONE(run.FAIL)];
                        }
                        return [3, 162];
                    case 85:
                        {
                            INLINE_UNOP(unop_num_exp, txt_num_pow);
                            if (ctx.failed)
                                return [2, RUNDONE(run.FAIL)];
                        }
                        return [3, 162];
                    case 86:
                        {
                            INLINE_TRIOP(triop_num_lerp, txt_num_lerp);
                            if (ctx.failed)
                                return [2, RUNDONE(run.FAIL)];
                        }
                        return [3, 162];
                    case 87:
                        {
                            INLINE_BINOP_T(binop_num_hex, txt_num_hex, LT_ALLOWNUM, LT_ALLOWNUM | LT_ALLOWNIL);
                            if (ctx.failed)
                                return [2, RUNDONE(run.FAIL)];
                        }
                        return [3, 162];
                    case 88:
                        {
                            INLINE_BINOP_T(binop_num_oct, txt_num_oct, LT_ALLOWNUM, LT_ALLOWNUM | LT_ALLOWNIL);
                            if (ctx.failed)
                                return [2, RUNDONE(run.FAIL)];
                        }
                        return [3, 162];
                    case 89:
                        {
                            INLINE_BINOP_T(binop_num_bin, txt_num_bin, LT_ALLOWNUM, LT_ALLOWNUM | LT_ALLOWNIL);
                            if (ctx.failed)
                                return [2, RUNDONE(run.FAIL)];
                        }
                        return [3, 162];
                    case 90:
                        {
                            INLINE_UNOP(unop_int_new, txt_int_new);
                            if (ctx.failed)
                                return [2, RUNDONE(run.FAIL)];
                        }
                        return [3, 162];
                    case 91:
                        {
                            INLINE_UNOP(unop_int_not, txt_int_not);
                            if (ctx.failed)
                                return [2, RUNDONE(run.FAIL)];
                        }
                        return [3, 162];
                    case 92:
                        {
                            LOAD_abc();
                            p = [];
                            for (D = 0; D < C; D++) {
                                E = ops[ctx.pc++];
                                F = ops[ctx.pc++];
                                p.push(var_get(ctx, E, F));
                            }
                            X = opi_combop(ctx, p, binop_int_and, txt_int_and);
                            if (ctx.failed)
                                return [2, RUNDONE(run.FAIL)];
                            var_set(ctx, A, B, X);
                        }
                        return [3, 162];
                    case 93:
                        {
                            LOAD_abc();
                            p = [];
                            for (D = 0; D < C; D++) {
                                E = ops[ctx.pc++];
                                F = ops[ctx.pc++];
                                p.push(var_get(ctx, E, F));
                            }
                            X = opi_combop(ctx, p, binop_int_or, txt_int_or);
                            if (ctx.failed)
                                return [2, RUNDONE(run.FAIL)];
                            var_set(ctx, A, B, X);
                        }
                        return [3, 162];
                    case 94:
                        {
                            LOAD_abc();
                            p = [];
                            for (D = 0; D < C; D++) {
                                E = ops[ctx.pc++];
                                F = ops[ctx.pc++];
                                p.push(var_get(ctx, E, F));
                            }
                            X = opi_combop(ctx, p, binop_int_xor, txt_int_xor);
                            if (ctx.failed)
                                return [2, RUNDONE(run.FAIL)];
                            var_set(ctx, A, B, X);
                        }
                        return [3, 162];
                    case 95:
                        {
                            INLINE_BINOP(binop_int_shl, txt_int_shl);
                            if (ctx.failed)
                                return [2, RUNDONE(run.FAIL)];
                        }
                        return [3, 162];
                    case 96:
                        {
                            INLINE_BINOP(binop_int_shr, txt_int_shr);
                            if (ctx.failed)
                                return [2, RUNDONE(run.FAIL)];
                        }
                        return [3, 162];
                    case 97:
                        {
                            INLINE_BINOP(binop_int_sar, txt_int_shr);
                            if (ctx.failed)
                                return [2, RUNDONE(run.FAIL)];
                        }
                        return [3, 162];
                    case 98:
                        {
                            INLINE_BINOP(binop_int_add, txt_num_add);
                            if (ctx.failed)
                                return [2, RUNDONE(run.FAIL)];
                        }
                        return [3, 162];
                    case 99:
                        {
                            INLINE_BINOP(binop_int_sub, txt_num_sub);
                            if (ctx.failed)
                                return [2, RUNDONE(run.FAIL)];
                        }
                        return [3, 162];
                    case 100:
                        {
                            INLINE_BINOP(binop_int_mul, txt_num_mul);
                            if (ctx.failed)
                                return [2, RUNDONE(run.FAIL)];
                        }
                        return [3, 162];
                    case 101:
                        {
                            INLINE_BINOP(binop_int_div, txt_num_div);
                            if (ctx.failed)
                                return [2, RUNDONE(run.FAIL)];
                        }
                        return [3, 162];
                    case 102:
                        {
                            INLINE_BINOP(binop_int_mod, txt_num_mod);
                            if (ctx.failed)
                                return [2, RUNDONE(run.FAIL)];
                        }
                        return [3, 162];
                    case 103:
                        {
                            INLINE_UNOP(unop_int_clz, txt_int_clz);
                            if (ctx.failed)
                                return [2, RUNDONE(run.FAIL)];
                        }
                        return [3, 162];
                    case 104:
                        {
                            INLINE_UNOP(unop_int_pop, txt_int_pop);
                            if (ctx.failed)
                                return [2, RUNDONE(run.FAIL)];
                        }
                        return [3, 162];
                    case 105:
                        {
                            INLINE_UNOP(unop_int_bswap, txt_int_bswap);
                            if (ctx.failed)
                                return [2, RUNDONE(run.FAIL)];
                        }
                        return [3, 162];
                    case 106:
                        {
                            LOAD_abcd();
                            X = var_get(ctx, C, D);
                            if (isnil(X))
                                X = 0;
                            else if (!isnum(X))
                                return [2, RUNDONE(opi_abort(ctx, 'Expecting number'))];
                            rand_seed(ctx, X);
                            var_set(ctx, A, B, exports.NIL);
                        }
                        return [3, 162];
                    case 107:
                        {
                            LOAD_ab();
                            rand_seedauto(ctx);
                            var_set(ctx, A, B, exports.NIL);
                        }
                        return [3, 162];
                    case 108:
                        {
                            LOAD_ab();
                            var_set(ctx, A, B, rand_int(ctx));
                        }
                        return [3, 162];
                    case 109:
                        {
                            LOAD_ab();
                            var_set(ctx, A, B, rand_num(ctx));
                        }
                        return [3, 162];
                    case 110:
                        {
                            LOAD_ab();
                            var_set(ctx, A, B, rand_getstate(ctx));
                        }
                        return [3, 162];
                    case 111:
                        {
                            LOAD_abcd();
                            rand_setstate(ctx, var_get(ctx, C, D));
                            if (ctx.failed)
                                return [2, RUNDONE(run.FAIL)];
                            var_set(ctx, A, B, exports.NIL);
                        }
                        return [3, 162];
                    case 112:
                        {
                            LOAD_abcd();
                            X = rand_pick(ctx, var_get(ctx, C, D));
                            if (ctx.failed)
                                return [2, RUNDONE(run.FAIL)];
                            var_set(ctx, A, B, X);
                        }
                        return [3, 162];
                    case 113:
                        {
                            LOAD_abcd();
                            X = var_get(ctx, C, D);
                            rand_shuffle(ctx, X);
                            if (ctx.failed)
                                return [2, RUNDONE(run.FAIL)];
                            var_set(ctx, A, B, X);
                        }
                        return [3, 162];
                    case 114:
                        {
                            LOAD_abc();
                            p = [];
                            for (D = 0; D < C; D++) {
                                E = ops[ctx.pc++];
                                F = ops[ctx.pc++];
                                p.push(var_get(ctx, E, F));
                            }
                            var_set(ctx, A, B, str_new(ctx, p));
                        }
                        return [3, 162];
                    case 115:
                        {
                            LOAD_abcdef();
                            X = var_get(ctx, C, D);
                            Y = var_get(ctx, E, F);
                            X = str_split(ctx, X, Y);
                            if (ctx.failed)
                                return [2, RUNDONE(run.FAIL)];
                            var_set(ctx, A, B, X);
                        }
                        return [3, 162];
                    case 116:
                        {
                            LOAD_abcdefgh();
                            X = var_get(ctx, C, D);
                            Y = var_get(ctx, E, F);
                            Z = var_get(ctx, G, H);
                            X = str_replace(ctx, X, Y, Z);
                            if (ctx.failed)
                                return [2, RUNDONE(run.FAIL)];
                            var_set(ctx, A, B, X);
                        }
                        return [3, 162];
                    case 117:
                        {
                            LOAD_abcdef();
                            X = var_get(ctx, C, D);
                            Y = var_get(ctx, E, F);
                            X = bool(str_begins(ctx, X, Y));
                            if (ctx.failed)
                                return [2, RUNDONE(run.FAIL)];
                            var_set(ctx, A, B, X);
                        }
                        return [3, 162];
                    case 118:
                        {
                            LOAD_abcdef();
                            X = var_get(ctx, C, D);
                            Y = var_get(ctx, E, F);
                            X = bool(str_ends(ctx, X, Y));
                            if (ctx.failed)
                                return [2, RUNDONE(run.FAIL)];
                            var_set(ctx, A, B, X);
                        }
                        return [3, 162];
                    case 119:
                        {
                            LOAD_abcdef();
                            X = var_get(ctx, C, D);
                            Y = var_get(ctx, E, F);
                            if (isnil(Y))
                                Y = 0;
                            else if (!isnum(Y))
                                return [2, RUNDONE(opi_abort(ctx, 'Expecting number'))];
                            X = str_pad(ctx, X, Y);
                            if (ctx.failed)
                                return [2, RUNDONE(run.FAIL)];
                            var_set(ctx, A, B, X);
                        }
                        return [3, 162];
                    case 120:
                        {
                            LOAD_abcdefgh();
                            X = var_get(ctx, C, D);
                            Y = var_get(ctx, E, F);
                            Z = var_get(ctx, G, H);
                            X = str_find(ctx, X, Y, Z);
                            if (ctx.failed)
                                return [2, RUNDONE(run.FAIL)];
                            var_set(ctx, A, B, X);
                        }
                        return [3, 162];
                    case 121:
                        {
                            LOAD_abcdefgh();
                            X = var_get(ctx, C, D);
                            Y = var_get(ctx, E, F);
                            Z = var_get(ctx, G, H);
                            X = str_rfind(ctx, X, Y, Z);
                            if (ctx.failed)
                                return [2, RUNDONE(run.FAIL)];
                            var_set(ctx, A, B, X);
                        }
                        return [3, 162];
                    case 122:
                        {
                            LOAD_abcd();
                            X = var_get(ctx, C, D);
                            X = str_lower(ctx, X);
                            if (ctx.failed)
                                return [2, RUNDONE(run.FAIL)];
                            var_set(ctx, A, B, X);
                        }
                        return [3, 162];
                    case 123:
                        {
                            LOAD_abcd();
                            X = var_get(ctx, C, D);
                            X = str_upper(ctx, X);
                            if (ctx.failed)
                                return [2, RUNDONE(run.FAIL)];
                            var_set(ctx, A, B, X);
                        }
                        return [3, 162];
                    case 124:
                        {
                            LOAD_abcd();
                            X = var_get(ctx, C, D);
                            X = str_trim(ctx, X);
                            if (ctx.failed)
                                return [2, RUNDONE(run.FAIL)];
                            var_set(ctx, A, B, X);
                        }
                        return [3, 162];
                    case 125:
                        {
                            LOAD_abcd();
                            X = var_get(ctx, C, D);
                            X = str_rev(ctx, X);
                            if (ctx.failed)
                                return [2, RUNDONE(run.FAIL)];
                            var_set(ctx, A, B, X);
                        }
                        return [3, 162];
                    case 126:
                        {
                            LOAD_abcdef();
                            X = var_get(ctx, C, D);
                            Y = var_get(ctx, E, F);
                            if (isnil(Y))
                                Y = 0;
                            else if (!isnum(Y))
                                return [2, RUNDONE(opi_abort(ctx, 'Expecting number'))];
                            X = str_rep(ctx, X, Y);
                            if (ctx.failed)
                                return [2, RUNDONE(run.FAIL)];
                            var_set(ctx, A, B, X);
                        }
                        return [3, 162];
                    case 127:
                        {
                            LOAD_abcd();
                            X = var_get(ctx, C, D);
                            X = str_list(ctx, X);
                            if (ctx.failed)
                                return [2, RUNDONE(run.FAIL)];
                            var_set(ctx, A, B, X);
                        }
                        return [3, 162];
                    case 128:
                        {
                            LOAD_abcdef();
                            X = var_get(ctx, C, D);
                            Y = var_get(ctx, E, F);
                            if (isnil(Y))
                                Y = 0;
                            else if (!isnum(Y))
                                return [2, RUNDONE(opi_abort(ctx, 'Expecting number'))];
                            X = str_byte(ctx, X, Y);
                            if (ctx.failed)
                                return [2, RUNDONE(run.FAIL)];
                            var_set(ctx, A, B, X);
                        }
                        return [3, 162];
                    case 129:
                        {
                            LOAD_abcdef();
                            X = var_get(ctx, C, D);
                            Y = var_get(ctx, E, F);
                            if (isnil(Y))
                                Y = 0;
                            else if (!isnum(Y))
                                return [2, RUNDONE(opi_abort(ctx, 'Expecting number'))];
                            X = str_hash(ctx, X, Y);
                            if (ctx.failed)
                                return [2, RUNDONE(run.FAIL)];
                            var_set(ctx, A, B, X);
                        }
                        return [3, 162];
                    case 130:
                        {
                            LOAD_abcd();
                            X = var_get(ctx, C, D);
                            var_set(ctx, A, B, bool(utf8_valid(ctx, X)));
                        }
                        return [3, 162];
                    case 131:
                        {
                            LOAD_abcd();
                            X = var_get(ctx, C, D);
                            X = utf8_list(ctx, X);
                            if (ctx.failed)
                                return [2, RUNDONE(run.FAIL)];
                            var_set(ctx, A, B, X);
                        }
                        return [3, 162];
                    case 132:
                        {
                            LOAD_abcd();
                            X = var_get(ctx, C, D);
                            X = utf8_str(ctx, X);
                            if (ctx.failed)
                                return [2, RUNDONE(run.FAIL)];
                            var_set(ctx, A, B, X);
                        }
                        return [3, 162];
                    case 133:
                        {
                            LOAD_abcd();
                            var_set(ctx, A, B, struct_size(ctx, var_get(ctx, C, D)));
                        }
                        return [3, 162];
                    case 134:
                        {
                            LOAD_abcdef();
                            X = var_get(ctx, C, D);
                            Y = var_get(ctx, E, F);
                            X = struct_str(ctx, X, Y);
                            if (ctx.failed)
                                return [2, RUNDONE(run.FAIL)];
                            var_set(ctx, A, B, X);
                        }
                        return [3, 162];
                    case 135:
                        {
                            LOAD_abcdef();
                            X = var_get(ctx, C, D);
                            Y = var_get(ctx, E, F);
                            X = struct_list(ctx, X, Y);
                            if (ctx.failed)
                                return [2, RUNDONE(run.FAIL)];
                            var_set(ctx, A, B, X);
                        }
                        return [3, 162];
                    case 136:
                        {
                            LOAD_ab();
                            var_set(ctx, A, B, bool(struct_isLE()));
                        }
                        return [3, 162];
                    case 137:
                        {
                            LOAD_abcdef();
                            X = var_get(ctx, C, D);
                            Y = var_get(ctx, E, F);
                            X = list_new(ctx, X, Y);
                            if (ctx.failed)
                                return [2, RUNDONE(run.FAIL)];
                            var_set(ctx, A, B, X);
                        }
                        return [3, 162];
                    case 138:
                        {
                            LOAD_abcd();
                            X = var_get(ctx, C, D);
                            X = list_shift(ctx, X);
                            if (ctx.failed)
                                return [2, RUNDONE(run.FAIL)];
                            var_set(ctx, A, B, X);
                        }
                        return [3, 162];
                    case 139:
                        {
                            LOAD_abcd();
                            X = var_get(ctx, C, D);
                            X = list_pop(ctx, X);
                            if (ctx.failed)
                                return [2, RUNDONE(run.FAIL)];
                            var_set(ctx, A, B, X);
                        }
                        return [3, 162];
                    case 140:
                        {
                            LOAD_abcdef();
                            X = var_get(ctx, C, D);
                            Y = var_get(ctx, E, F);
                            X = list_push(ctx, X, Y);
                            if (ctx.failed)
                                return [2, RUNDONE(run.FAIL)];
                            var_set(ctx, A, B, X);
                        }
                        return [3, 162];
                    case 141:
                        {
                            LOAD_abcdef();
                            X = var_get(ctx, C, D);
                            Y = var_get(ctx, E, F);
                            X = list_unshift(ctx, X, Y);
                            if (ctx.failed)
                                return [2, RUNDONE(run.FAIL)];
                            var_set(ctx, A, B, X);
                        }
                        return [3, 162];
                    case 142:
                        {
                            LOAD_abcdef();
                            X = var_get(ctx, C, D);
                            Y = var_get(ctx, E, F);
                            X = list_append(ctx, X, Y);
                            if (ctx.failed)
                                return [2, RUNDONE(run.FAIL)];
                            var_set(ctx, A, B, X);
                        }
                        return [3, 162];
                    case 143:
                        {
                            LOAD_abcdef();
                            X = var_get(ctx, C, D);
                            Y = var_get(ctx, E, F);
                            X = list_prepend(ctx, X, Y);
                            if (ctx.failed)
                                return [2, RUNDONE(run.FAIL)];
                            var_set(ctx, A, B, X);
                        }
                        return [3, 162];
                    case 144:
                        {
                            LOAD_abcdefgh();
                            X = var_get(ctx, C, D);
                            Y = var_get(ctx, E, F);
                            Z = var_get(ctx, G, H);
                            X = list_find(ctx, X, Y, Z);
                            if (ctx.failed)
                                return [2, RUNDONE(run.FAIL)];
                            var_set(ctx, A, B, X);
                        }
                        return [3, 162];
                    case 145:
                        {
                            LOAD_abcdefgh();
                            X = var_get(ctx, C, D);
                            Y = var_get(ctx, E, F);
                            Z = var_get(ctx, G, H);
                            X = list_rfind(ctx, X, Y, Z);
                            if (ctx.failed)
                                return [2, RUNDONE(run.FAIL)];
                            var_set(ctx, A, B, X);
                        }
                        return [3, 162];
                    case 146:
                        {
                            LOAD_abcdef();
                            X = var_get(ctx, C, D);
                            Y = var_get(ctx, E, F);
                            X = list_join(ctx, X, Y);
                            if (ctx.failed)
                                return [2, RUNDONE(run.FAIL)];
                            var_set(ctx, A, B, X);
                        }
                        return [3, 162];
                    case 147:
                        {
                            LOAD_abcd();
                            X = var_get(ctx, C, D);
                            X = list_rev(ctx, X);
                            if (ctx.failed)
                                return [2, RUNDONE(run.FAIL)];
                            var_set(ctx, A, B, X);
                        }
                        return [3, 162];
                    case 148:
                        {
                            LOAD_abcd();
                            X = var_get(ctx, C, D);
                            X = list_str(ctx, X);
                            if (ctx.failed)
                                return [2, RUNDONE(run.FAIL)];
                            var_set(ctx, A, B, X);
                        }
                        return [3, 162];
                    case 149:
                        {
                            LOAD_abcd();
                            X = var_get(ctx, C, D);
                            list_sort(ctx, X);
                            if (ctx.failed)
                                return [2, RUNDONE(run.FAIL)];
                            var_set(ctx, A, B, X);
                        }
                        return [3, 162];
                    case 150:
                        {
                            LOAD_abcd();
                            X = var_get(ctx, C, D);
                            list_rsort(ctx, X);
                            if (ctx.failed)
                                return [2, RUNDONE(run.FAIL)];
                            var_set(ctx, A, B, X);
                        }
                        return [3, 162];
                    case 151:
                        {
                            LOAD_abcd();
                            X = var_get(ctx, C, D);
                            X = pickle_json(ctx, X);
                            if (ctx.failed)
                                return [2, RUNDONE(run.FAIL)];
                            var_set(ctx, A, B, X);
                        }
                        return [3, 162];
                    case 152:
                        {
                            LOAD_abcd();
                            X = var_get(ctx, C, D);
                            X = pickle_bin(ctx, X);
                            var_set(ctx, A, B, X);
                        }
                        return [3, 162];
                    case 153:
                        {
                            LOAD_abcd();
                            X = var_get(ctx, C, D);
                            X = pickle_val(ctx, X);
                            if (ctx.failed)
                                return [2, RUNDONE(run.FAIL)];
                            var_set(ctx, A, B, X);
                        }
                        return [3, 162];
                    case 154:
                        {
                            LOAD_abcd();
                            X = var_get(ctx, C, D);
                            E = pickle_valid(ctx, X);
                            var_set(ctx, A, B, E === 0 ? exports.NIL : E);
                        }
                        return [3, 162];
                    case 155:
                        {
                            LOAD_abcd();
                            X = var_get(ctx, C, D);
                            var_set(ctx, A, B, bool(pickle_sibling(ctx, X)));
                        }
                        return [3, 162];
                    case 156:
                        {
                            LOAD_abcd();
                            X = var_get(ctx, C, D);
                            var_set(ctx, A, B, bool(pickle_circular(ctx, X)));
                        }
                        return [3, 162];
                    case 157:
                        {
                            LOAD_abcd();
                            X = var_get(ctx, C, D);
                            X = pickle_copy(ctx, X);
                            var_set(ctx, A, B, X);
                        }
                        return [3, 162];
                    case 158:
                        {
                            LOAD_ab();
                            var_set(ctx, A, B, ctx.gc_level);
                        }
                        return [3, 162];
                    case 159:
                        {
                            LOAD_abcd();
                            X = var_get(ctx, C, D);
                            if (!isnum(X) ||
                                (X !== gc_level.NONE && X !== gc_level.DEFAULT && X !== gc_level.LOWMEM))
                                return [2, RUNDONE(opi_abort(ctx, 'Expecting one of gc.NONE, gc.DEFAULT, or gc.LOWMEM'))];
                            ctx.gc_level = X;
                            var_set(ctx, A, B, exports.NIL);
                        }
                        return [3, 162];
                    case 160:
                        {
                            LOAD_ab();
                            var_set(ctx, A, B, exports.NIL);
                        }
                        return [3, 162];
                    case 161: return [3, 162];
                    case 162:
                        if (ctx.timeout > 0) {
                            ctx.timeout_left--;
                            if (ctx.timeout_left <= 0) {
                                ctx.timeout_left = ctx.timeout;
                                return [2, RUNDONE(run.TIMEOUT)];
                            }
                        }
                        return [3, 1];
                    case 163:
                        if (ctx.prg.repl)
                            return [2, RUNDONE(run.REPLMORE)];
                        return [2, RUNDONE(opi_exit(ctx))];
                }
            });
        });
    }
    function flpn_new(fullfile, basefile, next) {
        return {
            lx: lex_new(),
            tks: [],
            stmts: [],
            pgstate: [],
            flp: { fullfile: fullfile, basefile: basefile, line: 1, chr: 1 },
            wascr: false,
            next: next
        };
    }
    function staticinc_new() {
        return { name: [], type: [], content: [] };
    }
    function staticinc_addbody(sinc, name, body) {
        sinc.name.push(name);
        sinc.type.push(0);
        sinc.content.push(body);
    }
    function staticinc_addfile(sinc, name, file) {
        sinc.name.push(name);
        sinc.type.push(1);
        sinc.content.push(file);
    }
    function compiler_new(scr, prg, sinc, inc, file, paths) {
        var cmp = {
            sinc: sinc,
            pr: parser_new(),
            scr: scr,
            prg: prg,
            paths: paths,
            sym: symtbl_new(prg.repl),
            flpn: flpn_new(script_addfile(scr, file), program_addfile(prg, file), null),
            inc: inc,
            msg: null
        };
        symtbl_loadStdlib(cmp.sym);
        return cmp;
    }
    function compiler_setmsg(cmp, msg) {
        cmp.msg = msg;
    }
    function compiler_reset(cmp) {
        compiler_setmsg(cmp, null);
        lex_reset(cmp.flpn.lx);
        cmp.pr = parser_new();
        cmp.flpn.tks = [];
        cmp.flpn.pgstate = [];
    }
    function compiler_begininc(cmp, names, file) {
        cmp.flpn = flpn_new(script_addfile(cmp.scr, file), program_addfile(cmp.prg, file), cmp.flpn);
        if (names) {
            var smsg = symtbl_pushNamespace(cmp.sym, names);
            if (smsg) {
                if (cmp.flpn.next === null)
                    throw new Error('Expecting file position during include');
                cmp.flpn = cmp.flpn.next;
                compiler_setmsg(cmp, smsg);
                return false;
            }
        }
        return true;
    }
    function compiler_begininc_cfu(file, cfu) {
        return compiler_begininc(cfu.cmp, cfu.names, file);
    }
    function compiler_endinc(cmp, ns) {
        if (ns)
            symtbl_popNamespace(cmp.sym);
        if (cmp.flpn.next === null)
            throw new Error('Expecting file position when finishing include');
        cmp.flpn = cmp.flpn.next;
    }
    function compiler_endinc_cfu(success, file, cfu) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!success) return [3, 2];
                        return [4, compiler_closeLexer(cfu.cmp)];
                    case 1:
                        _a.sent();
                        _a.label = 2;
                    case 2:
                        compiler_endinc(cfu.cmp, cfu.names !== null);
                        if (!success && cfu.cmp.msg === null)
                            compiler_setmsg(cfu.cmp, 'Failed to read file: ' + file);
                        return [2];
                }
            });
        });
    }
    function compiler_staticinc(cmp, names, file, body) {
        return __awaiter(this, void 0, void 0, function () {
            var err;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!compiler_begininc(cmp, names, file))
                            return [2, false];
                        return [4, compiler_write(cmp, body)];
                    case 1:
                        err = _a.sent();
                        if (err) {
                            compiler_endinc(cmp, names !== null);
                            return [2, false];
                        }
                        return [4, compiler_closeLexer(cmp)];
                    case 2:
                        err = _a.sent();
                        compiler_endinc(cmp, names !== null);
                        if (err)
                            return [2, false];
                        return [2, true];
                }
            });
        });
    }
    function compiler_dynamicinc(cmp, names, file, from) {
        return __awaiter(this, void 0, void 0, function () {
            var cfu, cwd;
            return __generator(this, function (_a) {
                cfu = { cmp: cmp, names: names };
                cwd = null;
                if (from)
                    cwd = pathjoin(from, '..', cmp.scr.posix);
                return [2, fileres_read(cmp.scr, true, file, cwd, compiler_begininc_cfu, compiler_endinc_cfu, cfu)];
            });
        });
    }
    function compiler_process(cmp) {
        return __awaiter(this, void 0, void 0, function () {
            var stmts, tk, pmsg, stmt, ii, inc, file, internal, i, sinc_name, sinc_content, is_body, success, found, pgsl, pg;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        stmts = [];
                        _a.label = 1;
                    case 1:
                        if (!(cmp.flpn.tks.length > 0)) return [3, 18];
                        while (cmp.flpn.tks.length > 0) {
                            tk = cmp.flpn.tks.shift();
                            if (tk.type === tok_enum.ERROR) {
                                compiler_setmsg(cmp, program_errormsg(cmp.prg, tk.flp, tk.msg));
                                return [2, cmp.msg];
                            }
                            pmsg = parser_add(cmp.pr, tk, stmts);
                            if (pmsg) {
                                compiler_setmsg(cmp, program_errormsg(cmp.prg, tk.flp, pmsg));
                                return [2, cmp.msg];
                            }
                            if (stmts.length > 0 && stmts[stmts.length - 1].type === ast_enumt.INCLUDE)
                                break;
                        }
                        _a.label = 2;
                    case 2:
                        if (!(stmts.length > 0)) return [3, 17];
                        stmt = stmts.shift();
                        if (!(stmt.type === ast_enumt.INCLUDE)) return [3, 14];
                        ii = 0;
                        _a.label = 3;
                    case 3:
                        if (!(ii < stmt.incls.length)) return [3, 13];
                        inc = stmt.incls[ii];
                        file = inc.file;
                        internal = false;
                        i = 0;
                        _a.label = 4;
                    case 4:
                        if (!(i < cmp.sinc.name.length)) return [3, 10];
                        sinc_name = cmp.sinc.name[i];
                        if (!(file === sinc_name)) return [3, 9];
                        internal = true;
                        sinc_content = cmp.sinc.content[i];
                        is_body = cmp.sinc.type[i] === 0;
                        success = void 0;
                        if (!is_body) return [3, 6];
                        return [4, compiler_staticinc(cmp, inc.names, file, sinc_content)];
                    case 5:
                        success = _a.sent();
                        return [3, 8];
                    case 6: return [4, compiler_dynamicinc(cmp, inc.names, sinc_content, script_getfile(cmp.scr, stmt.flp.fullfile))];
                    case 7:
                        success = _a.sent();
                        if (!success)
                            compiler_setmsg(cmp, 'Failed to include: ' + file);
                        _a.label = 8;
                    case 8:
                        if (!success)
                            return [2, cmp.msg];
                        _a.label = 9;
                    case 9:
                        i++;
                        return [3, 4];
                    case 10:
                        if (!!internal) return [3, 12];
                        return [4, compiler_dynamicinc(cmp, inc.names, file, script_getfile(cmp.scr, stmt.flp.fullfile))];
                    case 11:
                        found = _a.sent();
                        if (!found && cmp.msg === null)
                            compiler_setmsg(cmp, 'Failed to include: ' + file);
                        if (cmp.msg)
                            return [2, cmp.msg];
                        _a.label = 12;
                    case 12:
                        ii++;
                        return [3, 3];
                    case 13: return [3, 16];
                    case 14:
                        pgsl = cmp.flpn.pgstate;
                        return [4, program_gen({
                                prg: cmp.prg,
                                sym: cmp.sym,
                                scr: cmp.scr,
                                from: stmt.flp.fullfile
                            }, stmt, pgsl.length <= 0 ? null : pgsl[pgsl.length - 1], cmp.prg.repl && cmp.flpn.next === null && pgsl.length <= 0)];
                    case 15:
                        pg = _a.sent();
                        switch (pg.type) {
                            case pgr_enum.OK:
                                break;
                            case pgr_enum.PUSH:
                                pgsl.push(pg.pgs);
                                break;
                            case pgr_enum.POP:
                                pgsl.pop();
                                break;
                            case pgr_enum.ERROR:
                                compiler_setmsg(cmp, program_errormsg(cmp.prg, pg.flp, pg.msg));
                                return [2, cmp.msg];
                            case pgr_enum.FORVARS:
                                throw new Error('Program generator can\'t return FORVARS');
                        }
                        _a.label = 16;
                    case 16: return [3, 2];
                    case 17: return [3, 1];
                    case 18: return [2, null];
                }
            });
        });
    }
    function compiler_write(cmp, bytes) {
        return __awaiter(this, void 0, void 0, function () {
            var flpn, i, b;
            return __generator(this, function (_a) {
                flpn = cmp.flpn;
                for (i = 0; i < bytes.length; i++) {
                    b = bytes.charAt(i);
                    lex_add(flpn.lx, filepos_copy(flpn.flp), b, flpn.tks);
                    if (b === '\n') {
                        if (!flpn.wascr) {
                            flpn.flp.line++;
                            flpn.flp.chr = 1;
                        }
                        flpn.wascr = false;
                    }
                    else if (b === '\r') {
                        flpn.flp.line++;
                        flpn.flp.chr = 1;
                        flpn.wascr = true;
                    }
                    else {
                        flpn.flp.chr++;
                        flpn.wascr = false;
                    }
                }
                return [2, compiler_process(cmp)];
            });
        });
    }
    function compiler_closeLexer(cmp) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                lex_close(cmp.flpn.lx, cmp.flpn.flp, cmp.flpn.tks);
                return [2, compiler_process(cmp)];
            });
        });
    }
    function compiler_close(cmp) {
        return __awaiter(this, void 0, void 0, function () {
            var err, pmsg;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (cmp.msg)
                            return [2, cmp.msg];
                        return [4, compiler_closeLexer(cmp)];
                    case 1:
                        err = _a.sent();
                        if (err)
                            return [2, err];
                        pmsg = parser_close(cmp.pr);
                        if (pmsg) {
                            compiler_setmsg(cmp, program_errormsg(cmp.prg, cmp.flpn.flp, pmsg));
                            return [2, cmp.msg];
                        }
                        return [2, null];
                }
            });
        });
    }
    function scr_new(inc, curdir, posix, repl) {
        var sc = {
            user: null,
            prg: program_new(posix, repl),
            cmp: null,
            sinc: staticinc_new(),
            files: [],
            paths: [],
            inc: inc,
            capture_write: null,
            curdir: curdir,
            posix: posix,
            file: null,
            err: null,
            mode: scriptmode_enum.UNKNOWN,
            binstate: {
                state: bis_enum.HEADER,
                str_size: 0,
                key_size: 0,
                dbg_size: 0,
                pos_size: 0,
                cmd_size: 0,
                ops_size: 0,
                left: 0,
                item: 0,
                buf: ''
            }
        };
        return sc;
    }
    exports.scr_new = scr_new;
    function script_addfile(scr, file) {
        if (file === null)
            return -1;
        for (var i = 0; i < scr.files.length; i++) {
            if (scr.files[i] === file)
                return i;
        }
        scr.files.push(file);
        return scr.files.length - 1;
    }
    function script_getfile(scr, file) {
        if (file < 0)
            return null;
        return scr.files[file];
    }
    function scr_addpath(scr, path) {
        scr.paths.push(path);
    }
    exports.scr_addpath = scr_addpath;
    function scr_incbody(scr, name, body) {
        staticinc_addbody(scr.sinc, name, body);
    }
    exports.scr_incbody = scr_incbody;
    function scr_incfile(scr, name, file) {
        staticinc_addfile(scr.sinc, name, file);
    }
    exports.scr_incfile = scr_incfile;
    function sfr_begin(file, sc) {
        if (sc.file)
            sc.file = null;
        if (file)
            sc.file = file;
        return true;
    }
    function binary_validate(sc) {
        if (sc.err)
            return;
        if (sc.binstate.state === bis_enum.DONE) {
            if (!program_validate(sc.prg))
                sc.err = 'Error: Invalid program code';
        }
        else
            sc.err = 'Error: Invalid end of file';
    }
    function text_validate(sc, close, resetonclose) {
        return __awaiter(this, void 0, void 0, function () {
            var err2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (sc.err && sc.prg.repl)
                            compiler_reset(sc.cmp);
                        if (!close) return [3, 2];
                        return [4, compiler_close(sc.cmp)];
                    case 1:
                        err2 = _a.sent();
                        if (err2)
                            sc.err = 'Error: ' + err2;
                        if (resetonclose)
                            compiler_reset(sc.cmp);
                        _a.label = 2;
                    case 2: return [2];
                }
            });
        });
    }
    function sfr_end(success, file, sc) {
        return __awaiter(this, void 0, void 0, function () {
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!!success) return [3, 1];
                        sc.err = 'Error: ' + sc.cmp.msg;
                        return [3, 6];
                    case 1:
                        _a = sc.mode;
                        switch (_a) {
                            case scriptmode_enum.UNKNOWN: return [3, 2];
                            case scriptmode_enum.BINARY: return [3, 3];
                            case scriptmode_enum.TEXT: return [3, 4];
                        }
                        return [3, 6];
                    case 2: return [3, 6];
                    case 3:
                        binary_validate(sc);
                        return [3, 6];
                    case 4: return [4, text_validate(sc, true, false)];
                    case 5:
                        _b.sent();
                        return [3, 6];
                    case 6: return [2];
                }
            });
        });
    }
    function scr_loadfile(scr, file) {
        return __awaiter(this, void 0, void 0, function () {
            var sc, read;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        sc = scr;
                        if (sc.err)
                            sc.err = null;
                        return [4, fileres_read(sc, true, file, null, sfr_begin, sfr_end, sc)];
                    case 1:
                        read = _a.sent();
                        if (!read && sc.err === null)
                            sc.err = 'Error: Failed to read file: ' + file;
                        return [2, sc.err === null];
                }
            });
        });
    }
    exports.scr_loadfile = scr_loadfile;
    function scr_getfile(scr) {
        return scr.file;
    }
    exports.scr_getfile = scr_getfile;
    function scr_getcwd(scr) {
        return scr.curdir;
    }
    exports.scr_getcwd = scr_getcwd;
    var BSZ_HEADER = 28;
    var BSZ_STR_HEAD = 4;
    var BSZ_KEY = 8;
    var BSZ_DEBUG_HEAD = 4;
    var BSZ_POS = 16;
    var BSZ_CMD = 8;
    function scr_write(scr, bytes) {
        return __awaiter(this, void 0, void 0, function () {
            function GETINT(i) {
                return ((bs.buf.charCodeAt(i + 0)) +
                    (bs.buf.charCodeAt(i + 1) << 8) +
                    (bs.buf.charCodeAt(i + 2) << 16) +
                    ((bs.buf.charCodeAt(i + 3) << 23) * 2));
            }
            function WRITE() {
                if (bytes.length > bs.left) {
                    bs.buf += bytes.substr(0, bs.left);
                    bytes = bytes.substr(bs.left);
                    bs.left = 0;
                }
                else {
                    bs.buf += bytes;
                    bs.left -= bytes.length;
                    bytes = '';
                }
            }
            var sc, bs, prg, magic, key1, key2, key, p, p, i, is_eval, err, is_eval;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (bytes.length <= 0)
                            return [2, true];
                        sc = scr;
                        if (sc.capture_write !== null) {
                            sc.capture_write += bytes;
                            return [2, true];
                        }
                        if (sc.mode === scriptmode_enum.UNKNOWN) {
                            if (bytes.charCodeAt(0) === 0xFC) {
                                sc.mode = scriptmode_enum.BINARY;
                                sc.binstate.state = bis_enum.HEADER;
                                sc.binstate.left = BSZ_HEADER;
                                sc.binstate.buf = '';
                            }
                            else {
                                sc.mode = scriptmode_enum.TEXT;
                                sc.cmp = compiler_new(sc, sc.prg, sc.sinc, sc.inc, sc.file, sc.paths);
                            }
                        }
                        bs = sc.binstate;
                        prg = sc.prg;
                        if (!(sc.mode === scriptmode_enum.BINARY)) return [3, 1];
                        if (sc.err)
                            sc.err = null;
                        while (bytes.length > 0) {
                            switch (bs.state) {
                                case bis_enum.HEADER:
                                    WRITE();
                                    if (bs.left === 0) {
                                        magic = GETINT(0);
                                        bs.str_size = GETINT(4);
                                        bs.key_size = GETINT(8);
                                        bs.dbg_size = GETINT(12);
                                        bs.pos_size = GETINT(16);
                                        bs.cmd_size = GETINT(20);
                                        bs.ops_size = GETINT(24);
                                        if (magic !== 0x016B53FC) {
                                            sc.err = 'Error: Invalid binary header';
                                            return [2, false];
                                        }
                                        bs.state = bis_enum.STR_HEAD;
                                        bs.left = BSZ_STR_HEAD;
                                        bs.item = 0;
                                        bs.buf = '';
                                    }
                                    break;
                                case bis_enum.STR_HEAD:
                                    if (bs.item >= bs.str_size) {
                                        bs.state = bis_enum.KEY;
                                        bs.left = BSZ_KEY;
                                        bs.item = 0;
                                        break;
                                    }
                                    WRITE();
                                    if (bs.left === 0) {
                                        bs.state = bis_enum.STR_BODY;
                                        bs.left = GETINT(0);
                                        bs.buf = '';
                                    }
                                    break;
                                case bis_enum.STR_BODY:
                                    WRITE();
                                    if (bs.left === 0) {
                                        prg.strTable.push(bs.buf);
                                        bs.buf = '';
                                        bs.state = bis_enum.STR_HEAD;
                                        bs.left = BSZ_STR_HEAD;
                                        bs.item++;
                                    }
                                    break;
                                case bis_enum.KEY:
                                    if (bs.item >= bs.key_size) {
                                        bs.state = bis_enum.DEBUG_HEAD;
                                        bs.left = BSZ_DEBUG_HEAD;
                                        bs.item = 0;
                                        break;
                                    }
                                    WRITE();
                                    if (bs.left === 0) {
                                        key1 = GETINT(0);
                                        key2 = GETINT(4);
                                        key = [key1, key2];
                                        prg.keyTable.push(key);
                                        bs.item++;
                                        bs.left = BSZ_KEY;
                                        bs.buf = '';
                                    }
                                    break;
                                case bis_enum.DEBUG_HEAD:
                                    if (bs.item >= bs.dbg_size) {
                                        bs.state = bis_enum.POS;
                                        bs.left = BSZ_POS;
                                        bs.item = 0;
                                        break;
                                    }
                                    WRITE();
                                    if (bs.left === 0) {
                                        bs.state = bis_enum.DEBUG_BODY;
                                        bs.left = GETINT(0);
                                        bs.buf = '';
                                    }
                                    break;
                                case bis_enum.DEBUG_BODY:
                                    WRITE();
                                    if (bs.left === 0) {
                                        prg.debugTable.push(bs.buf);
                                        bs.buf = '';
                                        bs.state = bis_enum.DEBUG_HEAD;
                                        bs.left = BSZ_DEBUG_HEAD;
                                        bs.item++;
                                    }
                                    break;
                                case bis_enum.POS:
                                    if (bs.item >= bs.pos_size) {
                                        bs.state = bis_enum.CMD;
                                        bs.left = BSZ_CMD;
                                        bs.item = 0;
                                        break;
                                    }
                                    WRITE();
                                    if (bs.left === 0) {
                                        p = {
                                            pc: GETINT(0),
                                            flp: {
                                                line: GETINT(4),
                                                chr: GETINT(8),
                                                basefile: GETINT(12),
                                                fullfile: -1
                                            }
                                        };
                                        prg.posTable.push(p);
                                        bs.buf = '';
                                        bs.left = BSZ_POS;
                                        bs.item++;
                                        if (p.flp.basefile >= bs.dbg_size)
                                            p.flp.basefile = -1;
                                    }
                                    break;
                                case bis_enum.CMD:
                                    if (bs.item >= bs.cmd_size) {
                                        bs.state = bis_enum.OPS;
                                        bs.left = bs.ops_size + 1;
                                        break;
                                    }
                                    WRITE();
                                    if (bs.left === 0) {
                                        p = {
                                            pc: GETINT(0),
                                            cmdhint: GETINT(4)
                                        };
                                        prg.cmdTable.push(p);
                                        bs.buf = '';
                                        bs.left = BSZ_CMD;
                                        bs.item++;
                                        if (p.cmdhint >= bs.dbg_size)
                                            p.cmdhint = -1;
                                    }
                                    break;
                                case bis_enum.OPS:
                                    WRITE();
                                    if (bs.left === 0) {
                                        if (bs.buf.charCodeAt(bs.buf.length - 1) !== 0xFD) {
                                            sc.err = 'Error: Invalid binary file';
                                            return [2, false];
                                        }
                                        for (i = 0; i < bs.buf.length - 1; i++)
                                            prg.ops.push(bs.buf.charCodeAt(i));
                                        bs.buf = '';
                                        bs.state = bis_enum.DONE;
                                    }
                                    break;
                                case bis_enum.DONE:
                                    sc.err = 'Error: Invalid data at end of file';
                                    return [2, false];
                            }
                        }
                        is_eval = !sc.prg.repl && sc.file === null;
                        if (is_eval)
                            binary_validate(sc);
                        return [2, sc.err === null];
                    case 1:
                        if (sc.err)
                            sc.err = null;
                        return [4, compiler_write(sc.cmp, bytes)];
                    case 2:
                        err = _a.sent();
                        if (err)
                            sc.err = 'Error: ' + err;
                        is_eval = !sc.prg.repl && sc.file === null;
                        text_validate(sc, is_eval, true);
                        return [2, sc.err === null];
                }
            });
        });
    }
    exports.scr_write = scr_write;
    function scr_geterr(scr) {
        return scr.err;
    }
    exports.scr_geterr = scr_geterr;
    function scr_level(scr) {
        if (scr.mode !== scriptmode_enum.TEXT)
            return 0;
        return scr.cmp.pr.level;
    }
    exports.scr_level = scr_level;
    function scr_dump(scr, debug, user, f_dump) {
        var prg = scr.prg;
        var header = '' +
            String.fromCharCode(0xFC) +
            String.fromCharCode(0x53) +
            String.fromCharCode(0x6B) +
            String.fromCharCode(0x01) +
            String.fromCharCode((prg.strTable.length) & 0xFF) +
            String.fromCharCode((prg.strTable.length >> 8) & 0xFF) +
            String.fromCharCode((prg.strTable.length >> 16) & 0xFF) +
            String.fromCharCode((prg.strTable.length >> 24) & 0xFF) +
            String.fromCharCode((prg.keyTable.length) & 0xFF) +
            String.fromCharCode((prg.keyTable.length >> 8) & 0xFF) +
            String.fromCharCode((prg.keyTable.length >> 16) & 0xFF) +
            String.fromCharCode((prg.keyTable.length >> 24) & 0xFF) +
            String.fromCharCode(debug ? ((prg.debugTable.length) & 0xFF) : 0) +
            String.fromCharCode(debug ? ((prg.debugTable.length >> 8) & 0xFF) : 0) +
            String.fromCharCode(debug ? ((prg.debugTable.length >> 16) & 0xFF) : 0) +
            String.fromCharCode(debug ? ((prg.debugTable.length >> 24) & 0xFF) : 0) +
            String.fromCharCode(debug ? ((prg.posTable.length) & 0xFF) : 0) +
            String.fromCharCode(debug ? ((prg.posTable.length >> 8) & 0xFF) : 0) +
            String.fromCharCode(debug ? ((prg.posTable.length >> 16) & 0xFF) : 0) +
            String.fromCharCode(debug ? ((prg.posTable.length >> 24) & 0xFF) : 0) +
            String.fromCharCode(debug ? ((prg.cmdTable.length) & 0xFF) : 0) +
            String.fromCharCode(debug ? ((prg.cmdTable.length >> 8) & 0xFF) : 0) +
            String.fromCharCode(debug ? ((prg.cmdTable.length >> 16) & 0xFF) : 0) +
            String.fromCharCode(debug ? ((prg.cmdTable.length >> 24) & 0xFF) : 0) +
            String.fromCharCode((prg.ops.length) & 0xFF) +
            String.fromCharCode((prg.ops.length >> 8) & 0xFF) +
            String.fromCharCode((prg.ops.length >> 16) & 0xFF) +
            String.fromCharCode((prg.ops.length >> 24) & 0xFF);
        f_dump(header, user);
        for (var i = 0; i < prg.strTable.length; i++) {
            var str = prg.strTable[i];
            var sizeb = '' +
                String.fromCharCode((str.length) & 0xFF) +
                String.fromCharCode((str.length >> 8) & 0xFF) +
                String.fromCharCode((str.length >> 16) & 0xFF) +
                String.fromCharCode((str.length >> 24) & 0xFF);
            f_dump(sizeb, user);
            if (str.length > 0)
                f_dump(str, user);
        }
        for (var i = 0; i < prg.keyTable.length; i++) {
            var id = prg.keyTable[i];
            var idb = '' +
                String.fromCharCode((id[0]) & 0xFF) +
                String.fromCharCode((id[0] >> 8) & 0xFF) +
                String.fromCharCode((id[0] >> 16) & 0xFF) +
                String.fromCharCode((id[0] >> 24) & 0xFF) +
                String.fromCharCode((id[1]) & 0xFF) +
                String.fromCharCode((id[1] >> 8) & 0xFF) +
                String.fromCharCode((id[1] >> 16) & 0xFF) +
                String.fromCharCode((id[1] >> 24) & 0xFF);
            f_dump(idb, user);
        }
        if (debug) {
            for (var i = 0; i < prg.debugTable.length; i++) {
                var str = prg.debugTable[i];
                var slen = str === null ? 4 : str.length;
                var slenb = '' +
                    String.fromCharCode((slen) & 0xFF) +
                    String.fromCharCode((slen >> 8) & 0xFF) +
                    String.fromCharCode((slen >> 16) & 0xFF) +
                    String.fromCharCode((slen >> 24) & 0xFF);
                f_dump(slenb, user);
                if (str === null)
                    f_dump('eval', user);
                else if (slen > 0)
                    f_dump(str, user);
            }
            for (var i = 0; i < prg.posTable.length; i++) {
                var p = prg.posTable[i];
                var plcb = '' +
                    String.fromCharCode((p.pc) & 0xFF) +
                    String.fromCharCode((p.pc >> 8) & 0xFF) +
                    String.fromCharCode((p.pc >> 16) & 0xFF) +
                    String.fromCharCode((p.pc >> 24) & 0xFF) +
                    String.fromCharCode((p.flp.line) & 0xFF) +
                    String.fromCharCode((p.flp.line >> 8) & 0xFF) +
                    String.fromCharCode((p.flp.line >> 16) & 0xFF) +
                    String.fromCharCode((p.flp.line >> 24) & 0xFF) +
                    String.fromCharCode((p.flp.chr) & 0xFF) +
                    String.fromCharCode((p.flp.chr >> 8) & 0xFF) +
                    String.fromCharCode((p.flp.chr >> 16) & 0xFF) +
                    String.fromCharCode((p.flp.chr >> 24) & 0xFF) +
                    String.fromCharCode((p.flp.basefile) & 0xFF) +
                    String.fromCharCode((p.flp.basefile >> 8) & 0xFF) +
                    String.fromCharCode((p.flp.basefile >> 16) & 0xFF) +
                    String.fromCharCode((p.flp.basefile >> 24) & 0xFF);
                f_dump(plcb, user);
            }
            for (var i = 0; i < prg.cmdTable.length; i++) {
                var p = prg.cmdTable[i];
                var plcb = '' +
                    String.fromCharCode((p.pc) & 0xFF) +
                    String.fromCharCode((p.pc >> 8) & 0xFF) +
                    String.fromCharCode((p.pc >> 16) & 0xFF) +
                    String.fromCharCode((p.pc >> 24) & 0xFF) +
                    String.fromCharCode((p.cmdhint) & 0xFF) +
                    String.fromCharCode((p.cmdhint >> 8) & 0xFF) +
                    String.fromCharCode((p.cmdhint >> 16) & 0xFF) +
                    String.fromCharCode((p.cmdhint >> 24) & 0xFF);
                f_dump(plcb, user);
            }
        }
        if (prg.ops.length > 0) {
            var out = '';
            for (var i = 0; i < prg.ops.length; i++)
                out += String.fromCharCode(prg.ops[i]);
            f_dump(out, user);
        }
        f_dump(String.fromCharCode(0xFD), user);
    }
    exports.scr_dump = scr_dump;
    function ctx_new(scr, io) {
        return context_new(scr.prg, io);
    }
    exports.ctx_new = ctx_new;
    function ctx_getstatus(ctx) {
        var ctx2 = ctx;
        if (ctx2.passed)
            return status.PASSED;
        else if (ctx2.failed)
            return status.FAILED;
        else if (ctx2.async)
            return status.WAITING;
        return status.READY;
    }
    exports.ctx_getstatus = ctx_getstatus;
    function ctx_native(ctx, name, natuser, f_native) {
        context_native(ctx, native_hash(name), natuser, f_native);
    }
    exports.ctx_native = ctx_native;
    function ctx_nativehash(ctx, hash, natuser, f_native) {
        context_native(ctx, hash, natuser, f_native);
    }
    exports.ctx_nativehash = ctx_nativehash;
    function ctx_setuser(ctx, user) {
        ctx.user = user;
    }
    exports.ctx_setuser = ctx_setuser;
    function ctx_getuser(ctx) {
        return ctx.user;
    }
    exports.ctx_getuser = ctx_getuser;
    function ctx_addusertype(ctx, hint) {
        ctx.user_hint.push(hint);
        return ctx.user_hint.length - 1;
    }
    exports.ctx_addusertype = ctx_addusertype;
    function ctx_getuserhint(ctx, usertype) {
        return ctx.user_hint[usertype];
    }
    exports.ctx_getuserhint = ctx_getuserhint;
    function ctx_settimeout(ctx, timeout) {
        var ctx2 = ctx;
        ctx2.timeout = timeout;
        ctx2.timeout_left = timeout;
    }
    exports.ctx_settimeout = ctx_settimeout;
    function ctx_gettimeout(ctx) {
        return ctx.timeout;
    }
    exports.ctx_gettimeout = ctx_gettimeout;
    function ctx_consumeticks(ctx, amount) {
        var ctx2 = ctx;
        if (amount > ctx2.timeout_left)
            amount = ctx2.timeout_left;
        if (amount < -ctx2.timeout)
            amount = -ctx2.timeout;
        ctx2.timeout_left -= amount;
        if (ctx2.timeout_left > ctx2.timeout)
            ctx2.timeout_left = ctx2.timeout;
    }
    exports.ctx_consumeticks = ctx_consumeticks;
    function ctx_forcetimeout(ctx) {
        ctx.timeout_left = 0;
    }
    exports.ctx_forcetimeout = ctx_forcetimeout;
    function ctx_run(ctx) {
        return __awaiter(this, void 0, void 0, function () {
            var ctx2;
            return __generator(this, function (_a) {
                ctx2 = ctx;
                if (ctx2.prg.repl && ctx2.err)
                    ctx2.err = null;
                return [2, context_run(ctx2)];
            });
        });
    }
    exports.ctx_run = ctx_run;
    function ctx_geterr(ctx) {
        return ctx.err;
    }
    exports.ctx_geterr = ctx_geterr;
    function arg_bool(args, index) {
        if (index < 0 || index >= args.length)
            return false;
        return istrue(args[index]);
    }
    exports.arg_bool = arg_bool;
    function arg_num(ctx, args, index) {
        if (index < 0 || index >= args.length)
            return 0;
        var a = args[index];
        if (isnum(a))
            return a;
        throw new Error('Expecting number for argument ' + (index + 1));
    }
    exports.arg_num = arg_num;
    function arg_str(ctx, args, index) {
        if (index < 0 || index >= args.length || !isstr(args[index]))
            throw new Error('Expecting string for argument ' + (index + 1));
        return args[index];
    }
    exports.arg_str = arg_str;
    function arg_list(ctx, args, index) {
        if (index < 0 || index >= args.length || !islist(args[index]))
            throw new Error('Expecting list for argument ' + (index + 1));
        return args[index];
    }
    exports.arg_list = arg_list;
    function arg_user(ctx, args, index, usertype) {
        var ctx2 = ctx;
        var hint = ctx2.user_hint[usertype];
        var err = 'Expecting user type ' + hint + ' for argument ' + (index + 1);
        if (index < 0 || index >= args.length)
            throw new Error(err);
        var ls = args[index];
        if (!islist(ls) || !list_hasuser(ctx, ls, usertype))
            throw new Error(err);
        try {
            return list_getuser(ctx, ls);
        }
        catch (e) {
            throw new Error(err);
        }
    }
    exports.arg_user = arg_user;
    function sinkhelp_tostr(li, v) {
        if (v === null)
            return 'nil';
        else if (typeof v === 'number') {
            if (v === Infinity)
                return 'inf';
            else if (v === -Infinity)
                return '-inf';
            return numtostr(v);
        }
        else if (typeof v === 'string')
            return '\'' + v.replace(/'/g, '\'\'') + '\'';
        else {
            if (li.indexOf(v) >= 0)
                return '{circular}';
            var ret = '';
            li.push(v);
            for (var i = 0; i < v.length; i++)
                ret += (i === 0 ? '' : ', ') + sinkhelp_tostr(li, v[i]);
            li.pop();
            return '{' + ret + '}';
        }
    }
    function tostr(v) {
        if (isstr(v))
            return v;
        return sinkhelp_tostr([], v);
    }
    exports.tostr = tostr;
    function exit(ctx, vals) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                if (vals.length > 0)
                    say(ctx, vals);
                opi_exit(ctx);
                return [2];
            });
        });
    }
    exports.exit = exit;
    function abort(ctx, vals) {
        var bytes = null;
        if (vals.length > 0)
            bytes = list_joinplain(vals, ' ');
        opi_abort(ctx, bytes);
    }
    exports.abort = abort;
    function abortstr(ctx, str) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                opi_abort(ctx, str);
                return [2, Promise.resolve(exports.NIL)];
            });
        });
    }
    exports.abortstr = abortstr;
    function num_neg(ctx, a) {
        return opi_unop(ctx, a, unop_num_neg, txt_num_neg);
    }
    exports.num_neg = num_neg;
    function num_add(ctx, a, b) {
        return opi_binop(ctx, a, b, binop_num_add, txt_num_add, LT_ALLOWNUM, LT_ALLOWNUM);
    }
    exports.num_add = num_add;
    function num_sub(ctx, a, b) {
        return opi_binop(ctx, a, b, binop_num_sub, txt_num_sub, LT_ALLOWNUM, LT_ALLOWNUM);
    }
    exports.num_sub = num_sub;
    function num_mul(ctx, a, b) {
        return opi_binop(ctx, a, b, binop_num_mul, txt_num_mul, LT_ALLOWNUM, LT_ALLOWNUM);
    }
    exports.num_mul = num_mul;
    function num_div(ctx, a, b) {
        return opi_binop(ctx, a, b, binop_num_div, txt_num_div, LT_ALLOWNUM, LT_ALLOWNUM);
    }
    exports.num_div = num_div;
    function num_mod(ctx, a, b) {
        return opi_binop(ctx, a, b, binop_num_mod, txt_num_mod, LT_ALLOWNUM, LT_ALLOWNUM);
    }
    exports.num_mod = num_mod;
    function num_pow(ctx, a, b) {
        return opi_binop(ctx, a, b, binop_num_pow, txt_num_pow, LT_ALLOWNUM, LT_ALLOWNUM);
    }
    exports.num_pow = num_pow;
    function num_abs(ctx, a) {
        return opi_unop(ctx, a, unop_num_abs, txt_num_abs);
    }
    exports.num_abs = num_abs;
    function num_sign(ctx, a) {
        return opi_unop(ctx, a, unop_num_sign, txt_num_sign);
    }
    exports.num_sign = num_sign;
    function num_max(ctx, vals) {
        return opi_num_max(vals);
    }
    exports.num_max = num_max;
    function num_min(ctx, vals) {
        return opi_num_min(vals);
    }
    exports.num_min = num_min;
    function num_clamp(ctx, a, b, c) {
        return opi_triop(ctx, a, b, c, triop_num_clamp, txt_num_clamp);
    }
    exports.num_clamp = num_clamp;
    function num_floor(ctx, a) {
        return opi_unop(ctx, a, unop_num_floor, txt_num_floor);
    }
    exports.num_floor = num_floor;
    function num_ceil(ctx, a) {
        return opi_unop(ctx, a, unop_num_ceil, txt_num_ceil);
    }
    exports.num_ceil = num_ceil;
    function num_round(ctx, a) {
        return opi_unop(ctx, a, unop_num_round, txt_num_round);
    }
    exports.num_round = num_round;
    function num_trunc(ctx, a) {
        return opi_unop(ctx, a, unop_num_trunc, txt_num_trunc);
    }
    exports.num_trunc = num_trunc;
    function num_sin(ctx, a) {
        return opi_unop(ctx, a, unop_num_sin, txt_num_sin);
    }
    exports.num_sin = num_sin;
    function num_cos(ctx, a) {
        return opi_unop(ctx, a, unop_num_cos, txt_num_cos);
    }
    exports.num_cos = num_cos;
    function num_tan(ctx, a) {
        return opi_unop(ctx, a, unop_num_tan, txt_num_tan);
    }
    exports.num_tan = num_tan;
    function num_asin(ctx, a) {
        return opi_unop(ctx, a, unop_num_asin, txt_num_asin);
    }
    exports.num_asin = num_asin;
    function num_acos(ctx, a) {
        return opi_unop(ctx, a, unop_num_acos, txt_num_acos);
    }
    exports.num_acos = num_acos;
    function num_atan(ctx, a) {
        return opi_unop(ctx, a, unop_num_atan, txt_num_atan);
    }
    exports.num_atan = num_atan;
    function num_atan2(ctx, a, b) {
        return opi_binop(ctx, a, b, binop_num_atan2, txt_num_atan, LT_ALLOWNUM, LT_ALLOWNUM);
    }
    exports.num_atan2 = num_atan2;
    function num_log(ctx, a) {
        return opi_unop(ctx, a, unop_num_log, txt_num_log);
    }
    exports.num_log = num_log;
    function num_log2(ctx, a) {
        return opi_unop(ctx, a, unop_num_log2, txt_num_log);
    }
    exports.num_log2 = num_log2;
    function num_log10(ctx, a) {
        return opi_unop(ctx, a, unop_num_log10, txt_num_log);
    }
    exports.num_log10 = num_log10;
    function num_exp(ctx, a) {
        return opi_unop(ctx, a, unop_num_exp, txt_num_pow);
    }
    exports.num_exp = num_exp;
    function num_lerp(ctx, a, b, t) {
        return opi_triop(ctx, a, b, t, triop_num_lerp, txt_num_lerp);
    }
    exports.num_lerp = num_lerp;
    function num_hex(ctx, a, b) {
        return opi_binop(ctx, a, b, binop_num_hex, txt_num_hex, LT_ALLOWNUM, LT_ALLOWNUM | LT_ALLOWNIL);
    }
    exports.num_hex = num_hex;
    function num_oct(ctx, a, b) {
        return opi_binop(ctx, a, b, binop_num_oct, txt_num_oct, LT_ALLOWNUM, LT_ALLOWNUM | LT_ALLOWNIL);
    }
    exports.num_oct = num_oct;
    function num_bin(ctx, a, b) {
        return opi_binop(ctx, a, b, binop_num_bin, txt_num_bin, LT_ALLOWNUM, LT_ALLOWNUM | LT_ALLOWNIL);
    }
    exports.num_bin = num_bin;
    function int_new(ctx, a) {
        return opi_unop(ctx, a, unop_int_new, txt_int_new);
    }
    exports.int_new = int_new;
    function int_not(ctx, a) {
        return opi_unop(ctx, a, unop_int_not, txt_int_not);
    }
    exports.int_not = int_not;
    function int_and(ctx, vals) {
        return opi_combop(ctx, vals, binop_int_and, txt_int_and);
    }
    exports.int_and = int_and;
    function int_or(ctx, vals) {
        return opi_combop(ctx, vals, binop_int_or, txt_int_or);
    }
    exports.int_or = int_or;
    function int_xor(ctx, vals) {
        return opi_combop(ctx, vals, binop_int_xor, txt_int_xor);
    }
    exports.int_xor = int_xor;
    function int_shl(ctx, a, b) {
        return opi_binop(ctx, a, b, binop_int_shl, txt_int_shl, LT_ALLOWNUM, LT_ALLOWNUM);
    }
    exports.int_shl = int_shl;
    function int_shr(ctx, a, b) {
        return opi_binop(ctx, a, b, binop_int_shr, txt_int_shr, LT_ALLOWNUM, LT_ALLOWNUM);
    }
    exports.int_shr = int_shr;
    function int_sar(ctx, a, b) {
        return opi_binop(ctx, a, b, binop_int_sar, txt_int_shr, LT_ALLOWNUM, LT_ALLOWNUM);
    }
    exports.int_sar = int_sar;
    function int_add(ctx, a, b) {
        return opi_binop(ctx, a, b, binop_int_add, txt_num_add, LT_ALLOWNUM, LT_ALLOWNUM);
    }
    exports.int_add = int_add;
    function int_sub(ctx, a, b) {
        return opi_binop(ctx, a, b, binop_int_sub, txt_num_sub, LT_ALLOWNUM, LT_ALLOWNUM);
    }
    exports.int_sub = int_sub;
    function int_mul(ctx, a, b) {
        return opi_binop(ctx, a, b, binop_int_mul, txt_num_mul, LT_ALLOWNUM, LT_ALLOWNUM);
    }
    exports.int_mul = int_mul;
    function int_div(ctx, a, b) {
        return opi_binop(ctx, a, b, binop_int_div, txt_num_div, LT_ALLOWNUM, LT_ALLOWNUM);
    }
    exports.int_div = int_div;
    function int_mod(ctx, a, b) {
        return opi_binop(ctx, a, b, binop_int_mod, txt_num_mod, LT_ALLOWNUM, LT_ALLOWNUM);
    }
    exports.int_mod = int_mod;
    function int_clz(ctx, a) {
        return opi_unop(ctx, a, unop_int_clz, txt_int_clz);
    }
    exports.int_clz = int_clz;
    function int_pop(ctx, a) {
        return opi_unop(ctx, a, unop_int_pop, txt_int_pop);
    }
    exports.int_pop = int_pop;
    function int_bswap(ctx, a) {
        return opi_unop(ctx, a, unop_int_bswap, txt_int_bswap);
    }
    exports.int_bswap = int_bswap;
    function str_hashplain(bytes, seed) {
        function x64_add(a, b) {
            var A0 = a[0] & 0xFFFF;
            var A1 = a[0] >>> 16;
            var A2 = a[1] & 0xFFFF;
            var A3 = a[1] >>> 16;
            var B0 = b[0] & 0xFFFF;
            var B1 = b[0] >>> 16;
            var B2 = b[1] & 0xFFFF;
            var B3 = b[1] >>> 16;
            var R0 = A0 + B0;
            var R1 = A1 + B1 + (R0 >> 16);
            var R2 = A2 + B2 + (R1 >> 16);
            var R3 = A3 + B3 + (R2 >> 16);
            return [(R0 & 0xFFFF) | ((R1 & 0xFFFF) << 16), (R2 & 0xFFFF) | ((R3 & 0xFFFF) << 16)];
        }
        function x64_mul(a, b) {
            var A0 = a[0] & 0xFFFF;
            var A1 = a[0] >>> 16;
            var A2 = a[1] & 0xFFFF;
            var A3 = a[1] >>> 16;
            var B0 = b[0] & 0xFFFF;
            var B1 = b[0] >>> 16;
            var B2 = b[1] & 0xFFFF;
            var B3 = b[1] >>> 16;
            var T;
            var R0, R1, R2, R3;
            T = A0 * B0;
            R0 = T & 0xFFFF;
            T = A1 * B0 + (T >>> 16);
            R1 = T & 0xFFFF;
            T = A2 * B0 + (T >>> 16);
            R2 = T & 0xFFFF;
            T = A3 * B0 + (T >>> 16);
            R3 = T & 0xFFFF;
            T = A0 * B1;
            R1 += T & 0xFFFF;
            T = A1 * B1 + (T >>> 16);
            R2 += T & 0xFFFF;
            T = A2 * B1 + (T >>> 16);
            R3 += T & 0xFFFF;
            T = A0 * B2;
            R2 += T & 0xFFFF;
            T = A1 * B2 + (T >>> 16);
            R3 += T & 0xFFFF;
            T = A0 * B3;
            R3 += T & 0xFFFF;
            R1 += R0 >>> 16;
            R2 += R1 >>> 16;
            R3 += R2 >>> 16;
            return [(R0 & 0xFFFF) | ((R1 & 0xFFFF) << 16), (R2 & 0xFFFF) | ((R3 & 0xFFFF) << 16)];
        }
        function x64_rotl(a, b) {
            b %= 64;
            if (b == 0)
                return a;
            else if (b == 32)
                return [a[1], a[0]];
            else if (b < 32)
                return [(a[0] << b) | (a[1] >>> (32 - b)), (a[1] << b) | (a[0] >>> (32 - b))];
            b -= 32;
            return [(a[1] << b) | (a[0] >>> (32 - b)), (a[0] << b) | (a[1] >>> (32 - b))];
        }
        function x64_shl(a, b) {
            if (b <= 0)
                return a;
            else if (b >= 64)
                return [0, 0];
            else if (b >= 32)
                return [0, a[0] << (b - 32)];
            return [a[0] << b, (a[1] << b) | (a[0] >>> (32 - b))];
        }
        function x64_shr(a, b) {
            if (b <= 0)
                return a;
            else if (b >= 64)
                return [0, 0];
            else if (b >= 32)
                return [a[1] >>> (b - 32), 0];
            return [(a[0] >>> b) | (a[1] << (32 - b)), a[1] >>> b];
        }
        function x64_xor(a, b) {
            return [a[0] ^ b[0], a[1] ^ b[1]];
        }
        function x64_fmix(a) {
            a = x64_xor(a, x64_shr(a, 33));
            a = x64_mul(a, [0xED558CCD, 0xFF51AFD7]);
            a = x64_xor(a, x64_shr(a, 33));
            a = x64_mul(a, [0x1A85EC53, 0xC4CEB9FE]);
            a = x64_xor(a, x64_shr(a, 33));
            return a;
        }
        function getblock(i) {
            return [
                (bytes.charCodeAt(i + 0)) |
                    (bytes.charCodeAt(i + 1) << 8) |
                    (bytes.charCodeAt(i + 2) << 16) |
                    (bytes.charCodeAt(i + 3) << 24),
                (bytes.charCodeAt(i + 4)) |
                    (bytes.charCodeAt(i + 5) << 8) |
                    (bytes.charCodeAt(i + 6) << 16) |
                    (bytes.charCodeAt(i + 7) << 24)
            ];
        }
        var nblocks = bytes.length >>> 4;
        var h1 = [seed, 0];
        var h2 = [seed, 0];
        var c1 = [0x114253D5, 0x87C37B91];
        var c2 = [0x2745937F, 0x4CF5AD43];
        for (var i = 0; i < nblocks; i++) {
            var k1_1 = getblock((i * 2 + 0) * 8);
            var k2_1 = getblock((i * 2 + 1) * 8);
            k1_1 = x64_mul(k1_1, c1);
            k1_1 = x64_rotl(k1_1, 31);
            k1_1 = x64_mul(k1_1, c2);
            h1 = x64_xor(h1, k1_1);
            h1 = x64_rotl(h1, 27);
            h1 = x64_add(h1, h2);
            h1 = x64_add(x64_mul(h1, [5, 0]), [0x52DCE729, 0]);
            k2_1 = x64_mul(k2_1, c2);
            k2_1 = x64_rotl(k2_1, 33);
            k2_1 = x64_mul(k2_1, c1);
            h2 = x64_xor(h2, k2_1);
            h2 = x64_rotl(h2, 31);
            h2 = x64_add(h2, h1);
            h2 = x64_add(x64_mul(h2, [5, 0]), [0x38495AB5, 0]);
        }
        var k1 = [0, 0];
        var k2 = [0, 0];
        var tail = bytes.substr(nblocks << 4);
        switch (tail.length) {
            case 15: k2 = x64_xor(k2, x64_shl([tail.charCodeAt(14), 0], 48));
            case 14: k2 = x64_xor(k2, x64_shl([tail.charCodeAt(13), 0], 40));
            case 13: k2 = x64_xor(k2, x64_shl([tail.charCodeAt(12), 0], 32));
            case 12: k2 = x64_xor(k2, x64_shl([tail.charCodeAt(11), 0], 24));
            case 11: k2 = x64_xor(k2, x64_shl([tail.charCodeAt(10), 0], 16));
            case 10: k2 = x64_xor(k2, x64_shl([tail.charCodeAt(9), 0], 8));
            case 9:
                k2 = x64_xor(k2, [tail.charCodeAt(8), 0]);
                k2 = x64_mul(k2, c2);
                k2 = x64_rotl(k2, 33);
                k2 = x64_mul(k2, c1);
                h2 = x64_xor(h2, k2);
            case 8: k1 = x64_xor(k1, x64_shl([tail.charCodeAt(7), 0], 56));
            case 7: k1 = x64_xor(k1, x64_shl([tail.charCodeAt(6), 0], 48));
            case 6: k1 = x64_xor(k1, x64_shl([tail.charCodeAt(5), 0], 40));
            case 5: k1 = x64_xor(k1, x64_shl([tail.charCodeAt(4), 0], 32));
            case 4: k1 = x64_xor(k1, x64_shl([tail.charCodeAt(3), 0], 24));
            case 3: k1 = x64_xor(k1, x64_shl([tail.charCodeAt(2), 0], 16));
            case 2: k1 = x64_xor(k1, x64_shl([tail.charCodeAt(1), 0], 8));
            case 1:
                k1 = x64_xor(k1, [tail.charCodeAt(0), 0]);
                k1 = x64_mul(k1, c1);
                k1 = x64_rotl(k1, 31);
                k1 = x64_mul(k1, c2);
                h1 = x64_xor(h1, k1);
        }
        h1 = x64_xor(h1, [bytes.length, 0]);
        h2 = x64_xor(h2, [bytes.length, 0]);
        h1 = x64_add(h1, h2);
        h2 = x64_add(h2, h1);
        h1 = x64_fmix(h1);
        h2 = x64_fmix(h2);
        h1 = x64_add(h1, h2);
        h2 = x64_add(h2, h1);
        function uns(n) {
            return (n < 0 ? 4294967296 : 0) + n;
        }
        return [uns(h1[0]), uns(h1[1]), uns(h2[0]), uns(h2[1])];
    }
    exports.str_hashplain = str_hashplain;
    function list_setuser(ctx, ls, usertype, user) {
        if (!islist(ls))
            throw new Error('Expecting list for sink.list_setuser');
        ls.usertype = usertype;
        ls.user = user;
    }
    exports.list_setuser = list_setuser;
    function list_hasuser(ctx, ls, usertype) {
        return islist(ls) && ls.usertype === usertype;
    }
    exports.list_hasuser = list_hasuser;
    function list_getuser(ctx, ls) {
        return islist(ls) ? ls.user : null;
    }
    exports.list_getuser = list_getuser;
    function list_cat(ctx, vals) {
        for (var i = 0; i < vals.length; i++) {
            if (!islist(vals[i])) {
                opi_abort(ctx, 'Cannot concatenate non-lists');
                return exports.NIL;
            }
        }
        return opi_list_cat(ctx, vals);
    }
    exports.list_cat = list_cat;
    function list_joinplain(vals, sep) {
        var out = '';
        for (var i = 0; i < vals.length; i++)
            out += (i > 0 ? sep : '') + tostr(vals[i]);
        return out;
    }
    exports.list_joinplain = list_joinplain;
    function gc_getlevel(ctx) {
        return ctx.gc_level;
    }
    exports.gc_getlevel = gc_getlevel;
    function gc_setlevel(ctx, level) {
        ctx.gc_level = level;
    }
    exports.gc_setlevel = gc_setlevel;
});
