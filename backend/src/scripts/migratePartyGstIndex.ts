import mongoose from "mongoose";

export async function migratePartyGstIndex(): Promise<void> {
  const collection = mongoose.connection.collection("parties");
  const indexes = await collection.indexes();
  const oldUnique = indexes.find(
    (index) =>
      index.name === "userId_1_gstNumber_1" &&
      index.unique === true &&
      !index.partialFilterExpression,
  );

  if (oldUnique?.name) {
    await collection.dropIndex(oldUnique.name);
    console.log("Dropped legacy unique GST index on parties");
  }
}
