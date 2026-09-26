"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const ai_controller_1 = require("./ai.controller");
const ai_service_1 = require("./ai.service");
const ai_log_schema_1 = require("./schemas/ai-log.schema");
const ai_training_schema_1 = require("./schemas/ai-training.schema");
const training_sample_schema_1 = require("./schemas/training-sample.schema");
let AiModule = class AiModule {
};
exports.AiModule = AiModule;
exports.AiModule = AiModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([
                { name: ai_log_schema_1.AILog.name, schema: ai_log_schema_1.AILogSchema },
                { name: ai_training_schema_1.AITraining.name, schema: ai_training_schema_1.AITrainingSchema },
                { name: training_sample_schema_1.TrainingSample.name, schema: training_sample_schema_1.TrainingSampleSchema },
            ]),
        ],
        controllers: [ai_controller_1.AiController],
        providers: [ai_service_1.AiService],
        exports: [ai_service_1.AiService],
    })
], AiModule);
