import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  const frontendUrl = process.env.FRONTEND_URL;
  const frontendOrigins = frontendUrl?.split(',').map((url) => url.trim());
  app.enableCors(frontendOrigins?.includes('*') ? { origin: true } : { origin: frontendOrigins || true });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
}
bootstrap();
