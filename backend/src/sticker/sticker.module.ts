import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StickerController } from './sticker.controller';
import { StickerService } from './sticker.service';
import { Sticker } from './sticker.entity';
import { AIModule } from '../ai/ai.module';
import { WordModule } from '../word/word.module';
import { LabelModule } from '../label/label.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Sticker]),
    AIModule,
    WordModule,
    LabelModule,
  ],
  controllers: [StickerController],
  providers: [StickerService],
})
export class StickerModule {}