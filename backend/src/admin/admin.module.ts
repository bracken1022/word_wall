import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { Word } from '../word/word.entity';
import { WordModule } from '../word/word.module';
import { UserModule } from '../user/user.module';
import * as multer from 'multer';

@Module({
  imports: [
    TypeOrmModule.forFeature([Word]),
    MulterModule.register({
      storage: multer.memoryStorage(),
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
      },
    }),
    WordModule,
    UserModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}