import { conversationsCollection, ensureConversationsCollection } from "./astra";
import type { ChatMessage, ConversationDoc, Provider } from "./types";

// Collision-resistant ID without a dependency
function nanoid(): string {
  return (
    "conv_" +
    Math.random().toString(36).slice(2, 9) +
    Date.now().toString(36)
  );
}

export async function createConversation(params: {
  provider: Provider;
  model: string;
  firstUserMessage: string;
}): Promise<string> {
  await ensureConversationsCollection();
  const id = nanoid();
  const doc: ConversationDoc = {
    _id: id,
    createdAt: new Date().toISOString(),
    label: params.firstUserMessage.slice(0, 40),
    provider: params.provider,
    model: params.model,
    messages: [],
  };
  await conversationsCollection.insertOne(doc);
  return id;
}

export async function appendMessages(
  id: string,
  messages: ChatMessage[]
): Promise<void> {
  await ensureConversationsCollection();
  await conversationsCollection.updateOne(
    { _id: id },
    { $set: { messages } }
  );
}

export async function updateResponseId(
  id: string,
  previousResponseId: string
): Promise<void> {
  await ensureConversationsCollection();
  await conversationsCollection.updateOne(
    { _id: id },
    { $set: { previousResponseId } }
  );
}

export async function getConversation(
  id: string
): Promise<ConversationDoc | null> {
  await ensureConversationsCollection();
  return conversationsCollection.findOne({ _id: id });
}

export async function listConversations(): Promise<ConversationDoc[]> {
  await ensureConversationsCollection();
  return conversationsCollection
    .find({}, { sort: { createdAt: -1 }, limit: 50 })
    .toArray();
}
