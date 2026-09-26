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
exports.UnsubscribeDto = exports.PushSubscriptionDto = void 0;
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
class PushKeysDto {
    p256dh;
    auth;
}
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], PushKeysDto.prototype, "p256dh", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], PushKeysDto.prototype, "auth", void 0);
class PushSubscriptionDto {
    endpoint;
    keys;
    expirationTime;
}
exports.PushSubscriptionDto = PushSubscriptionDto;
__decorate([
    (0, class_validator_1.IsUrl)({ protocols: ['https'], require_tld: false }),
    __metadata("design:type", String)
], PushSubscriptionDto.prototype, "endpoint", void 0);
__decorate([
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => PushKeysDto),
    __metadata("design:type", PushKeysDto)
], PushSubscriptionDto.prototype, "keys", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], PushSubscriptionDto.prototype, "expirationTime", void 0);
class UnsubscribeDto {
    endpoint;
}
exports.UnsubscribeDto = UnsubscribeDto;
__decorate([
    (0, class_validator_1.IsUrl)({ protocols: ['https'], require_tld: false }),
    __metadata("design:type", String)
], UnsubscribeDto.prototype, "endpoint", void 0);
