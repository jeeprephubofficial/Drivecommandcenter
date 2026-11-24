var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// node_modules/unenv/dist/runtime/_internal/utils.mjs
// @__NO_SIDE_EFFECTS__
function createNotImplementedError(name) {
  return new Error(`[unenv] ${name} is not implemented yet!`);
}
__name(createNotImplementedError, "createNotImplementedError");
// @__NO_SIDE_EFFECTS__
function notImplemented(name) {
  const fn = /* @__PURE__ */ __name(() => {
    throw /* @__PURE__ */ createNotImplementedError(name);
  }, "fn");
  return Object.assign(fn, { __unenv__: true });
}
__name(notImplemented, "notImplemented");
// @__NO_SIDE_EFFECTS__
function notImplementedClass(name) {
  return class {
    __unenv__ = true;
    constructor() {
      throw new Error(`[unenv] ${name} is not implemented yet!`);
    }
  };
}
__name(notImplementedClass, "notImplementedClass");

// node_modules/unenv/dist/runtime/node/internal/perf_hooks/performance.mjs
var _timeOrigin = globalThis.performance?.timeOrigin ?? Date.now();
var _performanceNow = globalThis.performance?.now ? globalThis.performance.now.bind(globalThis.performance) : () => Date.now() - _timeOrigin;
var nodeTiming = {
  name: "node",
  entryType: "node",
  startTime: 0,
  duration: 0,
  nodeStart: 0,
  v8Start: 0,
  bootstrapComplete: 0,
  environment: 0,
  loopStart: 0,
  loopExit: 0,
  idleTime: 0,
  uvMetricsInfo: {
    loopCount: 0,
    events: 0,
    eventsWaiting: 0
  },
  detail: void 0,
  toJSON() {
    return this;
  }
};
var PerformanceEntry = class {
  static {
    __name(this, "PerformanceEntry");
  }
  __unenv__ = true;
  detail;
  entryType = "event";
  name;
  startTime;
  constructor(name, options) {
    this.name = name;
    this.startTime = options?.startTime || _performanceNow();
    this.detail = options?.detail;
  }
  get duration() {
    return _performanceNow() - this.startTime;
  }
  toJSON() {
    return {
      name: this.name,
      entryType: this.entryType,
      startTime: this.startTime,
      duration: this.duration,
      detail: this.detail
    };
  }
};
var PerformanceMark = class PerformanceMark2 extends PerformanceEntry {
  static {
    __name(this, "PerformanceMark");
  }
  entryType = "mark";
  constructor() {
    super(...arguments);
  }
  get duration() {
    return 0;
  }
};
var PerformanceMeasure = class extends PerformanceEntry {
  static {
    __name(this, "PerformanceMeasure");
  }
  entryType = "measure";
};
var PerformanceResourceTiming = class extends PerformanceEntry {
  static {
    __name(this, "PerformanceResourceTiming");
  }
  entryType = "resource";
  serverTiming = [];
  connectEnd = 0;
  connectStart = 0;
  decodedBodySize = 0;
  domainLookupEnd = 0;
  domainLookupStart = 0;
  encodedBodySize = 0;
  fetchStart = 0;
  initiatorType = "";
  name = "";
  nextHopProtocol = "";
  redirectEnd = 0;
  redirectStart = 0;
  requestStart = 0;
  responseEnd = 0;
  responseStart = 0;
  secureConnectionStart = 0;
  startTime = 0;
  transferSize = 0;
  workerStart = 0;
  responseStatus = 0;
};
var PerformanceObserverEntryList = class {
  static {
    __name(this, "PerformanceObserverEntryList");
  }
  __unenv__ = true;
  getEntries() {
    return [];
  }
  getEntriesByName(_name, _type) {
    return [];
  }
  getEntriesByType(type) {
    return [];
  }
};
var Performance = class {
  static {
    __name(this, "Performance");
  }
  __unenv__ = true;
  timeOrigin = _timeOrigin;
  eventCounts = /* @__PURE__ */ new Map();
  _entries = [];
  _resourceTimingBufferSize = 0;
  navigation = void 0;
  timing = void 0;
  timerify(_fn, _options) {
    throw createNotImplementedError("Performance.timerify");
  }
  get nodeTiming() {
    return nodeTiming;
  }
  eventLoopUtilization() {
    return {};
  }
  markResourceTiming() {
    return new PerformanceResourceTiming("");
  }
  onresourcetimingbufferfull = null;
  now() {
    if (this.timeOrigin === _timeOrigin) {
      return _performanceNow();
    }
    return Date.now() - this.timeOrigin;
  }
  clearMarks(markName) {
    this._entries = markName ? this._entries.filter((e) => e.name !== markName) : this._entries.filter((e) => e.entryType !== "mark");
  }
  clearMeasures(measureName) {
    this._entries = measureName ? this._entries.filter((e) => e.name !== measureName) : this._entries.filter((e) => e.entryType !== "measure");
  }
  clearResourceTimings() {
    this._entries = this._entries.filter((e) => e.entryType !== "resource" || e.entryType !== "navigation");
  }
  getEntries() {
    return this._entries;
  }
  getEntriesByName(name, type) {
    return this._entries.filter((e) => e.name === name && (!type || e.entryType === type));
  }
  getEntriesByType(type) {
    return this._entries.filter((e) => e.entryType === type);
  }
  mark(name, options) {
    const entry = new PerformanceMark(name, options);
    this._entries.push(entry);
    return entry;
  }
  measure(measureName, startOrMeasureOptions, endMark) {
    let start;
    let end;
    if (typeof startOrMeasureOptions === "string") {
      start = this.getEntriesByName(startOrMeasureOptions, "mark")[0]?.startTime;
      end = this.getEntriesByName(endMark, "mark")[0]?.startTime;
    } else {
      start = Number.parseFloat(startOrMeasureOptions?.start) || this.now();
      end = Number.parseFloat(startOrMeasureOptions?.end) || this.now();
    }
    const entry = new PerformanceMeasure(measureName, {
      startTime: start,
      detail: {
        start,
        end
      }
    });
    this._entries.push(entry);
    return entry;
  }
  setResourceTimingBufferSize(maxSize) {
    this._resourceTimingBufferSize = maxSize;
  }
  addEventListener(type, listener, options) {
    throw createNotImplementedError("Performance.addEventListener");
  }
  removeEventListener(type, listener, options) {
    throw createNotImplementedError("Performance.removeEventListener");
  }
  dispatchEvent(event) {
    throw createNotImplementedError("Performance.dispatchEvent");
  }
  toJSON() {
    return this;
  }
};
var PerformanceObserver = class {
  static {
    __name(this, "PerformanceObserver");
  }
  __unenv__ = true;
  static supportedEntryTypes = [];
  _callback = null;
  constructor(callback) {
    this._callback = callback;
  }
  takeRecords() {
    return [];
  }
  disconnect() {
    throw createNotImplementedError("PerformanceObserver.disconnect");
  }
  observe(options) {
    throw createNotImplementedError("PerformanceObserver.observe");
  }
  bind(fn) {
    return fn;
  }
  runInAsyncScope(fn, thisArg, ...args) {
    return fn.call(thisArg, ...args);
  }
  asyncId() {
    return 0;
  }
  triggerAsyncId() {
    return 0;
  }
  emitDestroy() {
    return this;
  }
};
var performance = globalThis.performance && "addEventListener" in globalThis.performance ? globalThis.performance : new Performance();

// node_modules/@cloudflare/unenv-preset/dist/runtime/polyfill/performance.mjs
if (!("__unenv__" in performance)) {
  const proto = Performance.prototype;
  for (const key of Object.getOwnPropertyNames(proto)) {
    if (key !== "constructor" && !(key in performance)) {
      const desc = Object.getOwnPropertyDescriptor(proto, key);
      if (desc) {
        Object.defineProperty(performance, key, desc);
      }
    }
  }
}
globalThis.performance = performance;
globalThis.Performance = Performance;
globalThis.PerformanceEntry = PerformanceEntry;
globalThis.PerformanceMark = PerformanceMark;
globalThis.PerformanceMeasure = PerformanceMeasure;
globalThis.PerformanceObserver = PerformanceObserver;
globalThis.PerformanceObserverEntryList = PerformanceObserverEntryList;
globalThis.PerformanceResourceTiming = PerformanceResourceTiming;

// node_modules/unenv/dist/runtime/node/console.mjs
import { Writable } from "node:stream";

// node_modules/unenv/dist/runtime/mock/noop.mjs
var noop_default = Object.assign(() => {
}, { __unenv__: true });

// node_modules/unenv/dist/runtime/node/console.mjs
var _console = globalThis.console;
var _ignoreErrors = true;
var _stderr = new Writable();
var _stdout = new Writable();
var log = _console?.log ?? noop_default;
var info = _console?.info ?? log;
var trace = _console?.trace ?? info;
var debug = _console?.debug ?? log;
var table = _console?.table ?? log;
var error = _console?.error ?? log;
var warn = _console?.warn ?? error;
var createTask = _console?.createTask ?? /* @__PURE__ */ notImplemented("console.createTask");
var clear = _console?.clear ?? noop_default;
var count = _console?.count ?? noop_default;
var countReset = _console?.countReset ?? noop_default;
var dir = _console?.dir ?? noop_default;
var dirxml = _console?.dirxml ?? noop_default;
var group = _console?.group ?? noop_default;
var groupEnd = _console?.groupEnd ?? noop_default;
var groupCollapsed = _console?.groupCollapsed ?? noop_default;
var profile = _console?.profile ?? noop_default;
var profileEnd = _console?.profileEnd ?? noop_default;
var time = _console?.time ?? noop_default;
var timeEnd = _console?.timeEnd ?? noop_default;
var timeLog = _console?.timeLog ?? noop_default;
var timeStamp = _console?.timeStamp ?? noop_default;
var Console = _console?.Console ?? /* @__PURE__ */ notImplementedClass("console.Console");
var _times = /* @__PURE__ */ new Map();
var _stdoutErrorHandler = noop_default;
var _stderrErrorHandler = noop_default;

// node_modules/@cloudflare/unenv-preset/dist/runtime/node/console.mjs
var workerdConsole = globalThis["console"];
var {
  assert,
  clear: clear2,
  // @ts-expect-error undocumented public API
  context,
  count: count2,
  countReset: countReset2,
  // @ts-expect-error undocumented public API
  createTask: createTask2,
  debug: debug2,
  dir: dir2,
  dirxml: dirxml2,
  error: error2,
  group: group2,
  groupCollapsed: groupCollapsed2,
  groupEnd: groupEnd2,
  info: info2,
  log: log2,
  profile: profile2,
  profileEnd: profileEnd2,
  table: table2,
  time: time2,
  timeEnd: timeEnd2,
  timeLog: timeLog2,
  timeStamp: timeStamp2,
  trace: trace2,
  warn: warn2
} = workerdConsole;
Object.assign(workerdConsole, {
  Console,
  _ignoreErrors,
  _stderr,
  _stderrErrorHandler,
  _stdout,
  _stdoutErrorHandler,
  _times
});
var console_default = workerdConsole;

// node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-console
globalThis.console = console_default;

// node_modules/unenv/dist/runtime/node/internal/process/hrtime.mjs
var hrtime = /* @__PURE__ */ Object.assign(/* @__PURE__ */ __name(function hrtime2(startTime) {
  const now = Date.now();
  const seconds = Math.trunc(now / 1e3);
  const nanos = now % 1e3 * 1e6;
  if (startTime) {
    let diffSeconds = seconds - startTime[0];
    let diffNanos = nanos - startTime[0];
    if (diffNanos < 0) {
      diffSeconds = diffSeconds - 1;
      diffNanos = 1e9 + diffNanos;
    }
    return [diffSeconds, diffNanos];
  }
  return [seconds, nanos];
}, "hrtime"), { bigint: /* @__PURE__ */ __name(function bigint() {
  return BigInt(Date.now() * 1e6);
}, "bigint") });

// node_modules/unenv/dist/runtime/node/internal/process/process.mjs
import { EventEmitter } from "node:events";

// node_modules/unenv/dist/runtime/node/internal/tty/read-stream.mjs
var ReadStream = class {
  static {
    __name(this, "ReadStream");
  }
  fd;
  isRaw = false;
  isTTY = false;
  constructor(fd) {
    this.fd = fd;
  }
  setRawMode(mode) {
    this.isRaw = mode;
    return this;
  }
};

// node_modules/unenv/dist/runtime/node/internal/tty/write-stream.mjs
var WriteStream = class {
  static {
    __name(this, "WriteStream");
  }
  fd;
  columns = 80;
  rows = 24;
  isTTY = false;
  constructor(fd) {
    this.fd = fd;
  }
  clearLine(dir3, callback) {
    callback && callback();
    return false;
  }
  clearScreenDown(callback) {
    callback && callback();
    return false;
  }
  cursorTo(x, y, callback) {
    callback && typeof callback === "function" && callback();
    return false;
  }
  moveCursor(dx, dy, callback) {
    callback && callback();
    return false;
  }
  getColorDepth(env2) {
    return 1;
  }
  hasColors(count3, env2) {
    return false;
  }
  getWindowSize() {
    return [this.columns, this.rows];
  }
  write(str, encoding, cb) {
    if (str instanceof Uint8Array) {
      str = new TextDecoder().decode(str);
    }
    try {
      console.log(str);
    } catch {
    }
    cb && typeof cb === "function" && cb();
    return false;
  }
};

// node_modules/unenv/dist/runtime/node/internal/process/node-version.mjs
var NODE_VERSION = "22.14.0";

// node_modules/unenv/dist/runtime/node/internal/process/process.mjs
var Process = class _Process extends EventEmitter {
  static {
    __name(this, "Process");
  }
  env;
  hrtime;
  nextTick;
  constructor(impl) {
    super();
    this.env = impl.env;
    this.hrtime = impl.hrtime;
    this.nextTick = impl.nextTick;
    for (const prop of [...Object.getOwnPropertyNames(_Process.prototype), ...Object.getOwnPropertyNames(EventEmitter.prototype)]) {
      const value = this[prop];
      if (typeof value === "function") {
        this[prop] = value.bind(this);
      }
    }
  }
  // --- event emitter ---
  emitWarning(warning, type, code) {
    console.warn(`${code ? `[${code}] ` : ""}${type ? `${type}: ` : ""}${warning}`);
  }
  emit(...args) {
    return super.emit(...args);
  }
  listeners(eventName) {
    return super.listeners(eventName);
  }
  // --- stdio (lazy initializers) ---
  #stdin;
  #stdout;
  #stderr;
  get stdin() {
    return this.#stdin ??= new ReadStream(0);
  }
  get stdout() {
    return this.#stdout ??= new WriteStream(1);
  }
  get stderr() {
    return this.#stderr ??= new WriteStream(2);
  }
  // --- cwd ---
  #cwd = "/";
  chdir(cwd2) {
    this.#cwd = cwd2;
  }
  cwd() {
    return this.#cwd;
  }
  // --- dummy props and getters ---
  arch = "";
  platform = "";
  argv = [];
  argv0 = "";
  execArgv = [];
  execPath = "";
  title = "";
  pid = 200;
  ppid = 100;
  get version() {
    return `v${NODE_VERSION}`;
  }
  get versions() {
    return { node: NODE_VERSION };
  }
  get allowedNodeEnvironmentFlags() {
    return /* @__PURE__ */ new Set();
  }
  get sourceMapsEnabled() {
    return false;
  }
  get debugPort() {
    return 0;
  }
  get throwDeprecation() {
    return false;
  }
  get traceDeprecation() {
    return false;
  }
  get features() {
    return {};
  }
  get release() {
    return {};
  }
  get connected() {
    return false;
  }
  get config() {
    return {};
  }
  get moduleLoadList() {
    return [];
  }
  constrainedMemory() {
    return 0;
  }
  availableMemory() {
    return 0;
  }
  uptime() {
    return 0;
  }
  resourceUsage() {
    return {};
  }
  // --- noop methods ---
  ref() {
  }
  unref() {
  }
  // --- unimplemented methods ---
  umask() {
    throw createNotImplementedError("process.umask");
  }
  getBuiltinModule() {
    return void 0;
  }
  getActiveResourcesInfo() {
    throw createNotImplementedError("process.getActiveResourcesInfo");
  }
  exit() {
    throw createNotImplementedError("process.exit");
  }
  reallyExit() {
    throw createNotImplementedError("process.reallyExit");
  }
  kill() {
    throw createNotImplementedError("process.kill");
  }
  abort() {
    throw createNotImplementedError("process.abort");
  }
  dlopen() {
    throw createNotImplementedError("process.dlopen");
  }
  setSourceMapsEnabled() {
    throw createNotImplementedError("process.setSourceMapsEnabled");
  }
  loadEnvFile() {
    throw createNotImplementedError("process.loadEnvFile");
  }
  disconnect() {
    throw createNotImplementedError("process.disconnect");
  }
  cpuUsage() {
    throw createNotImplementedError("process.cpuUsage");
  }
  setUncaughtExceptionCaptureCallback() {
    throw createNotImplementedError("process.setUncaughtExceptionCaptureCallback");
  }
  hasUncaughtExceptionCaptureCallback() {
    throw createNotImplementedError("process.hasUncaughtExceptionCaptureCallback");
  }
  initgroups() {
    throw createNotImplementedError("process.initgroups");
  }
  openStdin() {
    throw createNotImplementedError("process.openStdin");
  }
  assert() {
    throw createNotImplementedError("process.assert");
  }
  binding() {
    throw createNotImplementedError("process.binding");
  }
  // --- attached interfaces ---
  permission = { has: /* @__PURE__ */ notImplemented("process.permission.has") };
  report = {
    directory: "",
    filename: "",
    signal: "SIGUSR2",
    compact: false,
    reportOnFatalError: false,
    reportOnSignal: false,
    reportOnUncaughtException: false,
    getReport: /* @__PURE__ */ notImplemented("process.report.getReport"),
    writeReport: /* @__PURE__ */ notImplemented("process.report.writeReport")
  };
  finalization = {
    register: /* @__PURE__ */ notImplemented("process.finalization.register"),
    unregister: /* @__PURE__ */ notImplemented("process.finalization.unregister"),
    registerBeforeExit: /* @__PURE__ */ notImplemented("process.finalization.registerBeforeExit")
  };
  memoryUsage = Object.assign(() => ({
    arrayBuffers: 0,
    rss: 0,
    external: 0,
    heapTotal: 0,
    heapUsed: 0
  }), { rss: /* @__PURE__ */ __name(() => 0, "rss") });
  // --- undefined props ---
  mainModule = void 0;
  domain = void 0;
  // optional
  send = void 0;
  exitCode = void 0;
  channel = void 0;
  getegid = void 0;
  geteuid = void 0;
  getgid = void 0;
  getgroups = void 0;
  getuid = void 0;
  setegid = void 0;
  seteuid = void 0;
  setgid = void 0;
  setgroups = void 0;
  setuid = void 0;
  // internals
  _events = void 0;
  _eventsCount = void 0;
  _exiting = void 0;
  _maxListeners = void 0;
  _debugEnd = void 0;
  _debugProcess = void 0;
  _fatalException = void 0;
  _getActiveHandles = void 0;
  _getActiveRequests = void 0;
  _kill = void 0;
  _preload_modules = void 0;
  _rawDebug = void 0;
  _startProfilerIdleNotifier = void 0;
  _stopProfilerIdleNotifier = void 0;
  _tickCallback = void 0;
  _disconnect = void 0;
  _handleQueue = void 0;
  _pendingMessage = void 0;
  _channel = void 0;
  _send = void 0;
  _linkedBinding = void 0;
};

// node_modules/@cloudflare/unenv-preset/dist/runtime/node/process.mjs
var globalProcess = globalThis["process"];
var getBuiltinModule = globalProcess.getBuiltinModule;
var workerdProcess = getBuiltinModule("node:process");
var unenvProcess = new Process({
  env: globalProcess.env,
  hrtime,
  // `nextTick` is available from workerd process v1
  nextTick: workerdProcess.nextTick
});
var { exit, features, platform } = workerdProcess;
var {
  _channel,
  _debugEnd,
  _debugProcess,
  _disconnect,
  _events,
  _eventsCount,
  _exiting,
  _fatalException,
  _getActiveHandles,
  _getActiveRequests,
  _handleQueue,
  _kill,
  _linkedBinding,
  _maxListeners,
  _pendingMessage,
  _preload_modules,
  _rawDebug,
  _send,
  _startProfilerIdleNotifier,
  _stopProfilerIdleNotifier,
  _tickCallback,
  abort,
  addListener,
  allowedNodeEnvironmentFlags,
  arch,
  argv,
  argv0,
  assert: assert2,
  availableMemory,
  binding,
  channel,
  chdir,
  config,
  connected,
  constrainedMemory,
  cpuUsage,
  cwd,
  debugPort,
  disconnect,
  dlopen,
  domain,
  emit,
  emitWarning,
  env,
  eventNames,
  execArgv,
  execPath,
  exitCode,
  finalization,
  getActiveResourcesInfo,
  getegid,
  geteuid,
  getgid,
  getgroups,
  getMaxListeners,
  getuid,
  hasUncaughtExceptionCaptureCallback,
  hrtime: hrtime3,
  initgroups,
  kill,
  listenerCount,
  listeners,
  loadEnvFile,
  mainModule,
  memoryUsage,
  moduleLoadList,
  nextTick,
  off,
  on,
  once,
  openStdin,
  permission,
  pid,
  ppid,
  prependListener,
  prependOnceListener,
  rawListeners,
  reallyExit,
  ref,
  release,
  removeAllListeners,
  removeListener,
  report,
  resourceUsage,
  send,
  setegid,
  seteuid,
  setgid,
  setgroups,
  setMaxListeners,
  setSourceMapsEnabled,
  setuid,
  setUncaughtExceptionCaptureCallback,
  sourceMapsEnabled,
  stderr,
  stdin,
  stdout,
  throwDeprecation,
  title,
  traceDeprecation,
  umask,
  unref,
  uptime,
  version,
  versions
} = unenvProcess;
var _process = {
  abort,
  addListener,
  allowedNodeEnvironmentFlags,
  hasUncaughtExceptionCaptureCallback,
  setUncaughtExceptionCaptureCallback,
  loadEnvFile,
  sourceMapsEnabled,
  arch,
  argv,
  argv0,
  chdir,
  config,
  connected,
  constrainedMemory,
  availableMemory,
  cpuUsage,
  cwd,
  debugPort,
  dlopen,
  disconnect,
  emit,
  emitWarning,
  env,
  eventNames,
  execArgv,
  execPath,
  exit,
  finalization,
  features,
  getBuiltinModule,
  getActiveResourcesInfo,
  getMaxListeners,
  hrtime: hrtime3,
  kill,
  listeners,
  listenerCount,
  memoryUsage,
  nextTick,
  on,
  off,
  once,
  pid,
  platform,
  ppid,
  prependListener,
  prependOnceListener,
  rawListeners,
  release,
  removeAllListeners,
  removeListener,
  report,
  resourceUsage,
  setMaxListeners,
  setSourceMapsEnabled,
  stderr,
  stdin,
  stdout,
  title,
  throwDeprecation,
  traceDeprecation,
  umask,
  uptime,
  version,
  versions,
  // @ts-expect-error old API
  domain,
  initgroups,
  moduleLoadList,
  reallyExit,
  openStdin,
  assert: assert2,
  binding,
  send,
  exitCode,
  channel,
  getegid,
  geteuid,
  getgid,
  getgroups,
  getuid,
  setegid,
  seteuid,
  setgid,
  setgroups,
  setuid,
  permission,
  mainModule,
  _events,
  _eventsCount,
  _exiting,
  _maxListeners,
  _debugEnd,
  _debugProcess,
  _fatalException,
  _getActiveHandles,
  _getActiveRequests,
  _kill,
  _preload_modules,
  _rawDebug,
  _startProfilerIdleNotifier,
  _stopProfilerIdleNotifier,
  _tickCallback,
  _disconnect,
  _handleQueue,
  _pendingMessage,
  _channel,
  _send,
  _linkedBinding
};
var process_default = _process;

// node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-process
globalThis.process = process_default;

// src/d1.ts
var JSON_COLUMNS = /* @__PURE__ */ new Set(["parent_ids", "conditions", "action", "result", "details", "key_points", "topics", "entities", "action_items"]);
var TABLES = /* @__PURE__ */ new Set([
  "connected_google_accounts",
  "drive_files",
  "sharing_requests",
  "permission_records",
  "sharing_collections",
  "collection_files",
  "collection_members",
  "automation_rules",
  "automation_executions",
  "scheduled_access_actions",
  "application_notifications",
  "audit_logs",
  "owner_sessions",
  "owner_access_events",
  "drive_sync_states",
  "ai_document_insights",
  "ai_jobs"
]);
function parsePath(path) {
  const [tablePart, queryString = ""] = path.split("?");
  const table3 = tablePart.split("/")[0];
  if (!TABLES.has(table3)) throw new Error(`Unsupported D1 table: ${table3}`);
  return { table: table3, params: new URLSearchParams(queryString) };
}
__name(parsePath, "parsePath");
function jsonValue(value) {
  return value === void 0 ? null : value;
}
__name(jsonValue, "jsonValue");
function encodeValue(column, value) {
  if (JSON_COLUMNS.has(column) && value !== null && typeof value === "object") return JSON.stringify(value);
  if (Array.isArray(value)) return JSON.stringify(value);
  if (typeof value === "boolean") return value ? 1 : 0;
  return value;
}
__name(encodeValue, "encodeValue");
function decodeRows(rows) {
  return rows.map((row) => {
    if (!row || typeof row !== "object") return row;
    const copy = { ...row };
    for (const column of JSON_COLUMNS) {
      if (typeof copy[column] === "string") {
        try {
          copy[column] = JSON.parse(copy[column]);
        } catch {
        }
      }
    }
    for (const column of ["enabled", "preview_only", "is_folder", "trashed"]) {
      if (copy[column] === 0 || copy[column] === 1) copy[column] = Boolean(copy[column]);
    }
    return copy;
  });
}
__name(decodeRows, "decodeRows");
function parseFilter(value) {
  if (value.startsWith("eq.")) return { op: "=", value: value.slice(3) };
  if (value.startsWith("gte.")) return { op: ">=", value: value.slice(4) };
  if (value.startsWith("lte.")) return { op: "<=", value: value.slice(4) };
  if (value.startsWith("gt.")) return { op: ">", value: value.slice(3) };
  if (value.startsWith("lt.")) return { op: "<", value: value.slice(3) };
  if (value.startsWith("is.")) return { op: value.slice(3) === "null" ? "IS NULL" : "IS NOT NULL", value: null };
  if (value.startsWith("in.(") && value.endsWith(")")) return { op: "IN", value: value.slice(4, -1).split(",") };
  return null;
}
__name(parseFilter, "parseFilter");
function sqlValue(column, value) {
  if (value === "null") return null;
  if (value === "true") return 1;
  if (value === "false") return 0;
  return encodeValue(column, value);
}
__name(sqlValue, "sqlValue");
function whereClause(params) {
  const clauses = [];
  const values = [];
  for (const [column, raw] of params.entries()) {
    if (["select", "order", "limit", "offset", "on_conflict"].includes(column)) continue;
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(column)) continue;
    const filter = parseFilter(raw);
    if (!filter) continue;
    if (filter.op === "IS NULL" || filter.op === "IS NOT NULL") clauses.push(`${column} ${filter.op}`);
    else if (filter.op === "IN") {
      const items = filter.value;
      clauses.push(`${column} IN (${items.map(() => "?").join(",")})`);
      values.push(...items.map((item) => sqlValue(column, item)));
    } else {
      clauses.push(`${column} ${filter.op} ?`);
      values.push(sqlValue(column, filter.value));
    }
  }
  return { sql: clauses.length ? ` WHERE ${clauses.join(" AND ")}` : "", values };
}
__name(whereClause, "whereClause");
async function selectRows(env2, table3, params) {
  const selection = params.get("select") || "*";
  const columns = selection === "*" ? "*" : selection.split(",").filter((column) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(column)).join(",") || "*";
  const where = whereClause(params);
  let sql = `SELECT ${columns} FROM ${table3}${where.sql}`;
  const order = params.get("order");
  if (order) {
    const orderParts = order.split(",").map((part) => {
      const [column, direction = "asc"] = part.split(".");
      return /^[A-Za-z_][A-Za-z0-9_]*$/.test(column) ? `${column} ${direction.toLowerCase() === "desc" ? "DESC" : "ASC"}` : "";
    }).filter(Boolean);
    if (orderParts.length) sql += ` ORDER BY ${orderParts.join(",")}`;
  }
  const limit = Number(params.get("limit"));
  const offset = Number(params.get("offset"));
  if (Number.isFinite(limit) && limit > 0) {
    sql += " LIMIT ?";
    where.values.push(Math.floor(limit));
  }
  if (Number.isFinite(offset) && offset >= 0) {
    if (!Number.isFinite(limit) || limit <= 0) sql += " LIMIT -1";
    sql += " OFFSET ?";
    where.values.push(Math.floor(offset));
  }
  const result = await env2.DB.prepare(sql).bind(...where.values).all();
  return decodeRows(result.results || []);
}
__name(selectRows, "selectRows");
async function db(env2, path, init = {}) {
  const { table: table3, params } = parsePath(path);
  const method = (init.method || "GET").toUpperCase();
  if (method === "GET") return await selectRows(env2, table3, params);
  const rawBody = init.body ? JSON.parse(String(init.body)) : {};
  const records = Array.isArray(rawBody) ? rawBody : [rawBody];
  const prefer = init.headers instanceof Headers ? init.headers.get("Prefer") || "" : String(init.headers?.Prefer || "");
  const conflict = params.get("on_conflict")?.split(",").filter((column) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(column)) || [];
  if (method === "POST") {
    for (const record of records) {
      const entries = Object.entries(record).filter(([column]) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(column));
      if (!entries.length) continue;
      const columns = entries.map(([column]) => column);
      const values = entries.map(([column, value]) => encodeValue(column, jsonValue(value)));
      const placeholders = columns.map(() => "?").join(",");
      let sql = `INSERT INTO ${table3} (${columns.join(",")}) VALUES (${placeholders})`;
      if (conflict.length) {
        if (prefer.includes("ignore-duplicates")) sql += " ON CONFLICT DO NOTHING";
        else sql += ` ON CONFLICT (${conflict.join(",")}) DO UPDATE SET ${columns.filter((column) => !conflict.includes(column)).map((column) => `${column}=excluded.${column}`).join(",") || `${conflict[0]}=excluded.${conflict[0]}`}`;
      }
      await env2.DB.prepare(sql).bind(...values).run();
    }
    if (prefer.includes("return=representation")) {
      const first = records[0] || {};
      const query = new URLSearchParams();
      for (const column of conflict.length ? conflict : Object.keys(first)) if (first[column] !== void 0) query.set(column, `eq.${String(first[column])}`);
      return await selectRows(env2, table3, query);
    }
    return [];
  }
  if (method === "PATCH") {
    const entries = Object.entries(records[0] || {}).filter(([column]) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(column));
    if (entries.length) {
      const where = whereClause(params);
      const sql = `UPDATE ${table3} SET ${entries.map(([column]) => `${column}=?`).join(",")}${where.sql}`;
      await env2.DB.prepare(sql).bind(...entries.map(([column, value]) => encodeValue(column, value)), ...where.values).run();
    }
    if (prefer.includes("return=representation")) return await selectRows(env2, table3, params);
    return [];
  }
  if (method === "DELETE") {
    const where = whereClause(params);
    await env2.DB.prepare(`DELETE FROM ${table3}${where.sql}`).bind(...where.values).run();
    return [];
  }
  throw new Error(`Unsupported database method: ${method}`);
}
__name(db, "db");

// src/crypto.ts
var enc = new TextEncoder();
var dec = new TextDecoder();
function fromB64(value) {
  const binary = atob(value);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}
__name(fromB64, "fromB64");
function toB64(bytes) {
  let s = "";
  bytes.forEach((b) => s += String.fromCharCode(b));
  return btoa(s);
}
__name(toB64, "toB64");
async function aesKey(secret) {
  const raw = await crypto.subtle.digest("SHA-256", enc.encode(secret));
  return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
}
__name(aesKey, "aesKey");
async function encryptSecret(value, secret) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await aesKey(secret), enc.encode(value));
  return `v1.${toB64(iv)}.${toB64(new Uint8Array(cipher))}`;
}
__name(encryptSecret, "encryptSecret");
async function decryptSecret(value, secret) {
  const [version2, iv, cipher] = value.split(".");
  if (version2 !== "v1" || !iv || !cipher) throw new Error("Unsupported encrypted secret format.");
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: fromB64(iv) }, await aesKey(secret), fromB64(cipher));
  return dec.decode(plain);
}
__name(decryptSecret, "decryptSecret");
async function hmac(value, secret) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(value));
  return toB64(new Uint8Array(sig));
}
__name(hmac, "hmac");
async function safeEqual(a, b) {
  const aa = enc.encode(a), bb = enc.encode(b);
  if (aa.length !== bb.length) return false;
  let diff = 0;
  for (let i = 0; i < aa.length; i++) diff |= aa[i] ^ bb[i];
  return diff === 0;
}
__name(safeEqual, "safeEqual");

// src/google.ts
var DRIVE_SCOPE = "https://www.googleapis.com/auth/drive";
var GMAIL_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";
function googleAuthUrl(env2, state) {
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({
    client_id: env2.GOOGLE_CLIENT_ID,
    redirect_uri: env2.GOOGLE_REDIRECT_URI,
    response_type: "code",
    scope: `openid email profile ${DRIVE_SCOPE} ${GMAIL_SCOPE}`,
    access_type: "offline",
    prompt: "consent",
    state
  }).toString();
  return url.toString();
}
__name(googleAuthUrl, "googleAuthUrl");
async function exchangeCode(env2, code) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env2.GOOGLE_CLIENT_ID,
      client_secret: env2.GOOGLE_CLIENT_SECRET,
      redirect_uri: env2.GOOGLE_REDIRECT_URI,
      grant_type: "authorization_code"
    })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(`Google token exchange failed: ${JSON.stringify(data)}`);
  return data;
}
__name(exchangeCode, "exchangeCode");
async function refreshAccessToken(env2, encryptedRefreshToken) {
  const refresh_token = await decryptSecret(encryptedRefreshToken, env2.TOKEN_ENCRYPTION_KEY);
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: env2.GOOGLE_CLIENT_ID, client_secret: env2.GOOGLE_CLIENT_SECRET, refresh_token, grant_type: "refresh_token" })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(`Google token refresh failed: ${JSON.stringify(data)}`);
  return data;
}
__name(refreshAccessToken, "refreshAccessToken");
async function googleApi(accessToken, path, init = {}) {
  const response = await fetch(`https://www.googleapis.com${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json", ...init.headers || {} }
  });
  const body = await response.text();
  if (!response.ok) throw new Error(`Google API ${response.status}: ${body.slice(0, 400)}`);
  return body ? JSON.parse(body) : null;
}
__name(googleApi, "googleApi");
async function googleIdentity(accessToken) {
  return googleApi(accessToken, "/oauth2/v2/userinfo");
}
__name(googleIdentity, "googleIdentity");

// src/ai.ts
var FALLBACK_MODEL = "fallback";
var DEFAULT_MODEL = "llama-3.3-70b-versatile";
var MAX_INPUT = 12e4;
function fallback(input) {
  const title2 = input.name || "Untitled document";
  const mime = input.mimeType || "";
  const wordCount = input.text?.trim() ? input.text.trim().split(/\s+/).length : 0;
  const summary = input.text?.trim() ? `AI enrichment is not configured. The supplied document excerpt contains approximately ${wordCount.toLocaleString()} words.` : `AI enrichment is not configured. This ${mime === "application/pdf" ? "PDF" : "Drive document"} is named \u201C${title2}\u201D.`;
  return {
    language: "unknown",
    document_type: mime === "application/pdf" ? "pdf" : "drive_document",
    title: title2,
    summary,
    key_points: [],
    topics: [],
    entities: [],
    action_items: [],
    confidence: 0
  };
}
__name(fallback, "fallback");
function list(value, max) {
  return Array.isArray(value) ? value.map((item) => String(item).trim()).filter(Boolean).slice(0, max) : [];
}
__name(list, "list");
async function createInsight(env2, input) {
  const apiKey = env2.GROQ_API_KEY?.trim();
  if (!apiKey) return { insight: fallback(input), model: FALLBACK_MODEL, configured: false };
  const model = env2.GROQ_MODEL?.trim() || DEFAULT_MODEL;
  const excerpt = (input.text || "").slice(0, MAX_INPUT);
  const prompt = [
    "Analyze the private Google Drive document metadata and optional extracted text below.",
    "Return only valid JSON with exactly these keys: language, document_type, title, summary, key_points, topics, entities, action_items, confidence.",
    "Do not invent facts. If no text is supplied, classify conservatively from metadata and use a low confidence.",
    `Name: ${input.name}`,
    `MIME type: ${input.mimeType || "unknown"}`,
    `Modified time: ${input.modifiedTime || "unknown"}`,
    excerpt ? `Extracted text:
${excerpt}` : "No text was provided."
  ].join("\n\n");
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      max_tokens: 1400,
      messages: [
        { role: "system", content: "You are a careful private document librarian. Never expose secrets or claim to have read content that was not supplied." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" }
    })
  });
  const body = await response.text();
  if (!response.ok) throw new Error(`Groq request failed (${response.status}).`);
  const payload = JSON.parse(body);
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error("Groq returned no structured content.");
  const parsed = JSON.parse(content);
  const insight = {
    language: String(parsed.language || "unknown").slice(0, 40),
    document_type: String(parsed.document_type || "other").slice(0, 80),
    title: String(parsed.title || input.name).slice(0, 300),
    summary: String(parsed.summary || "No summary returned.").slice(0, 3e3),
    key_points: list(parsed.key_points, 12),
    topics: list(parsed.topics, 20),
    entities: list(parsed.entities, 20),
    action_items: list(parsed.action_items, 12),
    confidence: Math.min(1, Math.max(0, Number(parsed.confidence ?? 0) || 0))
  };
  return { insight, model, configured: true };
}
__name(createInsight, "createInsight");

// src/index.ts
var json = /* @__PURE__ */ __name((data, status = 200) => new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } }), "json");
var cors = /* @__PURE__ */ __name((request, env2) => {
  const origin = request.headers.get("Origin") || "";
  const allowed = origin === env2.APP_BASE_URL;
  return {
    "Access-Control-Allow-Origin": allowed ? origin : "null",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-CSRF-Token",
    "Vary": "Origin"
  };
}, "cors");
function withCors(response, headers) {
  const out = new Response(response.body, response);
  Object.entries(headers).forEach(([k, v]) => out.headers.set(k, v));
  return out;
}
__name(withCors, "withCors");
function cookie(request, name) {
  return (request.headers.get("Cookie") || "").split(";").map((v) => v.trim()).find((v) => v.startsWith(`${name}=`))?.slice(name.length + 1);
}
__name(cookie, "cookie");
async function owner(request, env2) {
  const token = cookie(request, "dcc_session");
  if (!token) return null;
  const [payload, sig] = decodeURIComponent(token).split(".");
  if (!payload || !sig) return null;
  const expected = await hmac(payload, env2.SESSION_SECRET);
  if (!await safeEqual(sig, expected)) return null;
  try {
    const session = JSON.parse(atob(payload));
    if (session.exp < Date.now() || session.email.toLowerCase() !== env2.OWNER_EMAIL?.toLowerCase()) return null;
    if (session.sid) {
      const rows = await db(env2, `owner_sessions?id=eq.${encodeURIComponent(session.sid)}&owner_id=eq.${encodeURIComponent(session.sub)}&revoked_at=is.null&select=id&limit=1`);
      if (!rows[0]) return null;
    }
    return { id: session.sub, email: session.email, sessionId: session.sid };
  } catch {
    return null;
  }
}
__name(owner, "owner");
async function requireOwner(request, env2) {
  const user = await owner(request, env2);
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}
__name(requireOwner, "requireOwner");
async function getAccount(env2, accountId, ownerId) {
  const rows = await db(env2, `connected_google_accounts?id=eq.${encodeURIComponent(accountId)}&owner_id=eq.${encodeURIComponent(ownerId)}&select=*`);
  if (!rows[0]) throw new Error("Account not found or not authorized.");
  return rows[0];
}
__name(getAccount, "getAccount");
async function tokenFor(env2, account) {
  const refreshed = await refreshAccessToken(env2, account.encrypted_refresh_token);
  return refreshed.access_token;
}
__name(tokenFor, "tokenFor");
async function fetchTextForInsight(accessToken, file) {
  const exportable = file.mime_type === "application/vnd.google-apps.document";
  const textLike = ["text/plain", "text/markdown", "text/csv", "application/json"].includes(file.mime_type);
  if (!exportable && !textLike) return "";
  const endpoint = exportable ? `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(file.google_file_id)}/export?mimeType=text/plain` : `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(file.google_file_id)}?alt=media&supportsAllDrives=true`;
  const response = await fetch(endpoint, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!response.ok) throw new Error(`Document text extraction failed (${response.status}).`);
  return (await response.text()).slice(0, 12e4);
}
__name(fetchTextForInsight, "fetchTextForInsight");
async function saveInsight(env2, ownerId, file, insight, contentHash = null) {
  const payload = {
    owner_id: ownerId,
    account_id: file.account_id,
    google_file_id: file.google_file_id,
    model: insight.model,
    content_hash: contentHash,
    ...insight.insight,
    status: "complete",
    error_message: null,
    source_modified_time: file.modified_time,
    updated_at: (/* @__PURE__ */ new Date()).toISOString()
  };
  await db(env2, "ai_document_insights?on_conflict=owner_id,account_id,google_file_id", {
    method: "POST",
    headers: { "Prefer": "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify(payload)
  });
  return payload;
}
__name(saveInsight, "saveInsight");
async function handle(request, env2) {
  const url = new URL(request.url);
  if (request.method === "OPTIONS") return new Response(null, { status: 204 });
  if (url.pathname === "/health") return json({ ok: true, service: "drive-command-center-api" });
  try {
    if (url.pathname === "/api/auth/status" && request.method === "GET") {
      const current = await owner(request, env2);
      return json({ authenticated: Boolean(current), owner_email: current?.email || null });
    }
    if (url.pathname === "/api/auth/google/start" && request.method === "POST") {
      const state = crypto.randomUUID();
      const signed = await hmac(state, env2.SESSION_SECRET);
      const response = json({ url: googleAuthUrl(env2, `${state}.${signed}`) });
      response.headers.append("Set-Cookie", `dcc_oauth_state=${state}.${signed}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`);
      return response;
    }
    if (url.pathname === "/api/auth/google/callback" && request.method === "GET") {
      const state = url.searchParams.get("state") || "";
      const expectedState = cookie(request, "dcc_oauth_state") || "";
      if (!state || state !== expectedState) return json({ error: "Invalid OAuth state." }, 400);
      const [stateValue, signature] = state.split(".");
      if (!stateValue || !signature || !await safeEqual(signature, await hmac(stateValue, env2.SESSION_SECRET))) return json({ error: "Invalid OAuth signature." }, 400);
      const code = url.searchParams.get("code");
      if (!code) return json({ error: "Missing authorization code." }, 400);
      const tokens = await exchangeCode(env2, code);
      if (!tokens.refresh_token) return json({ error: "Google did not return a refresh token. Revoke app access and reconnect with consent." }, 400);
      const identity = await googleIdentity(tokens.access_token);
      const currentOwner = await owner(request, env2);
      if (!currentOwner && identity.email.toLowerCase() !== env2.OWNER_EMAIL.toLowerCase()) {
        const knownOwner = await db(env2, `owner_sessions?email=eq.${encodeURIComponent(env2.OWNER_EMAIL)}&select=owner_id&order=created_at.desc&limit=1`);
        if (knownOwner[0]) await db(env2, "owner_access_events", { method: "POST", headers: { "Prefer": "return=minimal" }, body: JSON.stringify({ owner_id: knownOwner[0].owner_id, session_id: null, event_type: "login_denied", email: identity.email, user_agent: (request.headers.get("User-Agent") || "").slice(0, 240), risk_level: "review", risk_reason: "Google identity did not match the configured owner allowlist" }) });
        return json({ error: "This Google account is not the configured owner. Access is restricted to Dhirendra's allowlisted Google identity." }, 403);
      }
      const ownerId = currentOwner?.id || identity.sub;
      const encrypted = await encryptSecret(tokens.refresh_token, env2.TOKEN_ENCRYPTION_KEY);
      await db(env2, "connected_google_accounts?on_conflict=google_sub", {
        method: "POST",
        headers: { "Prefer": "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify({ owner_id: ownerId, google_sub: identity.sub, google_email: identity.email, display_name: identity.name || null, avatar_url: identity.picture || null, status: "connected", encrypted_refresh_token: encrypted, token_key_version: 1 })
      });
      const headers = new Headers({ Location: `${env2.APP_BASE_URL}/?connected=1`, "Cache-Control": "no-store" });
      if (!currentOwner) {
        const sid = crypto.randomUUID();
        const ip = request.headers.get("CF-Connecting-IP") || "unknown";
        const ua = request.headers.get("User-Agent") || "unknown";
        const digest = /* @__PURE__ */ __name(async (value) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)))).map((b) => b.toString(16).padStart(2, "0")).join(""), "digest");
        const prior = await db(env2, `owner_sessions?owner_id=eq.${encodeURIComponent(ownerId)}&select=user_agent_hash,ip_hash&order=created_at.desc&limit=20`);
        const uaHash = await digest(ua), ipHash = await digest(ip);
        const newDevice = !prior.some((x) => x.user_agent_hash === uaHash);
        const newNetwork = !prior.some((x) => x.ip_hash === ipHash);
        await db(env2, "owner_sessions", { method: "POST", headers: { "Prefer": "return=minimal" }, body: JSON.stringify({ id: sid, owner_id: ownerId, email: identity.email, user_agent: ua.slice(0, 240), user_agent_hash: uaHash, ip_hash: ipHash, ip_label: ip === "unknown" ? "Unknown" : "Hashed network identifier", created_at: (/* @__PURE__ */ new Date()).toISOString(), last_seen_at: (/* @__PURE__ */ new Date()).toISOString() }) });
        await db(env2, "owner_access_events", { method: "POST", headers: { "Prefer": "return=minimal" }, body: JSON.stringify({ owner_id: ownerId, session_id: sid, event_type: "login_success", email: identity.email, user_agent: ua.slice(0, 240), risk_level: newDevice || newNetwork ? "review" : "normal", risk_reason: [newDevice ? "New device/browser" : null, newNetwork ? "New network" : null].filter(Boolean).join("; ") || "Previously seen device and network" }) });
        const payload = btoa(JSON.stringify({ sub: ownerId, email: identity.email, exp: Date.now() + 8 * 60 * 60 * 1e3, sid }));
        const sig = await hmac(payload, env2.SESSION_SECRET);
        headers.set("Set-Cookie", `dcc_session=${encodeURIComponent(payload + "." + sig)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=28800`);
      }
      return new Response(null, { status: 302, headers });
    }
    if (url.pathname === "/api/auth/logout" && request.method === "POST") {
      const current = await owner(request, env2);
      if (current?.sessionId) await db(env2, `owner_sessions?id=eq.${encodeURIComponent(current.sessionId)}&owner_id=eq.${encodeURIComponent(current.id)}`, { method: "PATCH", body: JSON.stringify({ revoked_at: (/* @__PURE__ */ new Date()).toISOString() }) });
      if (current) await db(env2, "owner_access_events", { method: "POST", headers: { "Prefer": "return=minimal" }, body: JSON.stringify({ owner_id: current.id, session_id: current.sessionId || null, event_type: "logout", email: current.email, risk_level: "normal", risk_reason: "Owner signed out" }) });
      return new Response(null, { status: 204, headers: { "Set-Cookie": "dcc_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0" } });
    }
    const user = await requireOwner(request, env2);
    if (user.sessionId && request.method !== "OPTIONS") {
      await db(env2, `owner_sessions?id=eq.${encodeURIComponent(user.sessionId)}&owner_id=eq.${encodeURIComponent(user.id)}&revoked_at=is.null`, { method: "PATCH", body: JSON.stringify({ last_seen_at: (/* @__PURE__ */ new Date()).toISOString() }) });
    }
    if (url.pathname === "/api/auth/heartbeat" && request.method === "POST") return json({ ok: true });
    if (url.pathname === "/api/security/overview" && request.method === "GET") {
      const cutoff = new Date(Date.now() - 5 * 6e4).toISOString();
      const sessions = await db(env2, `owner_sessions?owner_id=eq.${encodeURIComponent(user.id)}&revoked_at=is.null&last_seen_at=gte.${encodeURIComponent(cutoff)}&select=id,email,user_agent,ip_label,created_at,last_seen_at&order=last_seen_at.desc`);
      const events = await db(env2, `owner_access_events?owner_id=eq.${encodeURIComponent(user.id)}&select=id,event_type,email,user_agent,risk_level,risk_reason,created_at&order=created_at.desc&limit=50`);
      return json({ active_sessions: sessions.length, current_session_id: user.sessionId || null, sessions, events });
    }
    if (url.pathname === "/api/security/sessions" && request.method === "GET") {
      const sessions = await db(env2, `owner_sessions?owner_id=eq.${encodeURIComponent(user.id)}&select=id,email,user_agent,ip_label,created_at,last_seen_at,revoked_at&order=last_seen_at.desc&limit=100`);
      return json({ sessions });
    }
    const revokeSession = url.pathname.match(/^\/api\/security\/sessions\/([^/]+)\/revoke$/);
    if (revokeSession && request.method === "POST") {
      if (revokeSession[1] === user.sessionId) return json({ error: "Use Sign out on this device to end your current session." }, 400);
      await db(env2, `owner_sessions?id=eq.${encodeURIComponent(revokeSession[1])}&owner_id=eq.${encodeURIComponent(user.id)}&revoked_at=is.null`, { method: "PATCH", body: JSON.stringify({ revoked_at: (/* @__PURE__ */ new Date()).toISOString() }) });
      await db(env2, "owner_access_events", { method: "POST", headers: { "Prefer": "return=minimal" }, body: JSON.stringify({ owner_id: user.id, session_id: revokeSession[1], event_type: "session_revoked", email: user.email, risk_level: "normal", risk_reason: "Session revoked by owner" }) });
      return json({ ok: true });
    }
    if (url.pathname === "/api/accounts" && request.method === "GET") {
      const accounts = await db(env2, `connected_google_accounts?owner_id=eq.${encodeURIComponent(user.id)}&select=id,google_email,display_name,avatar_url,status,last_synced_at,created_at&order=created_at.desc`);
      return json({ accounts: accounts.map((a) => ({ id: a.id, email: a.google_email, display_name: a.display_name, avatar_url: a.avatar_url, status: a.status, last_synced_at: a.last_synced_at, created_at: a.created_at })) });
    }
    if (url.pathname === "/api/drive/files" && request.method === "GET") {
      const limit = Math.min(Number(url.searchParams.get("limit") || 100), 200);
      const rows = await db(env2, `drive_files?owner_id=eq.${encodeURIComponent(user.id)}&select=id,account_id,google_file_id,name,mime_type,size_bytes,modified_time,web_view_link,is_folder&order=modified_time.desc&limit=${limit}`);
      const accounts = await db(env2, `connected_google_accounts?owner_id=eq.${encodeURIComponent(user.id)}&select=id,google_email`);
      const byId = new Map(accounts.map((a) => [a.id, a.google_email]));
      return json({ files: rows.map((f) => ({ id: f.google_file_id, account_id: f.account_id, name: f.name, mime_type: f.mime_type, size_bytes: f.size_bytes, modified_time: f.modified_time, web_view_link: f.web_view_link, is_folder: f.is_folder, account_email: byId.get(f.account_id) })) });
    }
    if (url.pathname === "/api/drive/sync" && request.method === "POST") {
      const body = await request.json();
      const account = await getAccount(env2, body.account_id, user.id);
      const access = await tokenFor(env2, account);
      const existingState = await db(env2, `drive_sync_states?owner_id=eq.${encodeURIComponent(user.id)}&account_id=eq.${encodeURIComponent(account.id)}&select=*&limit=1`);
      const state = existingState[0];
      const effectiveToken = body.reset ? void 0 : body.page_token || state?.page_token || void 0;
      await db(env2, "drive_sync_states?on_conflict=owner_id,account_id", { method: "POST", headers: { "Prefer": "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify({ owner_id: user.id, account_id: account.id, status: "running", page_token: effectiveToken || null, last_error: null, started_at: state?.started_at || (/* @__PURE__ */ new Date()).toISOString(), updated_at: (/* @__PURE__ */ new Date()).toISOString() }) });
      const pageToken = effectiveToken ? `&pageToken=${encodeURIComponent(effectiveToken)}` : "";
      const result = await googleApi(access, `/drive/v3/files?supportsAllDrives=true&pageSize=100&orderBy=modifiedTime%20desc${pageToken}&fields=nextPageToken,files(id,name,mimeType,size,modifiedTime,webViewLink,parents,md5Checksum,owners(emailAddress),trashed)`);
      const rows = (result.files || []).filter((f) => !f.trashed).map((f) => ({ owner_id: user.id, account_id: account.id, google_file_id: f.id, name: f.name, mime_type: f.mimeType, size_bytes: f.size ? Number(f.size) : null, modified_time: f.modifiedTime || null, web_view_link: f.webViewLink || null, parent_ids: f.parents || [], md5_checksum: f.md5Checksum || null, is_folder: f.mimeType === "application/vnd.google-apps.folder" }));
      if (rows.length) await db(env2, "drive_files?on_conflict=account_id,google_file_id", { method: "POST", headers: { "Prefer": "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify(rows) });
      await db(env2, `connected_google_accounts?id=eq.${account.id}&owner_id=eq.${encodeURIComponent(user.id)}`, { method: "PATCH", body: JSON.stringify({ last_synced_at: (/* @__PURE__ */ new Date()).toISOString(), status: "connected" }) });
      await db(env2, `drive_sync_states?owner_id=eq.${encodeURIComponent(user.id)}&account_id=eq.${encodeURIComponent(account.id)}`, { method: "PATCH", body: JSON.stringify({ status: result.nextPageToken ? "paused" : "idle", page_token: result.nextPageToken || null, pages_processed: Number(state?.pages_processed || 0) + 1, files_processed: Number(state?.files_processed || 0) + rows.length, completed_at: result.nextPageToken ? null : (/* @__PURE__ */ new Date()).toISOString(), updated_at: (/* @__PURE__ */ new Date()).toISOString() }) });
      return json({ queued: false, synced: rows.length, has_more: Boolean(result.nextPageToken), next_page_token: result.nextPageToken || null });
    }
    if (url.pathname === "/api/drive/sync/status" && request.method === "GET") {
      const states = await db(env2, `drive_sync_states?owner_id=eq.${encodeURIComponent(user.id)}&select=account_id,status,page_token,pages_processed,files_processed,last_error,started_at,completed_at,updated_at&order=updated_at.desc&limit=200`);
      return json({ states });
    }
    if (url.pathname === "/api/ai/insights" && request.method === "GET") {
      const limit = Math.min(Math.max(Number(url.searchParams.get("limit") || 50), 1), 200);
      const accountFilter = url.searchParams.get("account_id");
      const query = `ai_document_insights?owner_id=eq.${encodeURIComponent(user.id)}${accountFilter ? `&account_id=eq.${encodeURIComponent(accountFilter)}` : ""}&select=id,account_id,google_file_id,model,language,document_type,title,summary,key_points,topics,entities,action_items,confidence,status,error_message,source_modified_time,updated_at&order=updated_at.desc&limit=${limit}`;
      const insights = await db(env2, query);
      return json({ insights });
    }
    if (url.pathname === "/api/ai/summarize" && request.method === "POST") {
      const body = await request.json();
      if (!body.account_id || !body.file_id) return json({ error: "Choose a source account and indexed file." }, 400);
      const account = await getAccount(env2, body.account_id, user.id);
      const files = await db(env2, `drive_files?owner_id=eq.${encodeURIComponent(user.id)}&account_id=eq.${encodeURIComponent(account.id)}&google_file_id=eq.${encodeURIComponent(body.file_id)}&select=id,owner_id,account_id,google_file_id,name,mime_type,size_bytes,modified_time,web_view_link,is_folder&limit=1`);
      const file = files[0];
      if (!file || file.is_folder) return json({ error: "Indexed document not found in the selected account." }, 404);
      const previous = await db(env2, `ai_document_insights?owner_id=eq.${encodeURIComponent(user.id)}&account_id=eq.${encodeURIComponent(account.id)}&google_file_id=eq.${encodeURIComponent(file.google_file_id)}&select=id,status,source_modified_time&limit=1`);
      if (!body.force && previous[0]?.status === "complete" && previous[0].source_modified_time === file.modified_time) return json({ insight: previous[0], cached: true });
      const access = await tokenFor(env2, account);
      const text = await fetchTextForInsight(access, file);
      const result = await createInsight(env2, { name: file.name, mimeType: file.mime_type, modifiedTime: file.modified_time, text });
      const insight = await saveInsight(env2, user.id, file, result);
      await audit(env2, user.id, "ai_document_summarized", { account_id: account.id, file_id: file.google_file_id, configured: result.configured, model: result.model });
      return json({ insight, cached: false, configured: result.configured });
    }
    if (url.pathname === "/api/ai/batch" && request.method === "POST") {
      const body = await request.json();
      const limit = Math.min(Math.max(Number(body.limit || 10), 1), 25);
      const accountClause = body.account_id ? `&account_id=eq.${encodeURIComponent(body.account_id)}` : "";
      const files = await db(env2, `drive_files?owner_id=eq.${encodeURIComponent(user.id)}${accountClause}&is_folder=eq.false&select=id,owner_id,account_id,google_file_id,name,mime_type,size_bytes,modified_time,web_view_link,is_folder&order=modified_time.desc&limit=${limit}`);
      const jobId = crypto.randomUUID();
      await db(env2, "ai_jobs", { method: "POST", headers: { "Prefer": "return=minimal" }, body: JSON.stringify({ id: jobId, owner_id: user.id, job_type: "batch_enrich", account_id: body.account_id || null, status: "running", requested_count: files.length, started_at: (/* @__PURE__ */ new Date()).toISOString() }) });
      let completed = 0;
      let lastError = "";
      for (const file of files) {
        try {
          const account = await getAccount(env2, file.account_id, user.id);
          const access = await tokenFor(env2, account);
          const text = await fetchTextForInsight(access, file);
          const result = await createInsight(env2, { name: file.name, mimeType: file.mime_type, modifiedTime: file.modified_time, text });
          await saveInsight(env2, user.id, file, result);
          completed++;
        } catch (error3) {
          lastError = error3 instanceof Error ? error3.message : "AI enrichment failed.";
        }
        await db(env2, `ai_jobs?id=eq.${encodeURIComponent(jobId)}&owner_id=eq.${encodeURIComponent(user.id)}`, { method: "PATCH", body: JSON.stringify({ completed_count: completed, last_error: lastError || null }) });
      }
      await db(env2, `ai_jobs?id=eq.${encodeURIComponent(jobId)}&owner_id=eq.${encodeURIComponent(user.id)}`, { method: "PATCH", body: JSON.stringify({ status: lastError && completed === 0 ? "failed" : "succeeded", completed_count: completed, last_error: lastError || null, completed_at: (/* @__PURE__ */ new Date()).toISOString() }) });
      await audit(env2, user.id, "ai_batch_enrichment_completed", { job_id: jobId, requested: files.length, completed });
      return json({ job_id: jobId, requested: files.length, completed, last_error: lastError || null });
    }
    if (url.pathname === "/api/ai/jobs" && request.method === "GET") {
      const jobs = await db(env2, `ai_jobs?owner_id=eq.${encodeURIComponent(user.id)}&select=id,job_type,account_id,google_file_id,status,requested_count,completed_count,last_error,created_at,started_at,completed_at&order=created_at.desc&limit=50`);
      return json({ jobs });
    }
    if (url.pathname === "/api/requests" && request.method === "GET") {
      const status = url.searchParams.get("status") || "pending";
      const statusFilter = status === "all" ? "status=in.(pending,needs_review)" : `status=eq.${encodeURIComponent(status)}`;
      const rows = await db(env2, `sharing_requests?owner_id=eq.${encodeURIComponent(user.id)}&${statusFilter}&select=*&order=received_at.desc&limit=100`);
      return json({ requests: rows.map((r) => ({ id: r.id, requester_email: r.requester_email, requester_name: r.requester_name, item_name: r.item_name, source_account_email: r.source_account_email, received_at: r.received_at, status: r.status })) });
    }
    const resolveRequestMatch = url.pathname.match(/^\/api\/requests\/([^/]+)\/resolve$/);
    if (resolveRequestMatch && request.method === "POST") {
      const id = resolveRequestMatch[1], body = await request.json();
      if (!body.confirmed || !body.account_id || !body.file_id || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(body.requester_email || "")) return json({ error: "Choose the exact source account, Drive file, requester email, and confirm." }, 400);
      const existing = await db(env2, `sharing_requests?id=eq.${encodeURIComponent(id)}&owner_id=eq.${encodeURIComponent(user.id)}&status=eq.needs_review&select=id&limit=1`);
      if (!existing[0]) return json({ error: "Needs-review request not found." }, 404);
      const account = await getAccount(env2, body.account_id, user.id);
      const file = await db(env2, `drive_files?owner_id=eq.${encodeURIComponent(user.id)}&account_id=eq.${encodeURIComponent(account.id)}&google_file_id=eq.${encodeURIComponent(body.file_id)}&select=name&limit=1`);
      if (!file[0]) return json({ error: "The selected file does not belong to the selected account." }, 404);
      await db(env2, `sharing_requests?id=eq.${encodeURIComponent(id)}&owner_id=eq.${encodeURIComponent(user.id)}`, { method: "PATCH", body: JSON.stringify({ account_id: account.id, google_file_id: body.file_id, requester_email: body.requester_email.toLowerCase(), item_name: file[0].name, status: "pending", classification_reason: "Owner manually verified the exact source account, Drive file, and recipient." }) });
      await audit(env2, user.id, "gmail_request_manually_resolved", { request_id: id, account_id: account.id, file_id: body.file_id, recipient_email: body.requester_email.toLowerCase() });
      return json({ ok: true, status: "pending", file_name: file[0].name });
    }
    const reqMatch = url.pathname.match(/^\/api\/requests\/([^/]+)\/(approve|reject)$/);
    if (reqMatch && request.method === "POST") {
      const id = reqMatch[1], action = reqMatch[2], body = await request.json();
      if (!body.confirmed) return json({ error: "Explicit confirmation required." }, 400);
      const rows = await db(env2, `sharing_requests?id=eq.${encodeURIComponent(id)}&owner_id=eq.${encodeURIComponent(user.id)}&select=*`);
      const r = rows[0];
      if (!r) return json({ error: "Request not found." }, 404);
      if (action === "reject") {
        await db(env2, `sharing_requests?id=eq.${encodeURIComponent(id)}&owner_id=eq.${encodeURIComponent(user.id)}`, { method: "PATCH", body: JSON.stringify({ status: "rejected", reviewed_at: (/* @__PURE__ */ new Date()).toISOString() }) });
        await audit(env2, user.id, "request_rejected", { request_id: id });
        return json({ ok: true, status: "rejected" });
      }
      if (r.status !== "pending" || !r.google_file_id || !r.account_id || !r.requester_email) return json({ error: "This request is not fully verified. Resolve the exact Drive file, source account, and requester before granting access." }, 409);
      const account = await getAccount(env2, r.account_id, user.id);
      const file = await db(env2, `drive_files?owner_id=eq.${encodeURIComponent(user.id)}&account_id=eq.${encodeURIComponent(account.id)}&google_file_id=eq.${encodeURIComponent(r.google_file_id)}&select=name&limit=1`);
      if (!file[0]) return json({ error: "The requested file is not present in the selected account's indexed Drive." }, 404);
      const access = await tokenFor(env2, account);
      const list2 = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(r.google_file_id)}/permissions?supportsAllDrives=true&pageSize=100&fields=permissions(id,type,emailAddress,role)`, { headers: { Authorization: `Bearer ${access}` } });
      if (!list2.ok) return json({ error: `Could not verify existing Drive permissions (${list2.status}).` }, 502);
      const listed = await list2.json();
      const existing = (listed.permissions || []).find((p) => p.type === "user" && p.emailAddress?.toLowerCase() === r.requester_email.toLowerCase());
      let permissionId = existing?.id || null;
      if (!existing) {
        const grant = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(r.google_file_id)}/permissions?supportsAllDrives=true&sendNotificationEmail=true&fields=id,type,emailAddress,role`, { method: "POST", headers: { Authorization: `Bearer ${access}`, "Content-Type": "application/json" }, body: JSON.stringify({ type: "user", role: "reader", emailAddress: r.requester_email }) });
        const permission2 = await grant.json();
        if (!grant.ok) return json({ error: `Google Drive permission grant failed (${grant.status}).` }, 502);
        permissionId = permission2.id || null;
      }
      const prior = await db(env2, `permission_records?owner_id=eq.${encodeURIComponent(user.id)}&account_id=eq.${encodeURIComponent(account.id)}&google_file_id=eq.${encodeURIComponent(r.google_file_id)}&recipient_email=eq.${encodeURIComponent(r.requester_email)}&select=id&limit=1`);
      const record = { permission_id: permissionId, role: existing?.role || "reader", permission_type: "user", source: "gmail_request_review", status: "active", updated_at: (/* @__PURE__ */ new Date()).toISOString() };
      if (prior[0]) await db(env2, `permission_records?id=eq.${encodeURIComponent(prior[0].id)}`, { method: "PATCH", body: JSON.stringify(record) });
      else await db(env2, "permission_records", { method: "POST", headers: { "Prefer": "return=minimal" }, body: JSON.stringify({ owner_id: user.id, account_id: account.id, google_file_id: r.google_file_id, recipient_email: r.requester_email, ...record }) });
      await db(env2, `sharing_requests?id=eq.${encodeURIComponent(id)}&owner_id=eq.${encodeURIComponent(user.id)}`, { method: "PATCH", body: JSON.stringify({ status: "approved", reviewed_at: (/* @__PURE__ */ new Date()).toISOString() }) });
      await audit(env2, user.id, "gmail_share_request_approved", { request_id: id, account_id: account.id, file_id: r.google_file_id, recipient_email: r.requester_email, role: "reader" });
      return json({ ok: true, status: "approved", role: "reader" });
    }
    if (url.pathname === "/api/permissions" && request.method === "GET") {
      const rows = await db(env2, `permission_records?owner_id=eq.${encodeURIComponent(user.id)}&select=id,account_id,google_file_id,permission_id,recipient_email,role,permission_type,expiration_time,source,status,created_at,updated_at&order=updated_at.desc&limit=200`);
      return json({ permissions: rows });
    }
    const revokeMatch = url.pathname.match(/^\/api\/permissions\/([^/]+)\/revoke$/);
    if (revokeMatch && request.method === "POST") {
      const recordId = revokeMatch[1], body = await request.json();
      if (!body.confirmed) return json({ error: "Explicit confirmation is required." }, 400);
      const records = await db(env2, `permission_records?id=eq.${encodeURIComponent(recordId)}&owner_id=eq.${encodeURIComponent(user.id)}&select=*`);
      const record = records[0];
      if (!record) return json({ error: "Permission record not found." }, 404);
      if (!record.permission_id) return json({ error: "This record has no Google permission ID and cannot be revoked from this view." }, 409);
      const account = await getAccount(env2, record.account_id, user.id), access = await tokenFor(env2, account);
      const response = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(record.google_file_id)}/permissions/${encodeURIComponent(record.permission_id)}?supportsAllDrives=true`, { method: "DELETE", headers: { Authorization: `Bearer ${access}` } });
      if (!response.ok && response.status !== 404) return json({ error: `Google Drive revoke failed (${response.status}).` }, 502);
      await db(env2, `permission_records?id=eq.${encodeURIComponent(recordId)}&owner_id=eq.${encodeURIComponent(user.id)}`, { method: "PATCH", body: JSON.stringify({ status: "revoked", updated_at: (/* @__PURE__ */ new Date()).toISOString() }) });
      await audit(env2, user.id, "drive_permission_revoked", { permission_record_id: recordId, file_id: record.google_file_id, recipient_email: record.recipient_email });
      return json({ ok: true, status: "revoked" });
    }
    if (url.pathname === "/api/permissions/bulk-grant" && request.method === "POST") {
      const body = await request.json();
      const refs = Array.isArray(body.file_refs) ? body.file_refs : (body.file_ids || []).map((file_id) => ({ account_id: "", file_id }));
      if (!body.confirmed || !refs.length || refs.length > 50 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(body.recipient_email)) return json({ error: "Choose 1\u201350 files, a valid recipient, and explicitly confirm." }, 400);
      if (!["reader", "commenter", "writer"].includes(body.role)) return json({ error: "Invalid permission role." }, 400);
      const results = [];
      for (const ref2 of refs) {
        const fileId = ref2.file_id;
        const matches = await db(env2, `drive_files?owner_id=eq.${encodeURIComponent(user.id)}&account_id=eq.${encodeURIComponent(ref2.account_id)}&google_file_id=eq.${encodeURIComponent(fileId)}&select=account_id,google_file_id,name&limit=1`);
        if (matches.length !== 1) {
          results.push({ file_id: fileId, ok: false, error: "File not found in the selected source account." });
          continue;
        }
        const account = await getAccount(env2, matches[0].account_id, user.id);
        try {
          const access = await tokenFor(env2, account);
          const list2 = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}/permissions?supportsAllDrives=true&pageSize=100&fields=permissions(id,type,emailAddress,role)`, { headers: { Authorization: `Bearer ${access}` } });
          if (!list2.ok) throw new Error(`Could not verify existing permissions (${list2.status}).`);
          const listed = await list2.json();
          const existing = (listed.permissions || []).find((p) => p.type === "user" && p.emailAddress?.toLowerCase() === body.recipient_email.toLowerCase());
          let permissionId = existing?.id || null;
          if (existing && existing.role !== body.role) {
            const update = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}/permissions/${encodeURIComponent(existing.id)}?supportsAllDrives=true&fields=id`, { method: "PATCH", headers: { Authorization: `Bearer ${access}`, "Content-Type": "application/json" }, body: JSON.stringify({ role: body.role }) });
            if (!update.ok) throw new Error(`Google permission update failed (${update.status}).`);
          } else if (!existing) {
            const response = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}/permissions?supportsAllDrives=true&sendNotificationEmail=true&fields=id,type,emailAddress,role`, { method: "POST", headers: { Authorization: `Bearer ${access}`, "Content-Type": "application/json" }, body: JSON.stringify({ type: "user", role: body.role, emailAddress: body.recipient_email }) });
            const data = await response.json();
            if (!response.ok) throw new Error(`Google permission API ${response.status}`);
            permissionId = data.id || null;
          }
          const prior = await db(env2, `permission_records?owner_id=eq.${encodeURIComponent(user.id)}&account_id=eq.${encodeURIComponent(account.id)}&google_file_id=eq.${encodeURIComponent(fileId)}&recipient_email=eq.${encodeURIComponent(body.recipient_email)}&select=id&limit=1`);
          const record = { permission_id: permissionId, role: body.role, permission_type: "user", source: "command_center", status: "active", updated_at: (/* @__PURE__ */ new Date()).toISOString() };
          if (prior[0]) await db(env2, `permission_records?id=eq.${encodeURIComponent(prior[0].id)}`, { method: "PATCH", body: JSON.stringify(record) });
          else await db(env2, "permission_records", { method: "POST", headers: { "Prefer": "return=minimal" }, body: JSON.stringify({ owner_id: user.id, account_id: account.id, google_file_id: fileId, recipient_email: body.recipient_email, created_at: (/* @__PURE__ */ new Date()).toISOString(), ...record }) });
          await audit(env2, user.id, "drive_permission_granted", { account_id: account.id, file_id: fileId, file_name: matches[0].name, recipient_email: body.recipient_email, role: body.role, updated_existing: Boolean(existing) });
          results.push({ file_id: fileId, ok: true, account_email: account.google_email, updated_existing: Boolean(existing) });
        } catch (e) {
          const msg = e instanceof Error ? e.message : "Permission grant failed";
          await audit(env2, user.id, "drive_permission_grant_failed", { account_id: account.id, file_id: fileId, error: msg });
          results.push({ file_id: fileId, ok: false, error: msg });
        }
      }
      return json({ ok: results.every((r) => r.ok), results, public_links_created: 0 });
    }
    const previewMatch = url.pathname.match(/^\/api\/drive\/files\/([^/]+)\/([^/]+)\/preview$/);
    if (previewMatch && request.method === "GET") {
      const account = await getAccount(env2, previewMatch[1], user.id);
      const fileId = decodeURIComponent(previewMatch[2]);
      const owned = await db(env2, `drive_files?owner_id=eq.${encodeURIComponent(user.id)}&account_id=eq.${encodeURIComponent(account.id)}&google_file_id=eq.${encodeURIComponent(fileId)}&select=mime_type,name&limit=1`);
      if (!owned[0]) return json({ error: "File not found in your indexed Drive." }, 404);
      if (owned[0].mime_type !== "application/pdf" && !owned[0].mime_type.startsWith("application/vnd.google-apps.")) return json({ error: "Preview is available for PDFs and exportable Google documents only." }, 415);
      const access = await tokenFor(env2, account);
      const native = owned[0].mime_type.startsWith("application/vnd.google-apps.");
      const endpoint = native ? `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}/export?mimeType=application/pdf` : `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media&supportsAllDrives=true`;
      const upstream = await fetch(endpoint, { headers: { Authorization: `Bearer ${access}` } });
      if (!upstream.ok) return json({ error: `Google Drive preview failed (${upstream.status}).` }, upstream.status === 404 ? 404 : 502);
      const headers = new Headers({ "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${String(owned[0].name || "document.pdf").replace(/["\r\n]/g, "_")}"`, "Cache-Control": "private, no-store, max-age=0", "X-Content-Type-Options": "nosniff" });
      return new Response(upstream.body, { status: 200, headers });
    }
    if (url.pathname === "/api/audit" && request.method === "GET") {
      const rows = await db(env2, `audit_logs?owner_id=eq.${encodeURIComponent(user.id)}&select=id,action,details,created_at&order=created_at.desc&limit=100`);
      return json({ logs: rows });
    }
    if (url.pathname === "/api/collections" && request.method === "GET") {
      const rows = await db(env2, `sharing_collections?owner_id=eq.${encodeURIComponent(user.id)}&select=id,name,description,status,expires_at,created_at&order=created_at.desc`);
      return json({ collections: rows });
    }
    if (url.pathname === "/api/collections" && request.method === "POST") {
      const body = await request.json();
      const name = String(body.name || "").trim();
      if (!name || name.length > 80) return json({ error: "Collection name is required (maximum 80 characters)." }, 400);
      const rows = await db(env2, "sharing_collections", { method: "POST", headers: { "Prefer": "return=representation" }, body: JSON.stringify({ owner_id: user.id, name, description: String(body.description || "").slice(0, 500) }) });
      await audit(env2, user.id, "collection_created", { collection_id: rows[0]?.id, name });
      return json({ collection: rows[0] }, 201);
    }
    const collectionFileMatch = url.pathname.match(/^\/api\/collections\/([^/]+)\/files$/);
    if (collectionFileMatch && request.method === "POST") {
      const collectionId = collectionFileMatch[1], body = await request.json();
      const collection = await db(env2, `sharing_collections?id=eq.${encodeURIComponent(collectionId)}&owner_id=eq.${encodeURIComponent(user.id)}&select=id`);
      if (!collection[0]) return json({ error: "Collection not found." }, 404);
      if (!Array.isArray(body.files) || !body.files.length || body.files.length > 100) return json({ error: "Choose between 1 and 100 files." }, 400);
      const inserts = [];
      for (const f of body.files) {
        const owned = await db(env2, `drive_files?owner_id=eq.${encodeURIComponent(user.id)}&account_id=eq.${encodeURIComponent(f.account_id)}&google_file_id=eq.${encodeURIComponent(f.file_id)}&select=google_file_id&limit=1`);
        if (!owned[0]) return json({ error: "One or more selected files are not owned by this workspace." }, 403);
        inserts.push({ collection_id: collectionId, account_id: f.account_id, google_file_id: f.file_id });
      }
      await db(env2, "collection_files?on_conflict=collection_id,account_id,google_file_id", { method: "POST", headers: { "Prefer": "resolution=ignore-duplicates,return=minimal" }, body: JSON.stringify(inserts) });
      await audit(env2, user.id, "collection_files_added", { collection_id: collectionId, count: inserts.length });
      return json({ ok: true, added: inserts.length });
    }
    if (url.pathname === "/api/automation/rules" && request.method === "GET") {
      const rows = await db(env2, `automation_rules?owner_id=eq.${encodeURIComponent(user.id)}&select=id,name,enabled,preview_only,conditions,action,created_at,updated_at&order=created_at.desc`);
      return json({ rules: rows });
    }
    if (url.pathname === "/api/automation/rules" && request.method === "POST") {
      const body = await request.json();
      const name = String(body.name || "").trim();
      if (!name || name.length > 80) return json({ error: "Rule name is required (maximum 80 characters)." }, 400);
      const rows = await db(env2, "automation_rules", { method: "POST", headers: { "Prefer": "return=representation" }, body: JSON.stringify({ owner_id: user.id, name, enabled: false, preview_only: true, conditions: body.conditions || {}, action: body.action || {} }) });
      await audit(env2, user.id, "automation_rule_created_preview_only", { rule_id: rows[0]?.id });
      return json({ rule: rows[0] }, 201);
    }
    if (url.pathname === "/api/schedules" && request.method === "GET") {
      const rows = await db(env2, `scheduled_access_actions?owner_id=eq.${encodeURIComponent(user.id)}&select=id,account_id,google_file_id,recipient_email,role,action,run_at,status,attempts,last_error,created_at&order=run_at.asc&limit=200`);
      return json({ schedules: rows });
    }
    if (url.pathname === "/api/schedules" && request.method === "POST") {
      const body = await request.json();
      if (!["reader", "commenter", "writer"].includes(body.role) || !["grant", "revoke"].includes(body.action) || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(body.recipient_email || "")) return json({ error: "Valid recipient, role and action are required." }, 400);
      const runAt = new Date(body.run_at);
      if (!Number.isFinite(runAt.getTime()) || runAt.getTime() < Date.now() + 6e4) return json({ error: "Choose a time at least one minute in the future." }, 400);
      const account = await getAccount(env2, body.account_id, user.id);
      const file = await db(env2, `drive_files?owner_id=eq.${encodeURIComponent(user.id)}&account_id=eq.${encodeURIComponent(account.id)}&google_file_id=eq.${encodeURIComponent(body.file_id)}&select=google_file_id&limit=1`);
      if (!file[0]) return json({ error: "File not found in this account." }, 404);
      const key = crypto.randomUUID();
      const rows = await db(env2, "scheduled_access_actions", { method: "POST", headers: { "Prefer": "return=representation" }, body: JSON.stringify({ owner_id: user.id, account_id: account.id, google_file_id: body.file_id, recipient_email: body.recipient_email, role: body.role, action: body.action, run_at: runAt.toISOString(), idempotency_key: key }) });
      await audit(env2, user.id, "scheduled_access_created", { schedule_id: rows[0]?.id, action: body.action, run_at: runAt.toISOString() });
      return json({ schedule: rows[0], execution_enabled: true, note: "Schedule saved. Cloudflare Cron checks due actions every five minutes. Confirm the Cron trigger is deployed and tested before relying on exact execution time." }, 201);
    }
    const cancelSchedule = url.pathname.match(/^\/api\/schedules\/([^/]+)\/cancel$/);
    if (cancelSchedule && request.method === "POST") {
      const rows = await db(env2, `scheduled_access_actions?id=eq.${encodeURIComponent(cancelSchedule[1])}&owner_id=eq.${encodeURIComponent(user.id)}&status=eq.pending&select=id`);
      if (!rows[0]) return json({ error: "Pending schedule not found." }, 404);
      await db(env2, `scheduled_access_actions?id=eq.${encodeURIComponent(cancelSchedule[1])}&owner_id=eq.${encodeURIComponent(user.id)}`, { method: "PATCH", body: JSON.stringify({ status: "cancelled" }) });
      await audit(env2, user.id, "scheduled_access_cancelled", { schedule_id: cancelSchedule[1] });
      return json({ ok: true });
    }
    if (url.pathname === "/api/gmail/sync" && request.method === "POST") {
      const body = await request.json();
      const account = await getAccount(env2, body.account_id, user.id), access = await tokenFor(env2, account);
      const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages?q=" + encodeURIComponent('newer_than:30d (subject:shared OR "requested access" OR "share request")') + "&maxResults=50", { headers: { Authorization: `Bearer ${access}` } });
      if (!response.ok) return json({ error: `Gmail sync failed (${response.status}).` }, 502);
      const data = await response.json();
      let imported = 0;
      for (const m of data.messages || []) {
        const detailRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(m.id)}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`, { headers: { Authorization: `Bearer ${access}` } });
        if (!detailRes.ok) continue;
        const detail = await detailRes.json();
        const headers = detail.payload?.headers || [];
        const from = headers.find((h) => h.name?.toLowerCase() === "from")?.value || "";
        const subject = headers.find((h) => h.name?.toLowerCase() === "subject")?.value || "Google Drive sharing notification";
        const email = (from.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i) || [])[0] || null;
        await db(env2, "sharing_requests?on_conflict=account_id,gmail_message_id", { method: "POST", headers: { "Prefer": "resolution=ignore-duplicates,return=minimal" }, body: JSON.stringify({ owner_id: user.id, account_id: account.id, gmail_message_id: m.id, requester_email: email, requester_name: from.split("<")[0].replace(/["']/g, "").trim() || null, item_name: subject, source_account_email: account.google_email, status: "needs_review", classification_reason: "Imported from Gmail metadata; file identity and intent require owner verification." }) });
        imported++;
      }
      await audit(env2, user.id, "gmail_requests_synced", { account_id: account.id, imported });
      return json({ ok: true, imported, requires_manual_review: true });
    }
    return json({ error: "Not found." }, 404);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unexpected error";
    return json({ error: message === "UNAUTHORIZED" ? "Authentication required." : message }, message === "UNAUTHORIZED" ? 401 : 500);
  }
}
__name(handle, "handle");
async function audit(env2, ownerId, action, details) {
  await db(env2, "audit_logs", { method: "POST", headers: { "Prefer": "return=minimal" }, body: JSON.stringify({ owner_id: ownerId, action, details }) });
}
__name(audit, "audit");
var index_default = {
  async fetch(request, env2) {
    const headers = cors(request, env2);
    const response = await handle(request, env2);
    return withCors(response, headers);
  },
  async scheduled(_event, env2, ctx) {
    ctx.waitUntil(runDueSchedules(env2));
  }
};
async function runDueSchedules(env2) {
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const staleBefore = new Date(Date.now() - 15 * 6e4).toISOString();
  const stale = await db(env2, `scheduled_access_actions?status=eq.running&run_at=lt.${encodeURIComponent(staleBefore)}&select=id,attempts&limit=20`);
  for (const item of stale || []) await db(env2, `scheduled_access_actions?id=eq.${encodeURIComponent(item.id)}&status=eq.running`, { method: "PATCH", body: JSON.stringify({ status: Number(item.attempts || 0) < 3 ? "pending" : "failed", run_at: now, last_error: "Recovered stale running job after worker interruption." }) });
  const due = await db(env2, `scheduled_access_actions?status=eq.pending&run_at=lte.${encodeURIComponent(now)}&select=*&order=run_at.asc&limit=20`);
  await Promise.all((due || []).map(async (job) => {
    const claimed = await db(env2, `scheduled_access_actions?id=eq.${encodeURIComponent(job.id)}&status=eq.pending&run_at=lte.${encodeURIComponent(now)}&select=*`, { method: "PATCH", headers: { "Prefer": "return=representation" }, body: JSON.stringify({ status: "running", attempts: Number(job.attempts || 0) + 1, last_error: null }) });
    if (!claimed?.length) return;
    const current = claimed[0];
    try {
      const account = await getAccount(env2, current.account_id, current.owner_id);
      const access = await tokenFor(env2, account);
      const listResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(current.google_file_id)}/permissions?supportsAllDrives=true&pageSize=100&fields=permissions(id,type,emailAddress,role)`, { headers: { Authorization: `Bearer ${access}` } });
      if (!listResponse.ok) throw new Error(`Permission lookup failed (${listResponse.status}).`);
      const listed = await listResponse.json();
      const existing = (listed.permissions || []).find((p) => p.type === "user" && p.emailAddress?.toLowerCase() === String(current.recipient_email).toLowerCase());
      let permissionId = existing?.id || null;
      if (current.action === "grant") {
        if (existing && existing.role !== current.role) {
          const update = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(current.google_file_id)}/permissions/${encodeURIComponent(existing.id)}?supportsAllDrives=true&fields=id`, { method: "PATCH", headers: { Authorization: `Bearer ${access}`, "Content-Type": "application/json" }, body: JSON.stringify({ role: current.role }) });
          if (!update.ok) throw new Error(`Permission update failed (${update.status}).`);
        } else if (!existing) {
          const grant = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(current.google_file_id)}/permissions?supportsAllDrives=true&sendNotificationEmail=true&fields=id`, { method: "POST", headers: { Authorization: `Bearer ${access}`, "Content-Type": "application/json" }, body: JSON.stringify({ type: "user", role: current.role, emailAddress: current.recipient_email }) });
          const result = await grant.json();
          if (!grant.ok) throw new Error(`Permission grant failed (${grant.status}).`);
          permissionId = result.id || null;
        }
        const prior = await db(env2, `permission_records?owner_id=eq.${encodeURIComponent(current.owner_id)}&account_id=eq.${encodeURIComponent(current.account_id)}&google_file_id=eq.${encodeURIComponent(current.google_file_id)}&recipient_email=eq.${encodeURIComponent(current.recipient_email)}&select=id&limit=1`);
        if (prior[0]) await db(env2, `permission_records?id=eq.${encodeURIComponent(prior[0].id)}`, { method: "PATCH", body: JSON.stringify({ permission_id: permissionId, role: current.role, status: "active", updated_at: (/* @__PURE__ */ new Date()).toISOString(), source: "scheduled_access" }) });
        else await db(env2, "permission_records", { method: "POST", headers: { "Prefer": "return=minimal" }, body: JSON.stringify({ owner_id: current.owner_id, account_id: current.account_id, google_file_id: current.google_file_id, permission_id: permissionId, recipient_email: current.recipient_email, role: current.role, permission_type: "user", source: "scheduled_access", status: "active" }) });
      } else {
        if (existing) {
          const revoke = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(current.google_file_id)}/permissions/${encodeURIComponent(existing.id)}?supportsAllDrives=true`, { method: "DELETE", headers: { Authorization: `Bearer ${access}` } });
          if (!revoke.ok && revoke.status !== 404) throw new Error(`Permission revoke failed (${revoke.status}).`);
        }
        await db(env2, `permission_records?owner_id=eq.${encodeURIComponent(current.owner_id)}&account_id=eq.${encodeURIComponent(current.account_id)}&google_file_id=eq.${encodeURIComponent(current.google_file_id)}&recipient_email=eq.${encodeURIComponent(current.recipient_email)}`, { method: "PATCH", body: JSON.stringify({ status: "revoked", updated_at: (/* @__PURE__ */ new Date()).toISOString() }) });
      }
      await db(env2, `scheduled_access_actions?id=eq.${encodeURIComponent(current.id)}&status=eq.running`, { method: "PATCH", body: JSON.stringify({ status: "succeeded", last_error: null }) });
      await audit(env2, current.owner_id, `scheduled_permission_${current.action}`, { schedule_id: current.id, account_id: current.account_id, file_id: current.google_file_id, recipient_email: current.recipient_email, role: current.role });
    } catch (error3) {
      const message = error3 instanceof Error ? error3.message : "Scheduled permission action failed.";
      const attempts = Number(current.attempts || 1);
      const retry = attempts < 3;
      const retryAt = new Date(Date.now() + Math.min(60, 5 * attempts) * 6e4).toISOString();
      await db(env2, `scheduled_access_actions?id=eq.${encodeURIComponent(current.id)}&status=eq.running`, { method: "PATCH", body: JSON.stringify({ status: retry ? "pending" : "failed", run_at: retry ? retryAt : current.run_at, last_error: message }) });
      await audit(env2, current.owner_id, "scheduled_permission_failed", { schedule_id: current.id, attempts, retry, error: message });
    }
  }));
}
__name(runDueSchedules, "runDueSchedules");
export {
  index_default as default
};
//# sourceMappingURL=index.js.map
