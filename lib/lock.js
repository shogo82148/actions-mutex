"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.unlock = exports.lock = void 0;
const core = __importStar(require("@actions/core"));
const exec = __importStar(require("@actions/exec"));
const io = __importStar(require("@actions/io"));
const fs_1 = require("fs");
const path = __importStar(require("path"));
const utils = __importStar(require("./utils"));
const serverUrl = process.env['GITHUB_SERVER_URL'] || 'https://github.com';
class Locker {
    constructor(owner, local, branch, origin, key) {
        this.owner = owner;
        this.local = local;
        this.branch = branch;
        this.origin = origin;
        this.key = key;
    }
    static create(options, state) {
        return __awaiter(this, void 0, void 0, function* () {
            const owner = state ? state.owner : yield utils.random();
            const local = yield utils.mkdtemp();
            const key = options.key;
            const branch = state ? state.branch : options.prefix + options.key;
            let origin = state ? state.origin : options.repository;
            if (/^[^/]+\/[^/]+$/.test(origin)) {
                // it looks that GitHub repository
                origin = `${serverUrl}/${origin}`;
            }
            return new Locker(owner, local, branch, origin, key);
        });
    }
    init(token) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.git('init', this.local);
            yield this.git('config', '--local', 'core.autocrlf', 'false');
            yield this.git('remote', 'add', 'origin', this.origin);
            if (token) {
                // configure authorize header
                const auth = Buffer.from(`x-oauth-basic:${token}`).toString('base64');
                core.setSecret(auth); // make sure it's secret
                yield this.git('config', '--local', `http.${serverUrl}/.extraheader`, `AUTHORIZATION: basic ${auth}`);
            }
        });
    }
    lock(token) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.init(token);
            // generate files
            let data = `# Lock File for actions-mutex

The \`${this.branch}\` branch contains lock file for [actions-mutex](https://github.com/shogo82148/actions-mutex).
DO NOT TOUCH this branch manually.

- Key: ${this.key}
`;
            const currentRepository = process.env['GITHUB_REPOSITORY'];
            const currentRunId = process.env['GITHUB_RUN_ID'];
            if (currentRepository && currentRunId) {
                data += `- Workflow: [Workflow](${serverUrl}/${currentRepository}/actions/runs/${currentRunId})`;
                data += '\n';
            }
            yield fs_1.promises.writeFile(path.join(this.local, 'README.md'), data);
            const state = {
                owner: this.owner,
                origin: this.origin,
                branch: this.branch
            };
            yield fs_1.promises.writeFile(path.join(this.local, 'state.json'), JSON.stringify(state));
            // configure user information
            yield this.git('config', '--local', 'user.name', 'github-actions[bot]');
            yield this.git('config', '--local', 'user.email', '1898282+github-actions[bot]@users.noreply.github.com');
            // commit
            yield this.git('add', '.');
            yield this.git('commit', '-m', 'add lock files');
            // try to lock
            let sleepSec = 1;
            for (;;) {
                const locked = yield this.tryLock();
                if (locked) {
                    break;
                }
                yield utils.sleep(sleepSec + Math.random());
                // exponential back off
                sleepSec *= 2;
                if (sleepSec > 30) {
                    sleepSec = 30;
                }
            }
            yield this.cleanup();
            return state;
        });
    }
    tryLock() {
        return __awaiter(this, void 0, void 0, function* () {
            let stderr = '';
            let code = yield exec.exec('git', ['push', 'origin', `HEAD:${this.branch}`], {
                cwd: this.local,
                ignoreReturnCode: true,
                listeners: {
                    stderr: data => {
                        stderr += data.toString();
                    }
                }
            });
            if (code == 0) {
                return true;
            }
            if (stderr.includes('[rejected]') || stderr.includes('[remote rejected]')) {
                return false;
            }
            throw new Error('failed to git push: ' + code);
        });
    }
    unlock(token) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.init(token);
            yield this.git('fetch', 'origin', this.branch);
            yield this.git('checkout', `origin/${this.branch}`);
            const rawState = yield fs_1.promises.readFile(path.join(this.local, 'state.json'));
            const state = JSON.parse(rawState.toString());
            if (state.owner !== this.owner) {
                // This lock is generated by another instance.
                // ignore it
                return;
            }
            yield this.git('push', '--delete', 'origin', this.branch);
            yield this.cleanup();
        });
    }
    git(...args) {
        return __awaiter(this, void 0, void 0, function* () {
            yield exec.exec('git', args, { cwd: this.local });
        });
    }
    cleanup() {
        return __awaiter(this, void 0, void 0, function* () {
            io.rmRF(this.local);
        });
    }
}
function lock(options) {
    return __awaiter(this, void 0, void 0, function* () {
        const locker = yield Locker.create(options);
        return locker.lock(options.token);
    });
}
exports.lock = lock;
function unlock(options, state) {
    return __awaiter(this, void 0, void 0, function* () {
        const locker = yield Locker.create(options, state);
        return locker.unlock(options.token);
    });
}
exports.unlock = unlock;
