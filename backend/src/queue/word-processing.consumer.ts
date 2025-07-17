import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Injectable } from '@nestjs/common';
import { AIService } from '../ai/ai.service';
import { WordService } from '../word/word.service';

@Injectable()
@Processor('word-processing')
export class WordProcessingConsumer {
  constructor(
    private readonly aiService: AIService,
    private readonly wordsService: WordService,
  ) {}

  @Process('enhance-word-details')
  async enhanceWordDetails(job: Job<{ wordId: number; word: string }>) {
    const { wordId, word } = job.data;
    
    console.log(`🔄 Processing enhanced details for word: "${word}" (ID: ${wordId})`);
    
    try {
      // Update job progress
      await job.progress(10);
      
      const prompts = {
        detailedMeaning: `请详细解释英语单词 "${word}" 的含义：
1. 在不同语境下的含义
2. 常见用法
3. 重要说明
请用中文详细说明。 请不要返回Thinking过程`,

        usageExamples: `请提供英语单词 "${word}" 的使用例句：
1. 日常对话例句 (英文+中文翻译)
2. 书面语例句 (英文+中文翻译)
3. 专业场合例句 (英文+中文翻译)
每个例句都要有中文翻译。 请不要返回Thinking过程`,

        synonyms: `请列出英语单词 "${word}" 的近义词：
1. 列出3-5个常见近义词
2. 简单说明它们的区别
3. 举例说明用法差异
请用中文说明。 请不要返回Thinking过程`,

        collocations: `请提供英语单词 "${word}" 的常用搭配：
1. 常见的词组搭配
2. 固定短语表达
3. 习惯用法
请用中文说明含义。 请不要返回Thinking过程`
      };

      const results = [];
      const totalSections = Object.keys(prompts).length;
      let currentSection = 0;
      
      // Process each section with delays
      for (const [key, prompt] of Object.entries(prompts)) {
        currentSection++;
        console.log(`📝 Processing section ${currentSection}/${totalSections}: ${key}`);
        
        try {
          const result = await this.aiService.makeOllamaRequest(prompt, key);
          results.push(result);
          
          // Update progress in database after each section
          await this.updateWordProgress(wordId, key, result, word);
          
          // Update job progress
          const progress = Math.round((currentSection / totalSections) * 80) + 10; // 10-90%
          await job.progress(progress);
          
          // Small delay between requests to avoid overwhelming Ollama
          if (currentSection < totalSections) {
            console.log(`⏱️ Waiting 3 seconds before next request...`);
            await new Promise(resolve => setTimeout(resolve, 3000));
          }
        } catch (error) {
          console.error(`❌ Error processing section ${key}:`, error);
          results.push(this.aiService.getFallbackForSection(key));
        }
      }

      // Final update with complete content
      await this.finalizeWordProcessing(wordId, results, word);
      
      // Complete job
      await job.progress(100);
      console.log(`🎉 Completed processing for word: "${word}"`);
      
    } catch (error) {
      console.error(`❌ Failed to process word "${word}":`, error);
      
      // Mark word as failed but keep basic content
      await this.wordsService.update(wordId, {
        isProcessing: false,
        processingStatus: 'failed',
        scenarios: ['basic-meaning', 'processing-failed']
      });
      
      throw error; // Re-throw to mark job as failed
    }
  }

  private async updateWordProgress(wordId: number, section: string, content: string, word: string) {
    try {
      // Get current word data
      const existingWord = await this.wordsService.findById(wordId);
      if (!existingWord) {
        console.error(`❌ Word with ID ${wordId} not found`);
        return;
      }
      
      // Build progressive content
      const progressiveContent = this.buildProgressiveContent(existingWord, section, content);
      
      // Update scenarios to include new section
      const updatedScenarios = [...(existingWord.scenarios || []), section];
      
      await this.wordsService.update(wordId, {
        meaning: progressiveContent,
        usage: progressiveContent,
        scenarios: updatedScenarios,
        processingStatus: 'in-progress'
      });
      
      console.log(`✅ Updated word "${word}" with section: ${section}`);
    } catch (error) {
      console.error(`❌ Failed to update word progress for "${word}":`, error);
    }
  }

  private buildProgressiveContent(existingWord: any, section: string, content: string): string {
    // Start with basic meaning
    let progressiveContent = existingWord.meaning || '';
    
    // Add new section content
    switch (section) {
      case 'detailedMeaning':
        progressiveContent += `\n\n### 🌟 详细释义\n${content}`;
        break;
      case 'usageExamples':
        progressiveContent += `\n\n### ✨ 使用场景与例句\n${content}`;
        break;
      case 'synonyms':
        progressiveContent += `\n\n### 🔄 近义词对比\n${content}`;
        break;
      case 'collocations':
        progressiveContent += `\n\n### 🎪 常用搭配表达\n${content}`;
        break;
    }
    
    return progressiveContent;
  }

  private async finalizeWordProcessing(wordId: number, results: string[], word: string) {
    try {
      const [detailedMeaning, usageExamples, synonyms, collocations] = results;
      
      // Get the basic meaning from database
      const existingWord = await this.wordsService.findById(wordId);
      if (!existingWord) {
        console.error(`❌ Word with ID ${wordId} not found for finalization`);
        return;
      }
      
      // Extract basic meaning (first section before any ###)
      const basicMeaning = existingWord.meaning.split('\n\n###')[0] || existingWord.meaning;
      
      // Build final comprehensive content
      const finalContent = `### 🎯 词性与基本含义
${basicMeaning}

### 🌟 详细释义
${detailedMeaning}

### ✨ 使用场景与例句
${usageExamples}

### 🔄 近义词对比
${synonyms}

### 🎪 常用搭配表达
${collocations}

### 🎬 记忆金句
"${word}" - 记住这个单词的关键是理解其核心含义和使用场景`;

      await this.wordsService.update(wordId, {
        meaning: finalContent,
        usage: finalContent,
        scenarios: ['multi-request', 'qwen', 'completed'],
        isProcessing: false,
        processingStatus: 'completed'
      });
      
      console.log(`🎉 Finalized processing for word: "${word}"`);
    } catch (error) {
      console.error(`❌ Failed to finalize word processing for "${word}":`, error);
    }
  }
}