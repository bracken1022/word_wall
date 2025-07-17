import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Sticker } from './sticker.entity';
import { CreateStickerDto, UpdateStickerDto } from './sticker.dto';
import { AIService } from '../ai/ai.service';
import { WordService } from '../word/word.service';
import { LabelService } from '../label/label.service';

@Injectable()
export class StickerService {
  constructor(
    @InjectRepository(Sticker)
    private stickerRepository: Repository<Sticker>,
    private aiService: AIService,
    private wordService: WordService,
    private labelService: LabelService,
  ) {}

  async findAll(): Promise<Sticker[]> {
    return this.stickerRepository.find({ relations: ['user', 'wordEntity', 'label'] });
  }

  async findByUser(userId: number): Promise<Sticker[]> {
    const stickers = await this.stickerRepository.find({ 
      where: { userId },
      relations: ['user', 'wordEntity', 'label']
    });
    
    // Fix: Handle stickers with missing wordEntity relations
    const stickersWithMissingWords = stickers.filter(s => s.wordId && !s.wordEntity);
    if (stickersWithMissingWords.length > 0) {
      console.log(`⚠️ Found ${stickersWithMissingWords.length} stickers with missing wordEntity relations, attempting to fix...`);
      
      for (const sticker of stickersWithMissingWords) {
        console.log(`🔧 Fixing sticker ID: ${sticker.id}, wordId: ${sticker.wordId}, word: "${sticker.word}"`);
        
        try {
          // Check if the word exists in the database
          let word = await this.wordService.findById(sticker.wordId);
          
          if (!word) {
            console.log(`❌ Word ${sticker.wordId} not found, creating new word for "${sticker.word}"`);
            // Create a new word entry if it doesn't exist
            word = await this.wordService.create({
              word: sticker.word,
              meaning: sticker.meaning || `Basic meaning for ${sticker.word}`,
              chineseMeaning: sticker.chineseMeaning || '',
              usage: sticker.usage || `Usage examples for ${sticker.word}`,
              scenarios: sticker.scenarios ? [sticker.scenarios] : [],
              isProcessing: false,
              processingStatus: 'completed'
            });
            
            // Update the sticker to point to the new word
            await this.stickerRepository.update(sticker.id, { wordId: word.id });
            console.log(`✅ Created new word ${word.id} and updated sticker ${sticker.id}`);
          } else {
            console.log(`✅ Word ${sticker.wordId} exists in database: "${word.word}"`);
          }
          
          // Manually assign the wordEntity to the sticker for this response
          sticker.wordEntity = word;
        } catch (error) {
          console.log(`❌ Error fixing sticker ${sticker.id}:`, error instanceof Error ? error.message : 'Unknown error');
        }
      }
    }
    
    return stickers;
  }

  async findByLabel(labelId: number, userId: number): Promise<Sticker[]> {
    return this.stickerRepository.find({
      where: { labelId, userId },
      relations: ['user', 'wordEntity', 'label']
    });
  }

  async findOne(id: number, userId?: number): Promise<Sticker> {
    const whereCondition: any = { id };
    if (userId) {
      whereCondition.userId = userId;
    }
    const sticker = await this.stickerRepository.findOne({ 
      where: whereCondition,
      relations: ['user', 'wordEntity', 'label']
    });
    if (!sticker) {
      throw new NotFoundException(`Sticker with ID ${id} not found`);
    }
    return sticker;
  }

  async create(createStickerDto: CreateStickerDto, userId: number): Promise<Sticker> {
    let wordEntity = null;
    let stickerData = { ...createStickerDto };

    // If useAI is true or no meaning is provided, use shared word system
    if (createStickerDto.useAI || !createStickerDto.meaning) {
      try {
        // Use immediate processing by default (unless explicitly set to false)
        const useImmediate = createStickerDto.immediate !== false;
        
        if (useImmediate) {
          // Get or create shared word with immediate AI content
          wordEntity = await this.wordService.createOrGetWordImmediate(createStickerDto.word);
          console.log(`🚀 Using immediate processing for word: "${createStickerDto.word}"`);
        } else {
          // Use full processing (legacy behavior)
          wordEntity = await this.wordService.createOrGetWord(createStickerDto.word);
          console.log(`🐌 Using full processing for word: "${createStickerDto.word}"`);
        }
        
        // Don't copy word data to sticker - use wordEntity relation instead
        // This ensures sticker always shows the latest word data
        console.log(`📋 Created word entity with ID: ${wordEntity.id} for sticker`);
      } catch (error) {
        console.error('Shared word creation failed:', error);
        // Continue with manual data if shared word fails
      }
    }

    // Get or create appropriate label for this user
    const label = await this.labelService.getOrCreateLabelForUser(userId);

    // Remove useAI and immediate from the data before saving
    const { useAI, immediate, ...dataToSave } = stickerData;
    const sticker = this.stickerRepository.create({
      ...dataToSave,
      userId,
      wordId: wordEntity?.id,
      labelId: label.id,
    });
    
    const savedSticker = await this.stickerRepository.save(sticker);
    
    // Increment the label's sticker count
    await this.labelService.incrementStickerCount(label.id);
    
    // Return the sticker with relations populated
    const stickerWithRelations = await this.stickerRepository.findOne({
      where: { id: savedSticker.id },
      relations: ['user', 'wordEntity', 'label']
    });
    
    if (!stickerWithRelations) {
      throw new NotFoundException(`Sticker with ID ${savedSticker.id} not found after creation`);
    }
    
    return stickerWithRelations;
  }

  async update(id: number, updateStickerDto: UpdateStickerDto, userId?: number): Promise<Sticker> {
    if (userId) {
      // Ensure user can only update their own stickers
      await this.findOne(id, userId);
    }
    await this.stickerRepository.update(id, updateStickerDto);
    return this.findOne(id, userId);
  }

  async remove(id: number, userId?: number): Promise<void> {
    let sticker = null;
    if (userId) {
      // Ensure user can only delete their own stickers
      sticker = await this.findOne(id, userId);
    } else {
      sticker = await this.findOne(id);
    }
    
    const result = await this.stickerRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Sticker with ID ${id} not found`);
    }
    
    // Decrement the label's sticker count if sticker had a label
    if (sticker.labelId) {
      await this.labelService.decrementStickerCount(sticker.labelId);
    }
  }
}