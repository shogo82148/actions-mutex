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
exports.sleep = exports.random = exports.mkdtemp = void 0;
const fs_1 = require("fs");
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
const tmp = os.tmpdir();
async function mkdtemp() {
    return fs_1.promises.mkdtemp(`${tmp}${path.sep}actions-mutex-`);
}
exports.mkdtemp = mkdtemp;
// return random string
async function random() {
    return new Promise(function (resolve, reject) {
        crypto.randomBytes(16, (err, buf) => {
            if (err) {
                reject(err);
            }
            resolve(buf.toString('hex'));
        });
    });
}
exports.random = random;
async function sleep(waitSec) {
    return new Promise(function (resolve) {
        setTimeout(() => resolve(), waitSec * 1000);
    });
}
exports.sleep = sleep;
