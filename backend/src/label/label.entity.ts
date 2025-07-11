import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, ManyToOne } from 'typeorm';
import { User } from '../user/user.entity';
import { Sticker } from '../sticker/sticker.entity';

@Entity()
export class Label {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ default: '#3b82f6' })
  color: string;

  @Column({ default: 0 })
  stickerCount: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User, user => user.labels, { nullable: false })
  user: User;

  @Column()
  userId: number;

  @OneToMany(() => Sticker, sticker => sticker.label)
  stickers: Sticker[];
}