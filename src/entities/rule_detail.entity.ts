import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class RuleDetail {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  rule_text: string;
}
