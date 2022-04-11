import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { Exclude } from 'class-transformer';

@Entity('base_entity')
export class BaseEntity {
  @Exclude()
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  createTime: Date;

  @Column({ nullable: true })
  updateTime: Date;
}
