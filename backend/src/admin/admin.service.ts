import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as XLSX from 'xlsx';
import { Word } from '../word/word.entity';
import { User } from '../user/user.entity';
import { WordService } from '../word/word.service';
import { UserService } from '../user/user.service';

interface ImportStatus {
  isRunning: boolean;
  progress: number;
  total: number;
  currentWord?: string;
  completed: number;
  errors: string[];
}

@Injectable()
export class AdminService {
  private importStatus: ImportStatus = {
    isRunning: false,
    progress: 0,
    total: 0,
    completed: 0,
    errors: []
  };

  constructor(
    @InjectRepository(Word)
    private wordRepository: Repository<Word>,
    private wordService: WordService,
    private userService: UserService,
  ) {}

  async processWordFile(file: Express.Multer.File, adminUserId: number): Promise<{ message: string; totalWords: number }> {
    try {
      console.log(`Processing file: ${file.originalname}, size: ${file.size}, type: ${file.mimetype}`);
      console.log('File object keys:', Object.keys(file));
      console.log('Buffer exists:', !!file.buffer);
      console.log('File path:', file.path);
      
      if (!file.buffer && !file.path) {
        throw new Error('No file data received. File buffer and path are both missing.');
      }
      
      let data: string[][];
      
      // Handle different file types
      if (file.mimetype === 'text/csv' || file.originalname.toLowerCase().endsWith('.csv')) {
        // Handle CSV files
        let csvContent: string;
        if (file.buffer) {
          csvContent = file.buffer.toString('utf-8');
        } else if (file.path) {
          // If buffer is not available, read from file path
          const fs = require('fs');
          csvContent = fs.readFileSync(file.path, 'utf-8');
        } else {
          throw new Error('Cannot read CSV file - no buffer or path available');
        }
        
        console.log('CSV content preview:', csvContent.substring(0, 200));
        
        const lines = csvContent.split('\n').filter(line => line.trim());
        data = lines.map(line => {
          // Simple CSV parsing - split by comma and clean up
          return line.split(',').map(cell => cell.trim().replace(/^"(.*)"$/, '$1'));
        });
      } else {
        // Handle Excel files (.xlsx, .xls)
        try {
          console.log('Attempting to read Excel file...');
          let workbook;
          
          if (file.buffer) {
            workbook = XLSX.read(file.buffer, { 
              type: 'buffer',
              cellDates: false,
              cellNF: false,
              cellStyles: false
            });
          } else if (file.path) {
            // Read from file path if buffer is not available
            workbook = XLSX.readFile(file.path, {
              cellDates: false,
              cellNF: false,
              cellStyles: false
            });
          } else {
            throw new Error('Cannot read Excel file - no buffer or path available');
          }
          
          console.log('Excel sheet names:', workbook.SheetNames);
          
          if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
            throw new Error('Excel file appears to have no sheets');
          }
          
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          
          if (!worksheet) {
            throw new Error('Excel sheet appears to be empty');
          }
          
          data = XLSX.utils.sheet_to_json(worksheet, { 
            header: 1,
            defval: '',
            blankrows: false
          }) as string[][];
          
        } catch (xlsxError) {
          console.error('XLSX parsing error:', xlsxError);
          throw new Error(`Excel file could not be parsed. Please ensure it's a valid Excel file (.xlsx or .xls). Error: ${xlsxError instanceof Error ? xlsxError.message : 'Unknown parsing error'}`);
        }
      }

      console.log('Parsed data length:', data?.length);
      console.log('First few rows:', data?.slice(0, 3));

      if (!data || data.length === 0) {
        throw new Error('File appears to be empty or could not be parsed');
      }

      // Extract words from first column, with better error handling
      let words: string[] = [];
      
      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        if (row && Array.isArray(row) && row.length > 0) {
          const firstCell = row[0];
          if (firstCell && typeof firstCell === 'string' && firstCell.trim().length > 0) {
            words.push(firstCell.trim().toLowerCase());
          }
        }
      }

      console.log('Extracted words before filtering:', words.slice(0, 10));

      // Skip header row if it looks like a header (contains common header words)
      if (words.length > 0) {
        const firstWord = words[0];
        if (firstWord && (
          firstWord.toLowerCase() === 'word' || 
          firstWord.toLowerCase() === 'words' || 
          firstWord.toLowerCase() === 'english' ||
          firstWord.toLowerCase() === 'vocabulary'
        )) {
          words = words.slice(1);
          console.log('Skipped header row');
        }
      }

      // Remove duplicates and validate
      words = words.filter((word, index, arr) => arr.indexOf(word) === index);

      if (words.length === 0) {
        throw new Error('No valid words found in the first column. Make sure your file has English words in the first column.');
      }

      console.log(`Processing ${words.length} words from file: ${file.originalname}`);
      console.log('Final words to process:', words.slice(0, 5));

      // Start background processing
      this.startBatchProcessing(words);

      return {
        message: `Started processing ${words.length} words from ${file.originalname}`,
        totalWords: words.length
      };
    } catch (error) {
      console.error('Error processing file:', error);
      throw new Error(`Failed to process file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async startBatchProcessing(words: string[]) {
    this.importStatus = {
      isRunning: true,
      progress: 0,
      total: words.length,
      completed: 0,
      errors: []
    };

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      this.importStatus.currentWord = word;
      this.importStatus.progress = Math.round((i / words.length) * 100);

      try {
        // Check if word already exists
        const existingWord = await this.wordService.findByWord(word);
        if (!existingWord) {
          // Create new word with AI-generated content
          await this.wordService.createOrGetWord(word);
          this.importStatus.completed++;
        } else {
          this.importStatus.completed++;
        }
      } catch (error) {
        this.importStatus.errors.push(`Failed to process "${word}": ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      // Add small delay to prevent overwhelming the AI service
      if (i < words.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    this.importStatus.isRunning = false;
    this.importStatus.progress = 100;
    this.importStatus.currentWord = undefined;
  }

  async getImportStatus(): Promise<ImportStatus> {
    return { ...this.importStatus };
  }

  async createAdminUser(username: string, email: string, password: string): Promise<User> {
    // Check if user already exists
    const existingUser = await this.userService.findByEmail(email);
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Create admin user
    const user = await this.userService.create(username, email, password);
    
    // Update user to admin
    await this.userService.updateUserAdmin(user.id, true);
    
    return user;
  }
}