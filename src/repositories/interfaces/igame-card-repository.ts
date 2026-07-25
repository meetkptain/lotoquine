export interface IGameCardRepository {
  addCardsToGame(gameId: number, cardIds: number[]): Promise<void>
  getCardIdsForGame(gameId: number): Promise<number[]>
  removeAllFromGame(gameId: number): Promise<void>
}
