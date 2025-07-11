import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Label } from './label.entity';
import { LabelService } from './label.service';
import { LabelController } from './label.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Label])],
  providers: [LabelService],
  controllers: [LabelController],
  exports: [LabelService],
})
export class LabelModule {}