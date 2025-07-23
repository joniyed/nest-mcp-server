import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class RuleTemplate {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  template_name: string;
}
