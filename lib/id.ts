import { ObjectId } from "mongodb";

export function newId(): string {
  return new ObjectId().toHexString();
}

export function asObjectId(id: string): ObjectId {
  return new ObjectId(id);
}
