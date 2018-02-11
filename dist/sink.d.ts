export declare enum type {
    NIL = 0,
    NUM = 1,
    STR = 2,
    LIST = 3,
}
export declare type str = string;
export declare type strnil = string | null;
export declare type valtrue = number | str | list;
export declare type val = null | valtrue;
export declare type user = number;
export declare class list extends Array<val> {
    usertype: user;
    user: any;
    constructor(...args: val[]);
}
export declare type u64 = [number, number];
export declare type ctx = any;
export declare type scr = any;
export declare enum fstype {
    NONE = 0,
    FILE = 1,
    DIR = 2,
}
export declare enum gc_level {
    NONE = 0,
    DEFAULT = 1,
    LOWMEM = 2,
}
export declare enum run {
    PASS = 0,
    FAIL = 1,
    ASYNC = 2,
    TIMEOUT = 3,
    REPLMORE = 4,
}
export declare enum status {
    READY = 0,
    WAITING = 1,
    PASSED = 2,
    FAILED = 3,
}
export declare type fsread_f = (scr: scr, file: string, incuser: any) => Promise<boolean>;
export declare type fstype_f = (scr: scr, file: string, incuser: any) => Promise<fstype>;
export declare type io_f = (ctx: ctx, str: str, iouser: any) => Promise<val>;
export declare type native_f = (ctx: ctx, args: val[], natuser: any) => Promise<val>;
export declare type dump_f = (data: string, dumpuser: any) => void;
export interface io_st {
    f_say?: io_f;
    f_warn?: io_f;
    f_ask?: io_f;
    user?: any;
}
export interface inc_st {
    f_fstype: fstype_f;
    f_fsread: fsread_f;
    user?: any;
}
export declare const NIL: null;
export declare function bool(f: boolean): val;
export declare function istrue(v: val): v is valtrue;
export declare function isfalse(v: val): v is null;
export declare function isnil(v: val): v is null;
export declare function isstr(v: val): v is str;
export declare function islist(v: val): v is list;
export declare function isnum(v: val): v is number;
export declare function sink_typeof(v: val): type;
export declare function num_nan(): val;
export declare function num_inf(): val;
export declare function num_isnan(v: val): boolean;
export declare function num_isfinite(v: val): boolean;
export declare function num_e(): number;
export declare function num_pi(): number;
export declare function num_tau(): number;
export declare function user_new(ctx: ctx, usertype: user, user: any): val;
export declare let seedauto_src: () => number;
export declare function scr_setuser(scr: scr, user: any): void;
export declare function scr_getuser(scr: scr): any;
export declare function rand_seedauto(ctx: ctx): void;
export declare function rand_seed(ctx: ctx, n: number): void;
export declare function rand_int(ctx: ctx): number;
export declare function rand_num(ctx: ctx): number;
export declare function rand_getstate(ctx: ctx): list;
export declare function rand_setstate(ctx: ctx, a: val): void;
export declare function rand_pick(ctx: ctx, a: val): val;
export declare function rand_shuffle(ctx: ctx, a: val): void;
export declare function str_new(ctx: ctx, vals: val[]): val;
export declare function str_split(ctx: ctx, a: val, b: val): val;
export declare function str_replace(ctx: ctx, a: val, b: val, c: val): val;
export declare function str_find(ctx: ctx, a: val, b: val, c: val): val;
export declare function str_rfind(ctx: ctx, a: val, b: val, c: val): val;
export declare function str_begins(ctx: ctx, a: val, b: val): boolean;
export declare function str_ends(ctx: ctx, a: val, b: val): boolean;
export declare function str_pad(ctx: ctx, a: val, b: number): val;
export declare function str_lower(ctx: ctx, a: val): val;
export declare function str_upper(ctx: ctx, a: val): val;
export declare function str_trim(ctx: ctx, a: val): val;
export declare function str_rev(ctx: ctx, a: val): val;
export declare function str_rep(ctx: ctx, a: val, rep: number): val;
export declare function str_list(ctx: ctx, a: val): val;
export declare function str_byte(ctx: ctx, a: val, b: number): val;
export declare function str_hash(ctx: ctx, a: val, seed: number): val;
export declare function utf8_valid(ctx: ctx, a: val): boolean;
export declare function utf8_list(ctx: ctx, a: val): val;
export declare function utf8_str(ctx: ctx, a: val): val;
export declare function struct_size(ctx: ctx, a: val): val;
export declare function struct_str(ctx: ctx, a: val, b: val): val;
export declare function struct_list(ctx: ctx, a: val, b: val): val;
export declare function struct_isLE(): boolean;
export declare function size(ctx: ctx, a: val): number;
export declare function tonum(ctx: ctx, a: val): val;
export declare function say(ctx: ctx, vals: val[]): Promise<val>;
export declare function warn(ctx: ctx, vals: val[]): Promise<val>;
export declare function ask(ctx: ctx, vals: val[]): Promise<val>;
export declare function stacktrace(ctx: ctx): val;
export declare function str_cat(ctx: ctx, vals: val[]): val;
export declare function str_slice(ctx: ctx, a: val, b: val, c: val): val;
export declare function str_splice(ctx: ctx, a: val, b: val, c: val, d: val): val;
export declare function list_new(ctx: ctx, a: val, b: val): val;
export declare function list_slice(ctx: ctx, a: val, b: val, c: val): val;
export declare function list_splice(ctx: ctx, a: val, b: val, c: val, d: val): void;
export declare function list_shift(ctx: ctx, a: val): val;
export declare function list_pop(ctx: ctx, a: val): val;
export declare function list_push(ctx: ctx, a: val, b: val): val;
export declare function list_unshift(ctx: ctx, a: val, b: val): val;
export declare function list_append(ctx: ctx, a: val, b: val): val;
export declare function list_prepend(ctx: ctx, a: val, b: val): val;
export declare function list_find(ctx: ctx, a: val, b: val, c: val): val;
export declare function list_rfind(ctx: ctx, a: val, b: val, c: val): val;
export declare function list_join(ctx: ctx, a: val, b: val): val;
export declare function list_rev(ctx: ctx, a: val): val;
export declare function list_str(ctx: ctx, a: val): val;
export declare function list_sort(ctx: ctx, a: val): void;
export declare function list_rsort(ctx: ctx, a: val): void;
export declare function order(ctx: ctx, a: val, b: val): number;
export declare function range(ctx: ctx, start: number, stop: number, step: number): val;
export declare function pickle_json(ctx: ctx, a: val): val;
export declare function pickle_binstr(a: val): string;
export declare function pickle_bin(ctx: ctx, a: val): val;
export declare function pickle_valstr(s: str): val | false;
export declare function pickle_val(ctx: ctx, a: val): val;
export declare function pickle_valid(ctx: ctx, a: val): number;
export declare function pickle_sibling(ctx: ctx, a: val): boolean;
export declare function pickle_circular(ctx: ctx, a: val): boolean;
export declare function pickle_copy(ctx: ctx, a: val): val;
export declare function scr_new(inc: inc_st, curdir: strnil, posix: boolean, repl: boolean): scr;
export declare function scr_addpath(scr: scr, path: string): void;
export declare function scr_incbody(scr: scr, name: string, body: string): void;
export declare function scr_incfile(scr: scr, name: string, file: string): void;
export declare function scr_loadfile(scr: scr, file: string): Promise<boolean>;
export declare function scr_getfile(scr: scr): strnil;
export declare function scr_getcwd(scr: scr): strnil;
export declare function scr_write(scr: scr, bytes: string): Promise<boolean>;
export declare function scr_geterr(scr: scr): strnil;
export declare function scr_level(scr: scr): number;
export declare function scr_dump(scr: scr, debug: boolean, user: any, f_dump: dump_f): void;
export declare function ctx_new(scr: scr, io: io_st): ctx;
export declare function ctx_getstatus(ctx: ctx): status;
export declare function ctx_native(ctx: ctx, name: string, natuser: any, f_native: native_f): void;
export declare function ctx_nativehash(ctx: ctx, hash: u64, natuser: any, f_native: native_f): void;
export declare function ctx_setuser(ctx: ctx, user: any): void;
export declare function ctx_getuser(ctx: ctx): any;
export declare function ctx_addusertype(ctx: ctx, hint: string): user;
export declare function ctx_getuserhint(ctx: ctx, usertype: user): string;
export declare function ctx_settimeout(ctx: ctx, timeout: number): void;
export declare function ctx_gettimeout(ctx: ctx): number;
export declare function ctx_consumeticks(ctx: ctx, amount: number): void;
export declare function ctx_forcetimeout(ctx: ctx): void;
export declare function ctx_run(ctx: ctx): Promise<run>;
export declare function ctx_geterr(ctx: ctx): strnil;
export declare function arg_bool(args: val[], index: number): boolean;
export declare function arg_num(ctx: ctx, args: val[], index: number): number;
export declare function arg_str(ctx: ctx, args: val[], index: number): string;
export declare function arg_list(ctx: ctx, args: val[], index: number): list;
export declare function arg_user(ctx: ctx, args: val[], index: number, usertype: user): any;
export declare function tostr(v: val): str;
export declare function exit(ctx: ctx, vals: val[]): Promise<void>;
export declare function abort(ctx: ctx, vals: val[]): void;
export declare function abortstr(ctx: ctx, str: string): Promise<val>;
export declare function num_neg(ctx: ctx, a: val): val;
export declare function num_add(ctx: ctx, a: val, b: val): val;
export declare function num_sub(ctx: ctx, a: val, b: val): val;
export declare function num_mul(ctx: ctx, a: val, b: val): val;
export declare function num_div(ctx: ctx, a: val, b: val): val;
export declare function num_mod(ctx: ctx, a: val, b: val): val;
export declare function num_pow(ctx: ctx, a: val, b: val): val;
export declare function num_abs(ctx: ctx, a: val): val;
export declare function num_sign(ctx: ctx, a: val): val;
export declare function num_max(ctx: ctx, vals: val[]): val;
export declare function num_min(ctx: ctx, vals: val[]): val;
export declare function num_clamp(ctx: ctx, a: val, b: val, c: val): val;
export declare function num_floor(ctx: ctx, a: val): val;
export declare function num_ceil(ctx: ctx, a: val): val;
export declare function num_round(ctx: ctx, a: val): val;
export declare function num_trunc(ctx: ctx, a: val): val;
export declare function num_sin(ctx: ctx, a: val): val;
export declare function num_cos(ctx: ctx, a: val): val;
export declare function num_tan(ctx: ctx, a: val): val;
export declare function num_asin(ctx: ctx, a: val): val;
export declare function num_acos(ctx: ctx, a: val): val;
export declare function num_atan(ctx: ctx, a: val): val;
export declare function num_atan2(ctx: ctx, a: val, b: val): val;
export declare function num_log(ctx: ctx, a: val): val;
export declare function num_log2(ctx: ctx, a: val): val;
export declare function num_log10(ctx: ctx, a: val): val;
export declare function num_exp(ctx: ctx, a: val): val;
export declare function num_lerp(ctx: ctx, a: val, b: val, t: val): val;
export declare function num_hex(ctx: ctx, a: val, b: val): val;
export declare function num_oct(ctx: ctx, a: val, b: val): val;
export declare function num_bin(ctx: ctx, a: val, b: val): val;
export declare function int_new(ctx: ctx, a: val): val;
export declare function int_not(ctx: ctx, a: val): val;
export declare function int_and(ctx: ctx, vals: val[]): val;
export declare function int_or(ctx: ctx, vals: val[]): val;
export declare function int_xor(ctx: ctx, vals: val[]): val;
export declare function int_shl(ctx: ctx, a: val, b: val): val;
export declare function int_shr(ctx: ctx, a: val, b: val): val;
export declare function int_sar(ctx: ctx, a: val, b: val): val;
export declare function int_add(ctx: ctx, a: val, b: val): val;
export declare function int_sub(ctx: ctx, a: val, b: val): val;
export declare function int_mul(ctx: ctx, a: val, b: val): val;
export declare function int_div(ctx: ctx, a: val, b: val): val;
export declare function int_mod(ctx: ctx, a: val, b: val): val;
export declare function int_clz(ctx: ctx, a: val): val;
export declare function int_pop(ctx: ctx, a: val): val;
export declare function int_bswap(ctx: ctx, a: val): val;
export declare function str_hashplain(bytes: string, seed: number): [number, number, number, number];
export declare function list_setuser(ctx: ctx, ls: val, usertype: user, user: any): void;
export declare function list_hasuser(ctx: ctx, ls: val, usertype: user): boolean;
export declare function list_getuser(ctx: ctx, ls: val): any;
export declare function list_cat(ctx: ctx, vals: val[]): val;
export declare function list_joinplain(vals: list | val[], sep: string): val;
export declare function gc_getlevel(ctx: ctx): gc_level;
export declare function gc_setlevel(ctx: ctx, level: gc_level): void;
