import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Configure CORS with specific origins
  app.enableCors({
    origin: [
      'http://localhost:3000',
      'https://localhost:3000',
      'https://words-wall.com',
      'https://www.words-wall.com',
      'https://d1pf5rn4tocpfn.cloudfront.net',
      'https://words-wall-production-frontend-1752549860757.s3-website-ap-southeast-1.amazonaws.com'
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    optionsSuccessStatus: 200
  });
  
  const port = process.env.PORT || 3001;
  await app.listen(port, '0.0.0.0');
  console.log(`Application is running on: http://localhost:${port}`);
  // Updated: Deploy with wordEntity fixes and modal flip improvements
}
bootstrap();