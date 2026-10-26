import type { Deck } from "../../types";

/** Backend integration point. AI credentials belong on the server, never in this client. */
export interface AiSlideAdapter {
  generateDeck(source: string): Promise<Deck>;
}

export class MockAiSlideAdapter implements AiSlideAdapter {
  async generateDeck(_source: string): Promise<Deck> {
    throw new Error(
      "AI生成は未接続です。外部で作成したJSONをインポートしてください。",
    );
  }
}

export const aiSlideAdapter: AiSlideAdapter = new MockAiSlideAdapter();
