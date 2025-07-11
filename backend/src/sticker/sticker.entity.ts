import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from 'typeorm';
import { User } from '../user/user.entity';
import { Word } from '../word/word.entity';
import { Label } from '../label/label.entity';

@Entity()
export class Sticker {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  word: string;

  @ManyToOne(() => Word, word => word.stickers, { nullable: true })
  wordEntity: Word;

  @Column({ nullable: true })
  wordId: number;

  @Column({ nullable: true })
  meaning: string;

  @Column({ type: 'text', nullable: true })
  chineseMeaning: string;

  @Column({ type: 'text', nullable: true })
  usage: string;

  @Column({ type: 'text', nullable: true })
  scenarios: string;

  @Column({ default: '#f59e0b' })
  color: string;

  @Column({ default: 100 })
  x: number;

  @Column({ default: 100 })
  y: number;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => User, user => user.stickers, { nullable: false })
  user: User;

  @Column()
  userId: number;

  @ManyToOne(() => Label, label => label.stickers, { nullable: true })
  label: Label;

  @Column({ nullable: true })
  labelId: number;
}