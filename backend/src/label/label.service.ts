import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Label } from './label.entity';

@Injectable()
export class LabelService {
  constructor(
    @InjectRepository(Label)
    private labelRepository: Repository<Label>,
  ) {}

  async findByUser(userId: number): Promise<Label[]> {
    return this.labelRepository.find({
      where: { userId },
      relations: ['stickers'],
      order: { createdAt: 'ASC' },
    });
  }

  async findById(id: number, userId?: number): Promise<Label | null> {
    const whereCondition: any = { id };
    if (userId) {
      whereCondition.userId = userId;
    }
    return this.labelRepository.findOne({
      where: whereCondition,
      relations: ['stickers'],
    });
  }

  async getOrCreateLabelForUser(userId: number): Promise<Label> {
    // Find the most recent label that has space (less than 10 stickers)
    const availableLabel = await this.labelRepository.findOne({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    if (availableLabel && availableLabel.stickerCount < 10) {
      return availableLabel;
    }

    // Create a new label if none available or all are full
    // Find the highest collection number to avoid duplicates
    const existingLabels = await this.labelRepository.find({
      where: { userId },
      select: ['name'],
    });
    
    let maxCollectionNumber = 0;
    existingLabels.forEach(label => {
      const match = label.name.match(/Collection (\d+)/);
      if (match) {
        const num = parseInt(match[1]);
        if (num > maxCollectionNumber) {
          maxCollectionNumber = num;
        }
      }
    });
    
    const labelColors = [
      '#3b82f6', '#ef4444', '#10b981', '#f59e0b', 
      '#8b5cf6', '#f97316', '#06b6d4', '#84cc16'
    ];
    
    const newCollectionNumber = maxCollectionNumber + 1;
    const newLabel = this.labelRepository.create({
      name: `Collection ${newCollectionNumber}`,
      color: labelColors[(newCollectionNumber - 1) % labelColors.length],
      userId,
      stickerCount: 0,
    });

    return this.labelRepository.save(newLabel);
  }

  async incrementStickerCount(labelId: number): Promise<void> {
    await this.labelRepository.increment({ id: labelId }, 'stickerCount', 1);
  }

  async decrementStickerCount(labelId: number): Promise<void> {
    await this.labelRepository.decrement({ id: labelId }, 'stickerCount', 1);
  }

  async updateLabel(id: number, name: string, color: string, userId?: number): Promise<Label | null> {
    const whereCondition: any = { id };
    if (userId) {
      whereCondition.userId = userId;
    }
    
    await this.labelRepository.update(whereCondition, { name, color });
    return this.findById(id, userId);
  }

  async deleteLabel(id: number, userId?: number): Promise<void> {
    const whereCondition: any = { id };
    if (userId) {
      whereCondition.userId = userId;
    }
    await this.labelRepository.delete(whereCondition);
  }
}