import { Controller, Get, Put, Body, Param, UseGuards, ParseIntPipe } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WordService } from './word.service';

@Controller('words')
@UseGuards(JwtAuthGuard)
export class WordController {
  constructor(private wordService: WordService) {}

  @Get(':id')
  async getWord(@Param('id', ParseIntPipe) id: number) {
    return this.wordService.findById(id);
  }

  @Put(':id')
  async updateWord(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateData: {
      meaning?: string;
      chineseMeaning?: string;
      usage?: string;
      scenarios?: string[];
      pronunciation?: string;
      rating?: number;
    }
  ) {
    console.log(`📝 Updating word with ID: ${id}`);
    console.log('📄 Update data:', updateData);
    
    return this.wordService.updateWord(id, updateData);
  }
}