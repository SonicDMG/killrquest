import { conversationsCollection, ensureConversationsCollection } from "./astra";
import type { ChatMessage, ConversationDoc, Provider } from "./types";

// Kick off the collection existence check at import time so it's already
// resolved (or in-flight) before the first API request arrives.
const collectionReady = ensureConversationsCollection();

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
  await collectionReady;
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
  await collectionReady;
  await conversationsCollection.updateOne(
    { _id: id },
    { $set: { messages } }
  );
}

export async function updateResponseId(
  id: string,
  previousResponseId: string
): Promise<void> {
  await collectionReady;
  await conversationsCollection.updateOne(
    { _id: id },
    { $set: { previousResponseId } }
  );
}

export async function getConversation(
  id: string
): Promise<ConversationDoc | null> {
  await collectionReady;
  return conversationsCollection.findOne(
    { _id: id },
    { projection: { _id: 1, messages: 1 } }
  );
}

export async function deleteConversation(id: string) {
  await collectionReady;
  return conversationsCollection.deleteOne({ _id: id });
}

export async function listConversations(): Promise<ConversationDoc[]> {
  await collectionReady;
  const docs = await conversationsCollection
    .find({}, { projection: { _id: 1, createdAt: 1, label: 1, provider: 1, model: 1 } })
    .limit(100)
    .toArray();
  return docs.sort((a, b) =>
    (b.createdAt ?? "").localeCompare(a.createdAt ?? "")
  );
}
