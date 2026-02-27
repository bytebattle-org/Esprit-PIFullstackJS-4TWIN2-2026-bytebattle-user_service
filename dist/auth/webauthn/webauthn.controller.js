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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebAuthnController = void 0;
const common_1 = require("@nestjs/common");
const webauthn_service_1 = require("./webauthn.service");
const auth_service_1 = require("../auth.service");
const jwt_auth_guard_1 = require("../guards/jwt-auth.guard");
let WebAuthnController = class WebAuthnController {
    webAuthnService;
    authService;
    constructor(webAuthnService, authService) {
        this.webAuthnService = webAuthnService;
        this.authService = authService;
    }
    async checkBiometric(email) {
        const hasCredentials = await this.webAuthnService.hasBiometricCredentials(email);
        return { available: hasCredentials };
    }
    async startRegistration(req) {
        const options = await this.webAuthnService.generateRegistrationOptions(req.user.userId);
        return options;
    }
    async verifyRegistration(req, body) {
        return this.webAuthnService.verifyRegistration(req.user.userId, body);
    }
    async startAuthentication(email) {
        const result = await this.webAuthnService.generateAuthenticationOptions(email);
        return result.options;
    }
    async verifyAuthentication(body) {
        const user = await this.webAuthnService.verifyAuthentication(body.email, body.response);
        return this.authService.login(user);
    }
    async removeCredential(req, credentialId) {
        return this.webAuthnService.removeCredential(req.user.userId, credentialId);
    }
};
exports.WebAuthnController = WebAuthnController;
__decorate([
    (0, common_1.Get)('check'),
    __param(0, (0, common_1.Query)('email')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], WebAuthnController.prototype, "checkBiometric", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('register/start'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], WebAuthnController.prototype, "startRegistration", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('register/verify'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], WebAuthnController.prototype, "verifyRegistration", null);
__decorate([
    (0, common_1.Post)('login/start'),
    __param(0, (0, common_1.Body)('email')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], WebAuthnController.prototype, "startAuthentication", null);
__decorate([
    (0, common_1.Post)('login/verify'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], WebAuthnController.prototype, "verifyAuthentication", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('remove'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)('credentialId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], WebAuthnController.prototype, "removeCredential", null);
exports.WebAuthnController = WebAuthnController = __decorate([
    (0, common_1.Controller)('auth/webauthn'),
    __metadata("design:paramtypes", [webauthn_service_1.WebAuthnService,
        auth_service_1.AuthService])
], WebAuthnController);
//# sourceMappingURL=webauthn.controller.js.map