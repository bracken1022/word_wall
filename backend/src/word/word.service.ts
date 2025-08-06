import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Word } from './word.entity';
import { AIService } from '../ai/ai.service';

@Injectable()
export class WordService {
  constructor(
    @InjectRepository(Word)
    private wordRepository: Repository<Word>,
    private aiService: AIService,
  ) {}

  async findByWord(word: string): Promise<Word | null> {
    return this.wordRepository.findOne({ where: { word: word.toLowerCase() } });
  }

  async findById(id: number): Promise<Word | null> {
    return this.wordRepository.findOne({ where: { id } });
  }

  async findOne(id: number): Promise<Word | null> {
    return this.findById(id);
  }

  async create(wordData: {
    word: string;
    meaning: string;
    chineseMeaning: string;
    usage: string;
    scenarios: string[];
    pronunciation?: string;
    rating?: number;
    isProcessing?: boolean;
    processingStatus?: string;
  }): Promise<Word> {
    const newWord = this.wordRepository.create({
      word: wordData.word.toLowerCase(),
      meaning: wordData.meaning,
      chineseMeaning: wordData.chineseMeaning,
      usage: wordData.usage,
      scenarios: wordData.scenarios,
      pronunciation: wordData.pronunciation,
      rating: wordData.rating || 5,
      isProcessing: wordData.isProcessing || false,
      processingStatus: wordData.processingStatus || 'completed',
    });

    return this.wordRepository.save(newWord);
  }

  async update(id: number, updateData: {
    meaning?: string;
    chineseMeaning?: string;
    usage?: string;
    scenarios?: string[];
    pronunciation?: string;
    rating?: number;
    isProcessing?: boolean;
    processingStatus?: string;
  }): Promise<Word | null> {
    const word = await this.findById(id);
    if (!word) {
      return null;
    }

    if (updateData.meaning !== undefined) {
      word.meaning = updateData.meaning;
    }
    if (updateData.chineseMeaning !== undefined) {
      word.chineseMeaning = updateData.chineseMeaning;
    }
    if (updateData.usage !== undefined) {
      word.usage = updateData.usage;
    }
    if (updateData.scenarios !== undefined) {
      word.scenarios = updateData.scenarios;
    }
    if (updateData.isProcessing !== undefined) {
      word.isProcessing = updateData.isProcessing;
    }
    if (updateData.processingStatus !== undefined) {
      word.processingStatus = updateData.processingStatus;
    }
    if (updateData.pronunciation !== undefined) {
      word.pronunciation = updateData.pronunciation;
    }
    if (updateData.rating !== undefined) {
      word.rating = updateData.rating;
    }

    return this.wordRepository.save(word);
  }

  async updateWord(id: number, updateData: {
    meaning?: string;
    chineseMeaning?: string;
    usage?: string;
    scenarios?: string[];
    pronunciation?: string;
    rating?: number;
  }): Promise<Word | null> {
    const word = await this.findById(id);
    if (!word) {
      return null;
    }

    console.log(`📝 Updating word "${word.word}" with new data`);
    
    if (updateData.meaning !== undefined) {
      word.meaning = updateData.meaning;
    }
    if (updateData.chineseMeaning !== undefined) {
      word.chineseMeaning = updateData.chineseMeaning;
    }
    if (updateData.usage !== undefined) {
      word.usage = updateData.usage;
    }
    if (updateData.scenarios !== undefined) {
      word.scenarios = updateData.scenarios;
    }
    if (updateData.pronunciation !== undefined) {
      word.pronunciation = updateData.pronunciation;
    }
    if (updateData.rating !== undefined) {
      word.rating = updateData.rating;
    }

    const updatedWord = await this.wordRepository.save(word);
    console.log(`✅ Successfully updated word "${word.word}"`);
    return updatedWord;
  }

  async createOrGetWordImmediate(word: string): Promise<Word> {
    const normalizedWord = word.toLowerCase();
    console.log(`📝 === WORD SERVICE IMMEDIATE: Processing "${word}" (normalized: "${normalizedWord}") ===`);
    
    // Check if word already exists
    const existingWord = await this.findByWord(normalizedWord);
    if (existingWord) {
      console.log(`♻️ Word "${normalizedWord}" already exists in database, returning cached version`);
      console.log(`📊 Existing word data: meaning length=${existingWord.meaning.length}, scenarios=${existingWord.scenarios}`);
      return existingWord;
    }

    console.log(`🆕 Word "${normalizedWord}" not found, generating immediate AI content...`);
    
    try {
      // Generate immediate AI content for new word
      const aiData = await this.aiService.generateWordDataImmediate(word);
      
      console.log(`🤖 Immediate AI generation completed for "${word}"`);
      console.log(`📊 AI Data Summary:`, {
        meaningLength: aiData.meaning.length,
        chineseMeaning: aiData.chineseMeaning,
        usageType: typeof aiData.usage,
        usageLength: typeof aiData.usage === 'string' ? aiData.usage.length : JSON.stringify(aiData.usage).length,
        scenariosCount: aiData.scenarios.length,
        scenarios: aiData.scenarios
      });
      
      // Create new word entry with processing status
      const newWord = await this.create({
        word: normalizedWord,
        meaning: aiData.meaning,
        chineseMeaning: aiData.chineseMeaning,
        usage: typeof aiData.usage === 'string' ? aiData.usage : JSON.stringify(aiData.usage),
        scenarios: aiData.scenarios,
        pronunciation: aiData.pronunciation,
        rating: 5,
        isProcessing: true,
        processingStatus: 'in-progress'
      });

      console.log(`💾 Saved immediate word "${normalizedWord}" to database with ID: ${newWord.id}`);
      
      // Queue the detailed processing
      await this.aiService.queueWordProcessing(newWord.id, word);
      
      return newWord;
      
    } catch (error: any) {
      console.log(`❌ === WORD SERVICE IMMEDIATE ERROR FOR "${word}" ===`);
      console.error('Error type:', error.constructor?.name || 'Unknown');
      console.error('Error message:', error.message || 'No message');
      console.error('Error stack:', error.stack || 'No stack trace');
      console.log(`❌ === END WORD SERVICE IMMEDIATE ERROR ===`);
      throw error;
    }
  }

  async createOrGetWord(word: string): Promise<Word> {
    const normalizedWord = word.toLowerCase();
    console.log(`📝 === WORD SERVICE: Processing "${word}" (normalized: "${normalizedWord}") ===`);
    
    // Check if word already exists
    const existingWord = await this.findByWord(normalizedWord);
    if (existingWord) {
      console.log(`♻️ Word "${normalizedWord}" already exists in database, returning cached version`);
      console.log(`📊 Existing word data: meaning length=${existingWord.meaning.length}, scenarios=${existingWord.scenarios}`);
      return existingWord;
    }

    console.log(`🆕 Word "${normalizedWord}" not found, generating new AI content...`);
    
    try {
      // Generate AI content for new word
      const aiData = await this.aiService.generateWordData(word);
      
      console.log(`🤖 AI generation completed for "${word}"`);
      console.log(`📊 AI Data Summary:`, {
        meaningLength: aiData.meaning.length,
        chineseMeaning: aiData.chineseMeaning,
        usageType: typeof aiData.usage,
        usageLength: typeof aiData.usage === 'string' ? aiData.usage.length : JSON.stringify(aiData.usage).length,
        scenariosCount: aiData.scenarios.length,
        scenarios: aiData.scenarios
      });
      
      // Create new word entry
      const newWord = this.wordRepository.create({
        word: normalizedWord,
        meaning: aiData.meaning,
        chineseMeaning: aiData.chineseMeaning,
        usage: typeof aiData.usage === 'string' ? aiData.usage : JSON.stringify(aiData.usage),
        scenarios: aiData.scenarios,
        pronunciation: aiData.pronunciation,
        rating: 5,
      });

      console.log(`💾 Saving new word "${normalizedWord}" to database...`);
      const savedWord = await this.wordRepository.save(newWord);
      console.log(`✅ Successfully saved word "${normalizedWord}" with ID: ${savedWord.id}`);
      
      return savedWord;
      
    } catch (error: any) {
      console.log(`❌ === WORD SERVICE ERROR FOR "${word}" ===`);
      console.error('Error type:', error.constructor?.name || 'Unknown');
      console.error('Error message:', error.message || 'No message');
      console.error('Error stack:', error.stack || 'No stack trace');
      console.log(`❌ === END WORD SERVICE ERROR ===`);
      throw error;
    }
  }
}