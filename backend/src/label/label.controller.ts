import { Controller, Get, Put, Delete, Body, Param, Request, UseGuards, ParseIntPipe } from '@nestjs/common';
import { LabelService } from './label.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('labels')
@UseGuards(JwtAuthGuard)
export class LabelController {
  constructor(private labelService: LabelService) {}

  @Get()
  findAll(@Request() req: any) {
    return this.labelService.findByUser(req.user.id);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateData: { name: string; color: string },
    @Request() req: any,
  ) {
    return this.labelService.updateLabel(id, updateData.name, updateData.color, req.user.id);
  }

  @Delete(':id')
  delete(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.labelService.deleteLabel(id, req.user.id);
  }
}