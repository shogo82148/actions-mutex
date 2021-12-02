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
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const lock = __importStar(require("./lock"));
async function run() {
    try {
        core.warning('shogo82148/actions-mutex is no longer maintained. ' +
            'Please consider use official support for limiting concurrency. ' +
            'https://github.com/shogo82148/actions-mutex#official-concurrency-support-on-github-actions');
        const required = {
            required: true
        };
        const token = core.getInput('token', required);
        const key = core.getInput('key', required);
        const repository = core.getInput('repository', required);
        const prefix = core.getInput('prefix', required);
        const state = await lock.lock({
            token,
            key,
            repository,
            prefix
        });
        core.saveState('STATE', JSON.stringify(state));
    }
    catch (e) {
        if (e instanceof Error) {
            core.setFailed(e);
        }
        else {
            core.setFailed(`${e}`);
        }
    }
}
run();