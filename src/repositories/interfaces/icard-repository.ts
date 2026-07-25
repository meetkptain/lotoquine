import type { Card, CreateCardDTO } from "@/types"

export interface ICardRepository {
  create(data: CreateCardDTO): Promise<Card>
  bulkCreate(data: CreateCardDTO[]): Promise<Card[]>
  findById(id: number): Promise<Card | null>
  findBySerialNumber(serial: string): Promise<Card | null>
  findActive(): Promise<Card[]>
  findAll(): Promise<Card[]>
  search(query: string): Promise<Card[]>
  deactivate(id: number): Promise<void>
  delete(id: number): Promise<void>
  count(): Promise<number>
}
