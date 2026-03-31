"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserSchema = exports.User = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
let User = class User extends mongoose_2.Document {
    username;
    email;
    passwordHash;
    role;
    isBanned;
    provider;
    providerId;
    providerAvatar;
    profile;
    statistics;
    achievements;
    badges;
    isEmailVerified;
    verificationCode;
    verificationCodeExpires;
    passwordResetToken;
    passwordResetExpires;
    refreshToken;
    twoFactorSecret;
    isTwoFactorEnabled;
    twoFactorRecoveryCodes;
    faceIdEnabled;
    faceEmbedding;
    friends;
    friendRequests;
    createdAt;
    updatedAt;
};
exports.User = User;
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], User.prototype, "username", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], User.prototype, "email", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], User.prototype, "passwordHash", void 0);
__decorate([
    (0, mongoose_1.Prop)({ enum: ['user', 'admin'], default: 'user' }),
    __metadata("design:type", String)
], User.prototype, "role", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], User.prototype, "isBanned", void 0);
__decorate([
    (0, mongoose_1.Prop)({ enum: ['local', 'google', 'github'], default: 'local' }),
    __metadata("design:type", String)
], User.prototype, "provider", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], User.prototype, "providerId", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], User.prototype, "providerAvatar", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: {
            avatar: String,
            bio: String,
            preferredLanguages: [String],
        },
        default: {},
    }),
    __metadata("design:type", Object)
], User.prototype, "profile", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: {
            totalPoints: { type: Number, default: 0 },
            level: { type: Number, default: 1 },
            currentStreak: { type: Number, default: 0 },
            xp: { type: Number, default: 0 },
            challengesCompleted: { type: Number, default: 0 },
            successRate: { type: Number, default: 0 },
            totalTimeCoding: { type: Number, default: 0 },
        },
        default: {},
    }),
    __metadata("design:type", Object)
], User.prototype, "statistics", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: [
            {
                id: String,
                name: String,
                unlockedAt: Date,
                rarity: { type: String, enum: ['common', 'rare', 'epic', 'legendary'] },
            },
        ],
        default: [],
    }),
    __metadata("design:type", Array)
], User.prototype, "achievements", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [String], default: [] }),
    __metadata("design:type", Array)
], User.prototype, "badges", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], User.prototype, "isEmailVerified", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], User.prototype, "verificationCode", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", Date)
], User.prototype, "verificationCodeExpires", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], User.prototype, "passwordResetToken", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", Date)
], User.prototype, "passwordResetExpires", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], User.prototype, "refreshToken", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], User.prototype, "twoFactorSecret", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], User.prototype, "isTwoFactorEnabled", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [String], default: [] }),
    __metadata("design:type", Array)
], User.prototype, "twoFactorRecoveryCodes", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], User.prototype, "faceIdEnabled", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [Number], default: [] }),
    __metadata("design:type", Array)
], User.prototype, "faceEmbedding", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [{ type: String, ref: 'User' }], default: [] }),
    __metadata("design:type", Array)
], User.prototype, "friends", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: [
            {
                _id: String,
                from: { type: Object, ref: 'User' },
                createdAt: Date,
            },
        ],
        default: [],
    }),
    __metadata("design:type", Array)
], User.prototype, "friendRequests", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Date, default: Date.now }),
    __metadata("design:type", Date)
], User.prototype, "createdAt", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Date, default: Date.now }),
    __metadata("design:type", Date)
], User.prototype, "updatedAt", void 0);
exports.User = User = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], User);
exports.UserSchema = mongoose_1.SchemaFactory.createForClass(User);
exports.UserSchema.index({ username: 1 }, { unique: true });
exports.UserSchema.index({ email: 1 }, { unique: true });
exports.UserSchema.index({ 'statistics.totalPoints': -1 });
exports.UserSchema.index({ 'statistics.level': -1 });
exports.UserSchema.index({ createdAt: -1 });
//# sourceMappingURL=user.schema.js.map