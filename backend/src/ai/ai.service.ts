import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class AIService {
  private ollamaUrl = 'http://localhost:11434';

  private simpleQueueService: any;

  constructor(
    private configService: ConfigService
  ) {
    // Only using local Qwen via Ollama - no external API keys needed
  }

  // Inject the queue service after module initialization to avoid circular dependency
  setQueueService(queueService: any) {
    this.simpleQueueService = queueService;
  }

  async generateWordDataImmediate(word: string): Promise<{
    meaning: string;
    chineseMeaning: string;
    usage: string;
    scenarios: string[];
  }> {
    console.log(`🚀 Starting immediate word generation for: "${word}"`);
    const startTime = Date.now();
    
    try {
      // Get basic meaning first (fastest request)
      const basicMeaning = await this.makeOllamaRequest(
        `请分析英语单词 "${word}":
1. 词性是什么？
2. 基本中文含义是什么？
请用中文回答。 请不要返回Thinking过程`,
        'basicMeaning'
      );

      const duration = Date.now() - startTime;
      console.log(`✅ Immediate basic meaning generated for "${word}" in ${duration}ms`);

      return {
        meaning: `### 🎯 词性与基本含义\n${basicMeaning}`,
        chineseMeaning: word,
        usage: `### 🎯 词性与基本含义\n${basicMeaning}`,
        scenarios: ['basic-meaning', 'processing']
      };
    } catch (error: any) {
      console.error(`❌ Immediate generation failed for "${word}":`, error?.message || 'Unknown error');
      
      // Return fallback for immediate response
      const fallback = this.getFallbackForSection('basicMeaning');
      return {
        meaning: `### 🎯 词性与基本含义\n${fallback}`,
        chineseMeaning: word,
        usage: `### 🎯 词性与基本含义\n${fallback}`,
        scenarios: ['basic-meaning', 'fallback']
      };
    }
  }

  async queueWordProcessing(wordId: number, word: string): Promise<void> {
    console.log(`📋 Queueing enhanced processing for word: "${word}" (ID: ${wordId})`);
    
    try {
      if (this.simpleQueueService) {
        await this.simpleQueueService.add('enhance-word-details', {
          wordId,
          word
        }, {
          delay: 1000, // Small delay to ensure word is saved to database
          attempts: 3,
        });
        
        console.log(`✅ Successfully queued word processing for: "${word}"`);
      } else {
        throw new Error('Queue service not available');
      }
    } catch (error: any) {
      console.error(`❌ Failed to queue word processing for "${word}":`, error?.message || 'Unknown error');
      console.log(`⚠️ Queue is not available, falling back to direct processing for: "${word}"`);
      
      // Fallback to enhanced processing when queue is not available
      console.log(`🔄 Starting enhanced processing for word: "${word}"`);
      try {
        // Schedule the processing to run asynchronously without blocking
        setImmediate(async () => {
          try {
            await this.generateWordDataLocal(word);
            console.log(`✅ Enhanced processing completed for word: "${word}"`);
          } catch (processingError: any) {
            console.error(`❌ Enhanced processing failed for "${word}":`, processingError?.message || 'Unknown error');
          }
        });
        console.log(`✅ Enhanced processing scheduled for word: "${word}"`);
      } catch (processingError: any) {
        console.error(`❌ Failed to schedule enhanced processing for "${word}":`, processingError?.message || 'Unknown error');
      }
    }
  }

  async generateWordDataLocal(word: string): Promise<{
    meaning: string;
    chineseMeaning: string;
    usage: string;
    scenarios: string[];
  }> {
    try {
      console.log(`🤖 Starting multi-request approach for word: "${word}"`);
      
      // Define focused prompts for each section
      const prompts = {
        basicMeaning: `请分析英语单词 "${word}":
1. 词性是什么？
2. 基本中文含义是什么？
请用中文回答。`,

        detailedMeaning: `请详细解释英语单词 "${word}" 的含义：
1. 在不同语境下的含义
2. 常见用法
3. 重要说明
请用中文详细说明。`,

        usageExamples: `请提供英语单词 "${word}" 的使用例句：
1. 日常对话例句 (英文+中文翻译)
2. 书面语例句 (英文+中文翻译)  
3. 专业场合例句 (英文+中文翻译)
每个例句都要有中文翻译。`,

        synonyms: `请列出英语单词 "${word}" 的近义词：
1. 列出3-5个常见近义词
2. 简单说明它们的区别
3. 举例说明用法差异
请用中文说明。`,

        collocations: `请提供英语单词 "${word}" 的常用搭配：
1. 常见的词组搭配
2. 固定短语表达
3. 习惯用法
请用中文说明含义。`
      };

      // Make sequential focused requests (Ollama can't handle multiple simultaneous requests)
      console.log('🔄 Making sequential requests to avoid Ollama overload...');
      console.log(`📋 Total sections to process: ${Object.keys(prompts).length}`);
      const results = [];
      
      let sectionIndex = 0;
      for (const [key, prompt] of Object.entries(prompts)) {
        sectionIndex++;
        console.log(`\n--- Processing section ${sectionIndex}/${Object.keys(prompts).length}: ${key} ---`);
        const sectionResult = await this.makeOllamaRequest(`$${prompt} 请不要返回Thinking过程`, key);
        console.log(`📊 Section ${key} result length: ${sectionResult.length}`);
        console.log(`📝 Section ${key} result preview: ${sectionResult.substring(0, 100)}${sectionResult.length > 100 ? '...' : ''}`);
        results.push(sectionResult);
        
        // Small delay between requests to avoid overwhelming Ollama
        if (sectionIndex < Object.keys(prompts).length) {
          console.log(`⏱️ Waiting 3 seconds before next request...`);
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      }

      // Process results
      console.log('\n--- Processing Results ---');
      console.log(`📊 Total results collected: ${results.length}`);
      const [basicMeaning, detailedMeaning, usageExamples, synonyms, collocations] = results;
      console.log(`📋 Results breakdown:
        - basicMeaning: ${basicMeaning.length} chars
        - detailedMeaning: ${detailedMeaning.length} chars  
        - usageExamples: ${usageExamples.length} chars
        - synonyms: ${synonyms.length} chars
        - collocations: ${collocations.length} chars`);

      // Build the final formatted response
      const formattedResponse = `### 🎯 词性与基本含义
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

      console.log('✅ Multi-request approach completed successfully');
      console.log('📊 Final response length:', formattedResponse.length);
      
      return {
        meaning: formattedResponse,
        chineseMeaning: word,
        usage: formattedResponse,
        scenarios: ['multi-request', 'qwen']
      };
    } catch (error) {
      console.error('Multi-request Qwen service error:', error);
      console.log('🔄 Falling back to single request approach');
      return this.getFallbackResponse(word);
    }
  }

  async makeOllamaRequest(prompt: string, section: string): Promise<string> {
    try {
      console.log(`🔄 Making request for section: ${section}`);
      console.log(`📝 Prompt for ${section}:`, prompt);
      
      const requestPayload = {
        model: 'qwen3:1.7b',
        prompt: prompt,
        stream: false
      };
      
      console.log(`📤 Request payload for ${section}:`, JSON.stringify(requestPayload, null, 2));
      
      const response = await axios.post(`${this.ollamaUrl}/api/generate`, requestPayload, {
        timeout: 180000  // 3 minute timeout per request to allow for longer generation
      });

      let result = response.data.response;
      console.log(`🔍 Original response for ${section} (length: ${result?.length || 0}):`, result);
      
      // Clean the response
      const originalResult = result;
      result = result.replace(/<think>[\s\S]*?<\/think>/gi, '');
      result = result.replace(/<think>[\s\S]*$/gi, '');
      result = result.trim();
      
      console.log(`🧹 Cleaned response for ${section} (length: ${result?.length || 0}):`, result);
      
      if (originalResult !== result) {
        console.log(`⚠️ Section ${section} had <think> tags removed`);
      }
      
      console.log(`✅ Section ${section} completed, final length: ${result.length}`);
      
      // Better fallback handling for empty responses
      if (!result || result.length < 5) {
        console.log(`⚠️ Section ${section} returned empty/short response, using fallback`);
        console.log(`🔧 Fallback reason: result="${result}", length=${result?.length || 0}`);
        return this.getFallbackForSection(section);
      }
      
      return result;
    } catch (error: any) {
      console.error(`❌ Error in section ${section}:`, error?.message || 'Unknown error');
      console.error(`🔍 Full error details for ${section}:`, {
        message: error?.message,
        code: error?.code,
        status: error?.response?.status,
        statusText: error?.response?.statusText,
        data: error?.response?.data,
        stack: error?.stack
      });
      return this.getFallbackForSection(section);
    }
  }

  getFallbackForSection(section: string): string {
    switch (section) {
      case 'basicMeaning':
        return '词性: 待确认\n基本含义: 请查阅词典获取准确含义';
      case 'detailedMeaning':
        return '该词的详细含义需要进一步查询，建议使用专业词典或在线翻译工具获取更准确的解释。';
      case 'usageExamples':
        return '1. 日常对话: 待补充例句\n2. 书面语: 待补充例句\n3. 专业场合: 待补充例句';
      case 'synonyms':
        return '近义词信息暂时无法获取，建议查阅同义词词典。';
      case 'collocations':
        return '常用搭配信息需要进一步查询，建议使用搭配词典。';
      default:
        return `${section}信息暂时无法获取，请稍后重试。`;
    }
  }

  async generateWordData(word: string): Promise<{
    meaning: string;
    chineseMeaning: string;
    usage: string;
    scenarios: string[];
  }> {
    console.log(`🚀 === STARTING AI WORD GENERATION FOR: "${word}" ===`);
    const startTime = Date.now();
    
    // Try local Qwen first
    console.log('🤖 Attempting local Qwen generation...');
    try {
      const qwenResult = await this.generateWordDataLocal(word);
      const duration = Date.now() - startTime;
      console.log(`✅ Qwen local generation successful for "${word}" in ${duration}ms`);
      return qwenResult;
    } catch (error: any) {
      console.log(`❌ Qwen local generation failed for "${word}":`, error?.message || 'Unknown error');
      console.log('🔄 Falling back to manual input mode...');
    }
    
    // Fallback to manual input if Qwen fails
    const manualResult = this.getManualInputResponse(word);
    const duration = Date.now() - startTime;
    console.log(`📝 Manual input template generated for "${word}" in ${duration}ms`);
    return manualResult;
  }


  private getManualInputResponse(word: string) {
    const content = `## ${word} 分析

### 📝 使用说明
1. 访问 https://chatgpt.com/
2. 复制下面的提示词并发送给ChatGPT
3. 点击本卡片的编辑按钮（✏️）
4. 将ChatGPT的回答粘贴到编辑框中
5. 点击保存

### 🎯 ChatGPT 提示词
\`\`\`
解释 ${word} 的发音，使用场景以及近义词
\`\`\`

### 📋 备选提示词
如果需要更详细的解释，可以使用：
\`\`\`
请详细解释英文单词 "${word}" 的含义、词性、发音、使用场景，并提供中文翻译、英文例句和近义词。请用中文回答，但保留英文例句。
\`\`\`

### ⚠️ 待编辑
请使用上面的提示词在ChatGPT中获取详细解释，然后编辑此内容。`;

    return {
      meaning: content,
      chineseMeaning: `${word}的中文含义`,
      usage: content, // Use the same content for both meaning and usage
      scenarios: [
        '等待ChatGPT回答',
        '待补充使用场景',
        '待补充例句',
        '待补充近义词'
      ]
    };
  }

  private getFallbackResponse(word: string) {
    const content = `### 🎯 词性与基本含义
**${word}** - 英语单词，需要进一步查询确认具体词性和含义

### 🌟 详细释义
暂无AI生成的详细释义。建议使用在线词典或ChatGPT获取准确的含义解释。

### ✨ 使用场景与例句
**场景一：日常对话**
- 英文例句：The word "${word}" appears frequently in English.
- 中文翻译：单词"${word}"在英语中经常出现。

**场景二：书面表达**  
- 英文例句：In formal writing, "${word}" can be used appropriately.
- 中文翻译：在正式写作中，"${word}"可以适当使用。

**场景三：学术语境**
- 英文例句：Students should understand the meaning of "${word}".
- 中文翻译：学生应该理解"${word}"的含义。

### 🔄 近义词对比
近义词信息暂时无法获取，建议查阅同义词词典或使用ChatGPT进行对比分析。

### 🎪 常用搭配表达
常见搭配表达需要进一步研究，建议查阅搭配词典。

### 🎬 记忆金句
Remember "${word}" - understanding its core meaning is the key to mastery.
记住"${word}" - 理解其核心含义是掌握的关键。

---
*⚠️ 提示：此内容为默认模板，建议点击编辑按钮使用ChatGPT获取更详细和准确的分析。*`;

    return {
      meaning: content,
      chineseMeaning: `${word}的含义分析`,
      usage: content,
      scenarios: [
        '日常对话中使用',
        '书面表达应用', 
        '学术语境运用',
        '口语交流场景'
      ]
    };
  }
}