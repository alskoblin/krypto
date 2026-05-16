import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { PrismaService } from './infrastructure/database/prisma.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const prismaService = app.get(PrismaService);

  await prismaService.$connect();

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Krypto API')
    .setDescription(
      'REST API для управления пользователями, кошельками, активами, курсами валют, транзакциями, торговыми операциями и TON Sandbox.',
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Введите accessToken, полученный через POST /auth/login',
      },
      'JWT-auth',
    )
    .addTag('App', 'Общая информация о приложении')
    .addTag('Auth', 'Авторизация, обновление токена и текущий пользователь')
    .addTag('Users', 'Пользователи, профили, карты, бюджеты и аналитика')
    .addTag('Wallets', 'Кошельки, балансы, депозиты, покупки и переводы')
    .addTag('Assets', 'Фиатные и криптовалютные активы')
    .addTag('Transactions', 'История финансовых операций')
    .addTag('Trading', 'Покупка и продажа криптовалюты')
    .addTag('Rates', 'Курсы валют и графики курсов')
    .addTag('Blockchain', 'Блокчейн-сети и TON Sandbox')
    .build();

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, swaggerDocument, {
    jsonDocumentUrl: 'docs-json',
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
