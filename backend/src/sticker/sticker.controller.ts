import { Controller, Get, Post, Put, Delete, Body, Param, ValidationPipe, UseGuards, Request } from '@nestjs/common';
import { StickerService } from './sticker.service';
import { CreateStickerDto, UpdateStickerDto } from './sticker.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('stickers')
@UseGuards(JwtAuthGuard)
export class StickerController {
  constructor(private readonly stickerService: StickerService) {}

  @Get()
  findAll(@Request() req: any) {
    return this.stickerService.findByUser(req.user.id);
  }

  @Get('label/:labelId')
  findByLabel(@Param('labelId') labelId: string, @Request() req: any) {
    return this.stickerService.findByLabel(+labelId, req.user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.stickerService.findOne(+id, req.user.id);
  }

  @Post()
  create(@Body(ValidationPipe) createStickerDto: CreateStickerDto, @Request() req: any) {
    return this.stickerService.create(createStickerDto, req.user.id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body(ValidationPipe) updateStickerDto: UpdateStickerDto, @Request() req: any) {
    return this.stickerService.update(+id, updateStickerDto, req.user.id);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: any) {
    return this.stickerService.remove(+id, req.user.id);
  }
}