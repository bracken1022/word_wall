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
          // Production: Use PostgreSQL
          const url = new URL(databaseUrl);
          return {
            type: 'postgres',
            host: url.hostname,
            port: parseInt(url.port) || 5432,
            username: url.username,
            password: url.password,
            database: url.pathname.slice(1),
            entities: [Sticker, User, Word, Label],
            synchronize: false, // Never use synchronize in production
            ssl: {
              rejectUnauthorized: false,
            },
          };
        } else {
          // Development: Use SQLite
          return {
            type: 'sqlite',
            database: 'words_wall.db',
            entities: [Sticker, User, Word, Label],
            synchronize: true,
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