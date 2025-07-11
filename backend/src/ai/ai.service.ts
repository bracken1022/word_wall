import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class AIService {
  private ollamaUrl = 'http://localhost:11434';

  constructor(private configService: ConfigService) {
    // Only using local Qwen via Ollama - no external API keys needed
  }

  async generateWordDataLocal(word: string): Promise<{
    meaning: string;
    chineseMeaning: string;
    usage: string;
    scenarios: string[];
  }> {
    try {
      const prompt = `请解释英语单词${word}的中文含义`;

      console.log(`🤖 Using Qwen3:1.7b model for local generation`);
      
      const response = await axios.post(`${this.ollamaUrl}/api/generate`, {
        model: 'qwen3:1.7b',
        prompt: prompt,
        stream: false
      });

      const aiResponse = response.data.response;
      
      console.log('=== RAW QWEN RESPONSE ===');
      console.log(aiResponse);
      console.log('=== END RAW RESPONSE ===');
      
      // Extract useful content from Qwen response
      let cleanedResponse = '';
      
      // First try to extract content after </think>
      const thinkEndMatch = aiResponse.match(/<\/think>\s*([\s\S]*)/i);
      if (thinkEndMatch && thinkEndMatch[1] && thinkEndMatch[1].trim().length > 10) {
        cleanedResponse = thinkEndMatch[1].trim();
      } else {
        cleanedResponse = aiResponse;
      }
      
      // Parse the three sections: 中文含义, 英语表达, 近义词
      const sections = {
        meaning: '',
        expression: '',
        synonyms: ''
      };
      
      // Extract 中文含义 section (flexible matching with word name)
      const meaningMatch = cleanedResponse.match(/\*\*(?:[^*]*中文含义|中文含义)：?\*\*\s*([\s\S]*?)(?=\*\*(?:[^*]*英语[^*]*|近义词)|$)/i);
      if (meaningMatch) {
        sections.meaning = meaningMatch[1].trim();
      }
      
      // Extract 英语表达/英语用法/英语使用场景 section (flexible matching)
      const expressionMatch = cleanedResponse.match(/\*\*(?:[^*]*英语[^*]*)：?\*\*\s*([\s\S]*?)(?=\*\*近义词|$)/i);
      if (expressionMatch) {
        sections.expression = expressionMatch[1].trim();
      }
      
      // Extract 近义词 section
      const synonymsMatch = cleanedResponse.match(/\*\*近义词：?\*\*\s*([\s\S]*?)$/i);
      if (synonymsMatch) {
        sections.synonyms = synonymsMatch[1].trim();
      }
      
      // Format the final response
      let formattedResponse = `## ${word} 分析\n\n`;
      
      if (sections.meaning) {
        formattedResponse += `### 中文含义\n${sections.meaning}\n\n`;
      }
      
      if (sections.expression) {
        formattedResponse += `### 英语表达\n${sections.expression}\n\n`;
      }
      
      if (sections.synonyms) {
        formattedResponse += `### 近义词\n${sections.synonyms}`;
      }
      
      // If no sections found, use the cleaned response
      if (!sections.meaning && !sections.expression && !sections.synonyms) {
        formattedResponse = cleanedResponse || `## ${word}\n\n**含义：** 英语单词\n\n**使用场景：**\n1. 日常交流中使用\n2. 书面表达中使用\n\n**近义词：** 相关词汇`;
      }
      
      return {
        meaning: formattedResponse,
        chineseMeaning: word,
        usage: formattedResponse,
        scenarios: ['qwen', 'response']
      };
    } catch (error) {
      console.error('Qwen local AI service error:', error);
      console.log('No fallback available - using default response');
      return this.getFallbackResponse(word);
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
    return {
      meaning: `Definition of "${word}"`,
      chineseMeaning: `${word}的中文意思`,
      usage: `Example: "${word}" is commonly used in English.`,
      scenarios: [
        'General conversation',
        'Written communication',
        'Academic context'
      ]
    };
  }
}