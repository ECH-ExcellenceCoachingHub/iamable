"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const app_module_1 = require("./app.module");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.useBodyParser('json', { limit: '5mb' });
    app.use((0, helmet_1.default)());
    app.use((0, compression_1.default)());
    const allowedOrigins = process.env.FRONTEND_URL
        ? process.env.FRONTEND_URL.split(',').map((origin) => origin.trim())
        : ['http://localhost:3000'];
    app.enableCors({
        origin: (origin, callback) => {
            if (!origin)
                return callback(null, true);
            if (allowedOrigins.includes(origin)) {
                callback(null, true);
            }
            else {
                callback(new Error('Not allowed by CORS'));
            }
        },
        credentials: true,
    });
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
    }));
    app.setGlobalPrefix('api');
    const config = new swagger_1.DocumentBuilder()
        .setTitle('Am Able API')
        .setDescription('AI-Powered Sign Language Translation Platform')
        .setVersion('1.0')
        .addBearerAuth()
        .build();
    const document = swagger_1.SwaggerModule.createDocument(app, config);
    swagger_1.SwaggerModule.setup('api/docs', app, document);
    await app.listen(process.env.PORT ?? 3001);
    console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();
