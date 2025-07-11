import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { StickerModule } from './sticker/sticker.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { WordModule } from './word/word.module';
import { LabelModule } from './label/label.module';
import { AdminModule } from './admin/admin.module';
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
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: 'words_wall.db',
      entities: [Sticker, User, Word, Label],
      synchronize: true,
    }),
    StickerModule,
    AuthModule,
    UserModule,
    WordModule,
    LabelModule,
    AdminModule,
  ],
})
export class AppModule {}