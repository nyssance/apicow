import { readLegacyDatabase } from './snippets/yaak-wasm-e5f190fc62de03e7/src/migrate-storage.js';


/**
 * @param {string} id
 */
export function blob_delete(id) {
    const ptr0 = passStringToWasm0(id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.blob_delete(ptr0, len0);
    if (ret[1]) {
        throw takeFromExternrefTable0(ret[0]);
    }
}

/**
 * The bytes stored under an id, or none. Ids are the desktop's: a response's
 * own id for its body, `{responseId}.request` for the request that produced
 * it. Bytes cross to JS as a `Uint8Array` rather than through JSON.
 * @param {string} id
 * @returns {Uint8Array | undefined}
 */
export function blob_get(id) {
    const ptr0 = passStringToWasm0(id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.blob_get(ptr0, len0);
    if (ret[3]) {
        throw takeFromExternrefTable0(ret[2]);
    }
    let v2;
    if (ret[0] !== 0) {
        v2 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    }
    return v2;
}

/**
 * Store bytes under an id, replacing anything already there. Chunked the way
 * the desktop chunks, so a body written here reads back on a desktop that
 * imports the database, and vice versa.
 * @param {string} id
 * @param {Uint8Array | number[]} bytes
 */
export function blob_put(id, bytes) {
    let ptr0, len0, ptr1, len1;
    try {
        ptr0 = passStringToWasm0(id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        len0 = WASM_VECTOR_LEN;
        ptr1 = passArray8ToWasm0(bytes, wasm.__wbindgen_malloc);
        len1 = WASM_VECTOR_LEN;
    } catch (e) {
        if (ptr1) { wasm.__wbindgen_free(ptr1, len1 * 1, 1); }
        if (ptr0) { wasm.__wbindgen_free(ptr0, len0 * 1, 1); }
        throw e;
    }
    const ret = wasm.blob_put(ptr0, len0, ptr1, len1);
    if (ret[1]) {
        throw takeFromExternrefTable0(ret[0]);
    }
}

/**
 * Register the OPFS-backed VFS and open the database.
 *
 * Migrations run inside `init_standalone`, exactly as they do for the CLI.
 * Safe to call more than once; later calls are no-ops.
 * @returns {Promise<void>}
 */
export function boot() {
    const ret = wasm.boot();
    return ret;
}

/**
 * Resolve and render a request for sending, exactly as the desktop does before it puts the
 * request on the network: the environment chain, inherited headers and auth, request
 * settings, the cookie jar. Nothing here touches a socket. What comes back is what the tab
 * posts to the Yaak server.
 *
 * Refuses, with a message the user can act on, when the request needs something this host
 * doesn't have: an authentication plugin, or a template function.
 * @param {any} payload
 * @returns {Promise<any>}
 */
export function prepare_http_send(payload) {
    const ret = wasm.prepare_http_send(payload);
    return ret;
}

/**
 * Run one command as `label` (the calling tab's identity, which stands in for
 * the desktop's window label on every write it makes).
 *
 * The payload shapes match the `Cmd*Req` types in `yaak-rpc-schema`, but are
 * declared locally and dispatched by name, which is the one place this host
 * does not share the desktop's guarantees: the desktop builds its router from
 * the schema, so every command has a handler by construction. Here a renamed
 * command would surface as a runtime "not a command this host answers".
 *
 * The fix is `yaak-commands` (the `Host` trait), not more machinery here —
 * its `models::*` handlers are already this file, typed. Three things have to
 * give before a wasm host can register them:
 *
 * 1. `Host: Send + Sync`, which a browser cannot satisfy: there is one thread
 *    and the connection pool is an `Rc`.
 * 2. `models_delete` reaches for `spawn_blocking`; there is nothing to spawn
 *    onto here.
 * 3. `yaak-commands` depends on `yaak` and `yaak-plugins`, which pull the HTTP
 *    stack and the Node sidecar and do not build for wasm32.
 *
 * None of those are hard; they are just not this PR.
 * @param {string} cmd
 * @param {any} payload
 * @param {string} label
 * @returns {any}
 */
export function rpc(cmd, payload, label) {
    let ptr0, len0, ptr1, len1;
    try {
        ptr0 = passStringToWasm0(cmd, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        len0 = WASM_VECTOR_LEN;
        ptr1 = passStringToWasm0(label, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        len1 = WASM_VECTOR_LEN;
    } catch (e) {
        if (ptr1) { wasm.__wbindgen_free(ptr1, len1 * 1, 1); }
        if (ptr0) { wasm.__wbindgen_free(ptr0, len0 * 1, 1); }
        throw e;
    }
    const ret = wasm.rpc(ptr0, len0, payload, ptr1, len1);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}
export function __wbg_Error_208446807d0d1e30(arg0, arg1) {
    const ret = Error(getStringFromWasm0(arg0, arg1));
    return ret;
}
export function __wbg_String_8564e559799eccda(arg0, arg1) {
    const ret = String(arg1);
    const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len1 = WASM_VECTOR_LEN;
    getDataViewMemory0().setInt32((arg0 >>> 0) + 4 * 1, len1, true);
    getDataViewMemory0().setInt32((arg0 >>> 0) + 4 * 0, ptr1, true);
}
export function __wbg___wbindgen_bigint_get_as_i64_11da4b52cd0aedef(arg0, arg1) {
    const v = arg1;
    const ret = typeof(v) === 'bigint' ? v : undefined;
    getDataViewMemory0().setBigInt64((arg0 >>> 0) + 8 * 1, isLikeNone(ret) ? BigInt(0) : ret, true);
    getDataViewMemory0().setInt32((arg0 >>> 0) + 4 * 0, !isLikeNone(ret), true);
}
export function __wbg___wbindgen_boolean_get_4f1baf9a00be3c74(arg0) {
    const v = arg0;
    const ret = typeof(v) === 'boolean' ? v : undefined;
    return isLikeNone(ret) ? 0xFFFFFF : ret ? 1 : 0;
}
export function __wbg___wbindgen_debug_string_f249a2a76caa9a55(arg0, arg1) {
    const ret = debugString(arg1);
    const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len1 = WASM_VECTOR_LEN;
    getDataViewMemory0().setInt32((arg0 >>> 0) + 4 * 1, len1, true);
    getDataViewMemory0().setInt32((arg0 >>> 0) + 4 * 0, ptr1, true);
}
export function __wbg___wbindgen_in_3f58a9d3b3a7eed2(arg0, arg1) {
    const ret = arg0 in arg1;
    return ret;
}
export function __wbg___wbindgen_is_bigint_5fa10641e039d3ef(arg0) {
    const ret = typeof(arg0) === 'bigint';
    return ret;
}
export function __wbg___wbindgen_is_function_741ff2bb612836f5(arg0) {
    const ret = typeof(arg0) === 'function';
    return ret;
}
export function __wbg___wbindgen_is_null_c22311b1cc228e3a(arg0) {
    const ret = arg0 === null;
    return ret;
}
export function __wbg___wbindgen_is_object_8b968c3ab8e96595(arg0) {
    const val = arg0;
    const ret = typeof(val) === 'object' && val !== null;
    return ret;
}
export function __wbg___wbindgen_is_string_fc456fee5d3317de(arg0) {
    const ret = typeof(arg0) === 'string';
    return ret;
}
export function __wbg___wbindgen_is_undefined_be5b34249ff1fc15(arg0) {
    const ret = arg0 === undefined;
    return ret;
}
export function __wbg___wbindgen_jsval_eq_38d7bfbe4cc84039(arg0, arg1) {
    const ret = arg0 === arg1;
    return ret;
}
export function __wbg___wbindgen_jsval_loose_eq_b2f214e2e4b30e36(arg0, arg1) {
    const ret = arg0 == arg1;
    return ret;
}
export function __wbg___wbindgen_memory_17a1178bc3328ea3() {
    const ret = wasm.memory;
    return ret;
}
export function __wbg___wbindgen_number_get_934b640d0889af78(arg0, arg1) {
    const obj = arg1;
    const ret = typeof(obj) === 'number' ? obj : undefined;
    getDataViewMemory0().setFloat64((arg0 >>> 0) + 8 * 1, isLikeNone(ret) ? 0 : ret, true);
    getDataViewMemory0().setInt32((arg0 >>> 0) + 4 * 0, !isLikeNone(ret), true);
}
export function __wbg___wbindgen_string_get_7ce8eee7fd327545(arg0, arg1) {
    const obj = arg1;
    const ret = typeof(obj) === 'string' ? obj : undefined;
    var ptr1 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    var len1 = WASM_VECTOR_LEN;
    getDataViewMemory0().setInt32((arg0 >>> 0) + 4 * 1, len1, true);
    getDataViewMemory0().setInt32((arg0 >>> 0) + 4 * 0, ptr1, true);
}
export function __wbg___wbindgen_throw_4c88d8bf264fd984(arg0, arg1) {
    throw new Error(getStringFromWasm0(arg0, arg1));
}
export function __wbg__wbg_cb_unref_09736879a3f67559(arg0) {
    arg0._wbg_cb_unref();
}
export function __wbg_buffer_0eaa216bac6b8749(arg0) {
    const ret = arg0.buffer;
    return ret;
}
export function __wbg_call_40b008ba32f73991() { return handleError(function (arg0, arg1) {
    const ret = arg0.call(arg1);
    return ret;
}, arguments); }
export function __wbg_call_a410eb4b59ed5965() { return handleError(function (arg0, arg1, arg2) {
    const ret = arg0.call(arg1, arg2);
    return ret;
}, arguments); }
export function __wbg_close_264222edec0e3164(arg0) {
    arg0.close();
}
export function __wbg_construct_8670bb4c2b062969() { return handleError(function (arg0, arg1) {
    const ret = Reflect.construct(arg0, arg1);
    return ret;
}, arguments); }
export function __wbg_createSyncAccessHandle_9fc3d780677bd197(arg0) {
    const ret = arg0.createSyncAccessHandle();
    return ret;
}
export function __wbg_done_57e08d0be6e30c02(arg0) {
    const ret = arg0.done;
    return ret;
}
export function __wbg_entries_643fb9ebab2c33a3(arg0) {
    const ret = arg0.entries();
    return ret;
}
export function __wbg_entries_7bb1459bd9b5c2b9(arg0) {
    const ret = Object.entries(arg0);
    return ret;
}
export function __wbg_error_757e9472f8410341(arg0, arg1) {
    let deferred0_0;
    let deferred0_1;
    try {
        deferred0_0 = arg0;
        deferred0_1 = arg1;
        console.error(getStringFromWasm0(arg0, arg1));
    } finally {
        wasm.__wbindgen_free(deferred0_0, deferred0_1, 1);
    }
}
export function __wbg_flush_34f73503687e5840() { return handleError(function (arg0) {
    arg0.flush();
}, arguments); }
export function __wbg_getDate_a44b5f4a8c42a3c3(arg0) {
    const ret = arg0.getDate();
    return ret;
}
export function __wbg_getDay_0ea3aef4bf721d1c(arg0) {
    const ret = arg0.getDay();
    return ret;
}
export function __wbg_getDirectoryHandle_7250477470a7f35b(arg0, arg1, arg2, arg3) {
    const ret = arg0.getDirectoryHandle(getStringFromWasm0(arg1, arg2), arg3);
    return ret;
}
export function __wbg_getDirectory_50787a69f3a13110(arg0) {
    const ret = arg0.getDirectory();
    return ret;
}
export function __wbg_getFileHandle_1cb5562219601c4f(arg0, arg1, arg2, arg3) {
    const ret = arg0.getFileHandle(getStringFromWasm0(arg1, arg2), arg3);
    return ret;
}
export function __wbg_getFullYear_94114da14f235fca(arg0) {
    const ret = arg0.getFullYear();
    return ret;
}
export function __wbg_getHours_d55d13f9f95415bb(arg0) {
    const ret = arg0.getHours();
    return ret;
}
export function __wbg_getMinutes_d0d71c490ef83b47(arg0) {
    const ret = arg0.getMinutes();
    return ret;
}
export function __wbg_getMonth_a4698d688e95d9bd(arg0) {
    const ret = arg0.getMonth();
    return ret;
}
export function __wbg_getRandomValues_8b6f1f663e6f188d() { return handleError(function (arg0, arg1) {
    globalThis.crypto.getRandomValues(getArrayU8FromWasm0(arg0, arg1));
}, arguments); }
export function __wbg_getRandomValues_fa318501432941ff() { return handleError(function (arg0) {
    globalThis.crypto.getRandomValues(arg0);
}, arguments); }
export function __wbg_getSeconds_7143dabeecfaf7d1(arg0) {
    const ret = arg0.getSeconds();
    return ret;
}
export function __wbg_getSize_c72004a2a12e972a() { return handleError(function (arg0) {
    const ret = arg0.getSize();
    return ret;
}, arguments); }
export function __wbg_getTime_edc91481cbc4cd78(arg0) {
    const ret = arg0.getTime();
    return ret;
}
export function __wbg_getTimezoneOffset_87127d92c2c117e9(arg0) {
    const ret = arg0.getTimezoneOffset();
    return ret;
}
export function __wbg_get_2080c49015e35254() { return handleError(function (arg0, arg1) {
    const ret = Reflect.get(arg0, arg1);
    return ret;
}, arguments); }
export function __wbg_get_635eea311fa1a291() { return handleError(function (arg0, arg1) {
    const ret = Reflect.get(arg0, arg1);
    return ret;
}, arguments); }
export function __wbg_get_d7176cfb76d71114(arg0, arg1) {
    const ret = arg0[arg1 >>> 0];
    return ret;
}
export function __wbg_get_unchecked_e6325ad374eff861(arg0, arg1) {
    const ret = arg0[arg1 >>> 0];
    return ret;
}
export function __wbg_get_with_ref_key_fc601247060b7204(arg0, arg1) {
    const ret = arg0[arg1];
    return ret;
}
export function __wbg_instanceof_ArrayBuffer_12cdaa4161423e6b(arg0) {
    let result;
    try {
        result = arg0 instanceof ArrayBuffer;
    } catch (_) {
        result = false;
    }
    const ret = result;
    return ret;
}
export function __wbg_instanceof_DedicatedWorkerGlobalScope_3f1bee35601e7e7b(arg0) {
    let result;
    try {
        result = arg0 instanceof DedicatedWorkerGlobalScope;
    } catch (_) {
        result = false;
    }
    const ret = result;
    return ret;
}
export function __wbg_instanceof_Map_0b4fc8b62e73f163(arg0) {
    let result;
    try {
        result = arg0 instanceof Map;
    } catch (_) {
        result = false;
    }
    const ret = result;
    return ret;
}
export function __wbg_instanceof_Uint8Array_d7aeb0dcb3108fea(arg0) {
    let result;
    try {
        result = arg0 instanceof Uint8Array;
    } catch (_) {
        result = false;
    }
    const ret = result;
    return ret;
}
export function __wbg_isArray_bcf1376d0d732d08(arg0) {
    const ret = Array.isArray(arg0);
    return ret;
}
export function __wbg_isSafeInteger_1a35ba4d31e71d38(arg0) {
    const ret = Number.isSafeInteger(arg0);
    return ret;
}
export function __wbg_iterator_e4c5e8f68ada7b58() {
    const ret = Symbol.iterator;
    return ret;
}
export function __wbg_length_186163212ffe79c3(arg0) {
    const ret = arg0.length;
    return ret;
}
export function __wbg_length_b03a0fabb109b1e9(arg0) {
    const ret = arg0.length;
    return ret;
}
export function __wbg_navigator_9641ab32fa612dd1(arg0) {
    const ret = arg0.navigator;
    return ret;
}
export function __wbg_new_0_36d738a0c8cfac43() {
    const ret = new Date();
    return ret;
}
export function __wbg_new_13de428334042d26(arg0) {
    const ret = new Uint8Array(arg0);
    return ret;
}
export function __wbg_new_37eb45aaf5eeb820() {
    const ret = new Array();
    return ret;
}
export function __wbg_new_3e95cd7386bb9a6c(arg0) {
    const ret = new Date(arg0);
    return ret;
}
export function __wbg_new_68957d2a912dfa0a(arg0) {
    const ret = new Int32Array(arg0);
    return ret;
}
export function __wbg_new_7075786089b89c5e() {
    const ret = new Map();
    return ret;
}
export function __wbg_new_787b9fb330d55d78(arg0, arg1) {
    const ret = new Error(getStringFromWasm0(arg0, arg1));
    return ret;
}
export function __wbg_new_bb74001155cb8ca8() {
    const ret = new Error();
    return ret;
}
export function __wbg_new_cd4348290afae586() {
    const ret = new Object();
    return ret;
}
export function __wbg_new_typed_e09da9dae6ee5935(arg0, arg1) {
    try {
        var state0 = {a: arg0, b: arg1};
        var cb0 = (arg0, arg1) => {
            const a = state0.a;
            state0.a = 0;
            try {
                return wasm_bindgen_f35135604659b0f2___convert__closures_____invoke___js_sys_40d4fbe8a8ae1095___Function_fn_wasm_bindgen_f35135604659b0f2___JsValue_____wasm_bindgen_f35135604659b0f2___sys__Undefined___js_sys_40d4fbe8a8ae1095___Function_fn_wasm_bindgen_f35135604659b0f2___JsValue_____wasm_bindgen_f35135604659b0f2___sys__Undefined_______true_(a, state0.b, arg0, arg1);
            } finally {
                state0.a = a;
            }
        };
        const ret = new Promise(cb0);
        return ret;
    } finally {
        state0.a = 0;
    }
}
export function __wbg_new_with_length_01b143a7e5dd5a3e(arg0) {
    const ret = new Uint8Array(arg0 >>> 0);
    return ret;
}
export function __wbg_new_with_year_month_day_2b03abbebcc8f077(arg0, arg1, arg2) {
    const ret = new Date(arg0 >>> 0, arg1, arg2);
    return ret;
}
export function __wbg_next_040cd66fe7246513() { return handleError(function (arg0) {
    const ret = arg0.next();
    return ret;
}, arguments); }
export function __wbg_next_178c1651c11432b3(arg0) {
    const ret = arg0.next;
    return ret;
}
export function __wbg_next_af5ac6a08bb0a717() { return handleError(function (arg0) {
    const ret = arg0.next();
    return ret;
}, arguments); }
export function __wbg_of_027eb15371aac932(arg0) {
    const ret = Array.of(arg0);
    return ret;
}
export function __wbg_prototypesetcall_13162965d1fe7aa3(arg0, arg1, arg2) {
    Uint8Array.prototype.set.call(getArrayU8FromWasm0(arg0, arg1), arg2);
}
export function __wbg_queueMicrotask_1e8503a8a690f0a3(arg0) {
    const ret = arg0.queueMicrotask;
    return ret;
}
export function __wbg_queueMicrotask_4a1a4d8dd332373b(arg0) {
    queueMicrotask(arg0);
}
export function __wbg_random_df36b90cd78a7d54() {
    const ret = Math.random();
    return ret;
}
export function __wbg_readLegacyDatabase_fb98e8314cf0bd32() { return handleError(function (arg0, arg1) {
    const ret = readLegacyDatabase(getStringFromWasm0(arg0, arg1));
    return ret;
}, arguments); }
export function __wbg_read_fd16d549b57ad237() { return handleError(function (arg0, arg1, arg2, arg3) {
    const ret = arg0.read(getArrayU8FromWasm0(arg1, arg2), arg3);
    return ret;
}, arguments); }
export function __wbg_removeEntry_81c62dd6ae8e3673(arg0, arg1, arg2) {
    const ret = arg0.removeEntry(getStringFromWasm0(arg1, arg2));
    return ret;
}
export function __wbg_resolve_dbf78ab4942478b0(arg0) {
    const ret = Promise.resolve(arg0);
    return ret;
}
export function __wbg_set_8282f7e0d2d01336(arg0, arg1, arg2) {
    const ret = arg0.set(arg1, arg2);
    return ret;
}
export function __wbg_set_at_f569a2586a7350aa(arg0, arg1) {
    arg0.at = arg1;
}
export function __wbg_set_create_29c03b2d68cbe451(arg0, arg1) {
    arg0.create = arg1 !== 0;
}
export function __wbg_set_create_8034c70deebee24f(arg0, arg1) {
    arg0.create = arg1 !== 0;
}
export function __wbg_set_d2d33b52458e984a(arg0, arg1, arg2) {
    arg0[arg1 >>> 0] = arg2;
}
export function __wbg_set_e4b9a833d288759a(arg0, arg1, arg2) {
    arg0[arg1] = arg2;
}
export function __wbg_stack_575c4e0918581b9c(arg0, arg1) {
    const ret = arg1.stack;
    const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len1 = WASM_VECTOR_LEN;
    getDataViewMemory0().setInt32((arg0 >>> 0) + 4 * 1, len1, true);
    getDataViewMemory0().setInt32((arg0 >>> 0) + 4 * 0, ptr1, true);
}
export function __wbg_static_accessor_GLOBAL_THIS_003ee833af9699fc() {
    const ret = typeof globalThis === 'undefined' ? undefined : globalThis;
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}
export function __wbg_static_accessor_GLOBAL_e4293fb22cbe77da() {
    const ret = typeof global === 'undefined' ? undefined : global;
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}
export function __wbg_static_accessor_SELF_53bb20457401453d() {
    const ret = typeof self === 'undefined' ? undefined : self;
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}
export function __wbg_static_accessor_WINDOW_b5e0810bfecb7feb() {
    const ret = typeof window === 'undefined' ? undefined : window;
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}
export function __wbg_storage_681cb2810b22dae6(arg0) {
    const ret = arg0.storage;
    return ret;
}
export function __wbg_then_656f253a5dd7d8ea(arg0, arg1, arg2) {
    const ret = arg0.then(arg1, arg2);
    return ret;
}
export function __wbg_then_e3f7f2d365708be8(arg0, arg1) {
    const ret = arg0.then(arg1);
    return ret;
}
export function __wbg_truncate_5f8dea9c665ccb45() { return handleError(function (arg0, arg1) {
    arg0.truncate(arg1);
}, arguments); }
export function __wbg_truncate_a0d3eb3d7c2331e0() { return handleError(function (arg0, arg1) {
    arg0.truncate(arg1 >>> 0);
}, arguments); }
export function __wbg_value_e0f328965e184931(arg0) {
    const ret = arg0.value;
    return ret;
}
export function __wbg_wait_e2865064bee94744() { return handleError(function (arg0, arg1, arg2, arg3) {
    const ret = Atomics.wait(arg0, arg1 >>> 0, arg2, arg3);
    return ret;
}, arguments); }
export function __wbg_warn_42702744b2284b6f(arg0, arg1) {
    console.warn(arg0, arg1);
}
export function __wbg_write_d97a1c0a72df2595() { return handleError(function (arg0, arg1, arg2, arg3) {
    const ret = arg0.write(getArrayU8FromWasm0(arg1, arg2), arg3);
    return ret;
}, arguments); }
export function __wbindgen_generic_0000000000000001(arg0, arg1) {
    // Cast intrinsic for `Closure(Closure { owned: true, function: Function { arguments: [Externref], shim_idx: 1137, ret: Result(Unit), inner_ret: Some(Result(Unit)) }, mutable: true }) -> Externref`.
    const ret = makeMutClosure(arg0, arg1, wasm_bindgen_f35135604659b0f2___convert__closures_____invoke___wasm_bindgen_f35135604659b0f2___JsValue__core_37ee0ce0c4cd57d5___result__Result_____wasm_bindgen_f35135604659b0f2___JsError___true_);
    return ret;
}
export function __wbindgen_generic_0000000000000002(arg0) {
    // Cast intrinsic for `F64 -> Externref`.
    const ret = arg0;
    return ret;
}
export function __wbindgen_generic_0000000000000003(arg0) {
    // Cast intrinsic for `I64 -> Externref`.
    const ret = arg0;
    return ret;
}
export function __wbindgen_generic_0000000000000004(arg0, arg1) {
    // Cast intrinsic for `Ref(String) -> Externref`.
    const ret = getStringFromWasm0(arg0, arg1);
    return ret;
}
export function __wbindgen_generic_0000000000000005(arg0) {
    // Cast intrinsic for `U64 -> Externref`.
    const ret = BigInt.asUintN(64, arg0);
    return ret;
}
export function __wbindgen_init_externref_table() {
    const table = wasm.__wbindgen_externrefs;
    table.set(0, undefined);
    table.set(1024, undefined);
    table.set(1025, null);
    table.set(1026, true);
    table.set(1027, false);
}
function wasm_bindgen_f35135604659b0f2___convert__closures_____invoke___wasm_bindgen_f35135604659b0f2___JsValue__core_37ee0ce0c4cd57d5___result__Result_____wasm_bindgen_f35135604659b0f2___JsError___true_(arg0, arg1, arg2) {
    const ret = wasm.wasm_bindgen_f35135604659b0f2___convert__closures_____invoke___wasm_bindgen_f35135604659b0f2___JsValue__core_37ee0ce0c4cd57d5___result__Result_____wasm_bindgen_f35135604659b0f2___JsError___true_(arg0, arg1, arg2);
    if (ret[1]) {
        throw takeFromExternrefTable0(ret[0]);
    }
}

function wasm_bindgen_f35135604659b0f2___convert__closures_____invoke___js_sys_40d4fbe8a8ae1095___Function_fn_wasm_bindgen_f35135604659b0f2___JsValue_____wasm_bindgen_f35135604659b0f2___sys__Undefined___js_sys_40d4fbe8a8ae1095___Function_fn_wasm_bindgen_f35135604659b0f2___JsValue_____wasm_bindgen_f35135604659b0f2___sys__Undefined_______true_(arg0, arg1, arg2, arg3) {
    wasm.wasm_bindgen_f35135604659b0f2___convert__closures_____invoke___js_sys_40d4fbe8a8ae1095___Function_fn_wasm_bindgen_f35135604659b0f2___JsValue_____wasm_bindgen_f35135604659b0f2___sys__Undefined___js_sys_40d4fbe8a8ae1095___Function_fn_wasm_bindgen_f35135604659b0f2___JsValue_____wasm_bindgen_f35135604659b0f2___sys__Undefined_______true_(arg0, arg1, arg2, arg3);
}

function addToExternrefTable0(obj) {
    const idx = wasm.__externref_table_alloc();
    wasm.__wbindgen_externrefs.set(idx, obj);
    return idx;
}

const CLOSURE_DTORS = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(state => wasm.__wbindgen_destroy_closure(state.a, state.b));

function debugString(val) {
    switch (typeof val) {
        // primitive types
        case 'number':
        case 'boolean':
        case 'undefined':
        return `${val}`;
        case 'string':
        return JSON.stringify(val);
        case 'bigint':
        return `${val}n`;
        case 'symbol':
        return val.description !== undefined
            ? `Symbol(${val.description})`
            : 'Symbol';
        case 'function':
        return typeof val.name === 'string' && val.name !== ''
            ? `Function(${val.name})`
            : 'Function';
        case 'object': {
            if (val === null) {
                return 'null';
            }
            // objects
            if (Array.isArray(val)) {
                return '[' + Array.from(val, debugString).join(', ') + ']';
            }
            // errors
            if (val instanceof Error) {
                return `${val.name}: ${val.message}\n${val.stack}`;
            }

            const toStringOutput = toString.call(val);
            // Test for built-in
            const className = /\[object ([^\]]+)\]/.exec(toStringOutput)?.[1];

            // Failed to match the standard '[object ClassName]'
            if (className === undefined) {
                return toStringOutput;
            }
            if (className === 'Object') {
                // we're a user defined class or Object
                // JSON.stringify avoids problems with cycles, and is generally much
                // easier than looping through ownProperties of `val`.
                try {
                    return 'Object(' + JSON.stringify(val) + ')';
                } catch (_) {
                    return 'Object';
                }
            }
            // TODO we could test for more things here, like `Set`s and `Map`s.
            return className;
        }
        // Per MDN: 'This list of values is exhaustive.'
        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/typeof#description
    }
}

function getArrayU8FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getUint8ArrayMemory0().subarray(ptr / 1, ptr / 1 + len);
}

let cachedDataViewMemory0 = null;
function getDataViewMemory0() {
    if (cachedDataViewMemory0 === null || cachedDataViewMemory0.buffer.detached === true || (cachedDataViewMemory0.buffer.detached === undefined && cachedDataViewMemory0.buffer !== wasm.memory.buffer)) {
        cachedDataViewMemory0 = new DataView(wasm.memory.buffer);
    }
    return cachedDataViewMemory0;
}

function getStringFromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return decodeText(getUint8ArrayMemory0().subarray(ptr, ptr + len));
}

let cachedUint8ArrayMemory0 = null;
function getUint8ArrayMemory0() {
    if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
        cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8ArrayMemory0;
}

function handleError(f, args) {
    try {
        return f.apply(this, args);
    } catch (e) {
        const idx = addToExternrefTable0(e);
        wasm.__wbindgen_exn_store(idx);
    }
}

function isLikeNone(x) {
    return x === undefined || x === null;
}

function makeMutClosure(arg0, arg1, f) {
    const state = { a: arg0, b: arg1, cnt: 1 };
    const real = (...args) => {

        // First up with a closure we increment the internal reference
        // count. This ensures that the Rust closure environment won't
        // be deallocated while we're invoking it.
        state.cnt++;
        const a = state.a;
        state.a = 0;
        try {
            return f(a, state.b, ...args);
        } finally {
            state.a = a;
            real._wbg_cb_unref();
        }
    };
    real._wbg_cb_unref = () => {
        if (--state.cnt === 0) {
            wasm.__wbindgen_destroy_closure(state.a, state.b);
            state.a = 0;
            CLOSURE_DTORS.unregister(state);
        }
    };
    CLOSURE_DTORS.register(real, state, state);
    return real;
}

function passArray8ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 1, 1) >>> 0;
    getUint8ArrayMemory0().set(arg, ptr / 1);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

function passStringToWasm0(arg, malloc, realloc) {
    if (realloc === undefined) {
        const buf = cachedTextEncoder.encode(arg);
        const ptr = malloc(buf.length, 1) >>> 0;
        getUint8ArrayMemory0().subarray(ptr, ptr + buf.length).set(buf);
        WASM_VECTOR_LEN = buf.length;
        return ptr;
    }

    let len = arg.length;
    let ptr = malloc(len, 1) >>> 0;

    const mem = getUint8ArrayMemory0();

    let offset = 0;

    for (; offset < len; offset++) {
        const code = arg.charCodeAt(offset);
        if (code > 0x7F) break;
        mem[ptr + offset] = code;
    }
    if (offset !== len) {
        if (offset !== 0) {
            arg = arg.slice(offset);
        }
        ptr = realloc(ptr, len, len = offset + arg.length * 3, 1) >>> 0;
        const view = getUint8ArrayMemory0().subarray(ptr + offset, ptr + len);
        const ret = cachedTextEncoder.encodeInto(arg, view);

        offset += ret.written;
        ptr = realloc(ptr, len, offset, 1) >>> 0;
    }

    WASM_VECTOR_LEN = offset;
    return ptr;
}

function takeFromExternrefTable0(idx) {
    const value = wasm.__wbindgen_externrefs.get(idx);
    wasm.__externref_table_dealloc(idx);
    return value;
}

let cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true });
cachedTextDecoder.decode();
const MAX_SAFARI_DECODE_BYTES = 2146435072;
let numBytesDecoded = 0;
function decodeText(bytes) {
    numBytesDecoded += bytes.length;
    if (numBytesDecoded >= MAX_SAFARI_DECODE_BYTES) {
        cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true });
        cachedTextDecoder.decode();
        numBytesDecoded = bytes.length;
    }
    return cachedTextDecoder.decode(bytes);
}

const cachedTextEncoder = new TextEncoder();

if (!('encodeInto' in cachedTextEncoder)) {
    cachedTextEncoder.encodeInto = function (arg, view) {
        const buf = cachedTextEncoder.encode(arg);
        view.set(buf);
        return {
            read: arg.length,
            written: buf.length
        };
    };
}

let WASM_VECTOR_LEN = 0;


let wasm;
export function __wbg_set_wasm(val) {
    wasm = val;
}
