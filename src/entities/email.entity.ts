import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Email {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  address: string;
}
