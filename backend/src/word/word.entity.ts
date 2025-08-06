import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Sticker } from '../sticker/sticker.entity';

@Entity()
export class Word {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  word: string;

  @Column('text')
  meaning: string;

  @Column()
  chineseMeaning: string;

  @Column('text')
  usage: string;

  @Column('text', {
    transformer: {
      to: (value: string[]) => JSON.stringify(value || []),
      from: (value: string) => {
        try {
          return JSON.parse(value || '[]');
        } catch {
          return [];
        }
      }
    }
  })
  scenarios: string[];

  @Column({ nullable: true })
  pronunciation?: string;

  @Column({ type: 'integer', default: 5 })
  rating: number;

  @Column({ default: false })
  isProcessing: boolean;

  @Column({ default: 'completed' })
  processingStatus: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Sticker, sticker => sticker.wordEntity)
  stickers: Sticker[];
}