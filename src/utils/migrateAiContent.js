"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
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
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
var prisma_1 = require("@/app/services/prisma");
var path_1 = require("path");
var fs_1 = require("fs");
// Load JSON dynamically so compiled JS can find it
var jsonPath = path_1.default.resolve(__dirname, '../src/app/services/aiMovieDescriptions.json');
var aiMovieDescriptions = JSON.parse(fs_1.default.readFileSync(jsonPath, 'utf-8'));
// Simple helper to normalize strings for matching
function normalize(str) {
    return str.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}
// Optional: compute simple word overlap percentage
function similarity(a, b) {
    var wordsA = new Set(a.split(' '));
    var wordsB = new Set(b.split(' '));
    var intersection = __spreadArray([], wordsA, true).filter(function (x) { return wordsB.has(x); });
    return intersection.length / Math.max(wordsA.size, wordsB.size);
}
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var allMovies, _loop_1, _i, aiMovieDescriptions_1, movieData;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, prisma_1.prisma.movie.findMany({
                        select: { id: true, title: true, slug: true },
                    })];
                case 1:
                    allMovies = _a.sent();
                    _loop_1 = function (movieData) {
                        var slug, aiDescription, normalizedSlug, matchedMovie;
                        return __generator(this, function (_b) {
                            switch (_b.label) {
                                case 0:
                                    slug = movieData.slug, aiDescription = movieData.aiDescription;
                                    normalizedSlug = normalize(slug);
                                    matchedMovie = allMovies.find(function (m) {
                                        var normalizedTitle = normalize(m.title);
                                        return normalizedTitle === normalizedSlug || similarity(normalizedTitle, normalizedSlug) >= 0.7;
                                    });
                                    if (!matchedMovie) {
                                        console.warn("No matching movie found for slug: \"".concat(slug, "\""));
                                        return [2 /*return*/, "continue"];
                                    }
                                    // Upsert AI description: update if exists, create if not
                                    return [4 /*yield*/, prisma_1.prisma.aiDescription.upsert({
                                            where: { movieId: matchedMovie.id },
                                            update: __assign({}, aiDescription),
                                            create: __assign(__assign({}, aiDescription), { movieId: matchedMovie.id }),
                                        })];
                                case 1:
                                    // Upsert AI description: update if exists, create if not
                                    _b.sent();
                                    console.log("Upserted AI description for movie: ".concat(matchedMovie.title));
                                    return [2 /*return*/];
                            }
                        });
                    };
                    _i = 0, aiMovieDescriptions_1 = aiMovieDescriptions;
                    _a.label = 2;
                case 2:
                    if (!(_i < aiMovieDescriptions_1.length)) return [3 /*break*/, 5];
                    movieData = aiMovieDescriptions_1[_i];
                    return [5 /*yield**/, _loop_1(movieData)];
                case 3:
                    _a.sent();
                    _a.label = 4;
                case 4:
                    _i++;
                    return [3 /*break*/, 2];
                case 5: return [2 /*return*/];
            }
        });
    });
}
main()
    .catch(function (e) {
    console.error(e);
    process.exit(1);
})
    .finally(function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, prisma_1.prisma.$disconnect()];
            case 1:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); });
