import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { StickerModule } from './sticker/sticker.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { WordModule } from './word/word.module';
import { LabelModule } from './label/label.module';
import { AdminModule } from './admin/admin.module';
import { HealthModule } from './health/health.module';
import { Sticker } from './sticker/sticker.entity';
import { User } from './user/user.entity';
import { Word } from './word/word.entity';
import { Label } from './label/label.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const isProduction = configService.get('NODE_ENV') === 'production';
        const databaseUrl = configService.get('DATABASE_URL');
        
        if (isProduction && databaseUrl) {
          // Production: Use PostgreSQL with Secrets Manager config
          let dbConfig;
          try {
            // Parse JSON from Secrets Manager
            dbConfig = typeof databaseUrl === 'string' ? JSON.parse(databaseUrl) : databaseUrl;
          } catch (error) {
            console.error('Failed to parse DATABASE_URL from Secrets Manager:', error);
            throw new Error('Invalid DATABASE_URL configuration from Secrets Manager');
          }
          
          return {
            type: 'postgres',
            host: dbConfig.host,
            port: dbConfig.port || 5432,
            username: dbConfig.username,
            password: dbConfig.password,
            database: dbConfig.dbInstanceIdentifier || 'wordswall',
            entities: [Sticker, User, Word, Label],
            synchronize: false, // Never use synchronize in production
            ssl: {
              rejectUnauthorized: false,
            },
            logging: ['error'], // Only log errors in production
          };
        } else {
          // Development: Use SQLite
          return {
            type: 'sqlite',
            database: 'words_wall.db',
            entities: [Sticker, User, Word, Label],
            synchronize: true,
            logging: true, // Enable logging in development
          };
        }
      },
      inject: [ConfigService],
    }),
    StickerModule,
    AuthModule,
    UserModule,
    WordModule,
    LabelModule,
    AdminModule,
    HealthModule,
  ],
})
export class AppModule {}