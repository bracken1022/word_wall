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

  @Column('text')
  scenarios: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Sticker, sticker => sticker.wordEntity)
  stickers: Sticker[];
}