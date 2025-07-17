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
    return this.stickerRepository.find({ 
      where: { userId },
      relations: ['user', 'wordEntity', 'label']
    });
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
        
        // Use shared word data
        stickerData = {
          ...stickerData,
          meaning: wordEntity.meaning,
          chineseMeaning: wordEntity.chineseMeaning,
          usage: wordEntity.usage,
          scenarios: wordEntity.scenarios,
        };
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
    
    return savedSticker;
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