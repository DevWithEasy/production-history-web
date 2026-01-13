import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "./firebaseConfig";

class Firebase {
  // ---------------- CREATE ----------------
  static async createDoc(collectionName: string, data: object) {
    const docRef = await addDoc(collection(db, collectionName), data);
    return { id: docRef.id, ...data };
  }

  static async createDocWithName(
    collectionName: string,
    docName: string,
    data: object
  ) {
    await setDoc(doc(db, collectionName, docName), data);
  }

  // ---------------- READ ----------------
  static async getDocument(collectionName: string, docId: string) {
    return await getDoc(doc(db, collectionName, docId));
  }

  static async getDocuments<T>(
    collectionName: string
  ): Promise<(T & { id: string })[]> {
    const snapshot = await getDocs(collection(db, collectionName));
    return snapshot.docs.map((d) => ({
      id: d.id,
      ...(d.data() as T),
    }));
  }

  static async getFindDocuments<T>(
    collectionName: string,
    field: string,
    value: string
  ): Promise<(T & { id: string })[]> {
    const q = query(collection(db, collectionName), where(field, "==", value));

    const snapshot = await getDocs(q);

    return snapshot.docs.map((d) => ({
      id: d.id,
      ...(d.data() as T),
    }));
  }

  // ---------------- UPDATE ----------------
  static async updateDocument(
    collectionName: string,
    docId: string,
    data: object
  ) {
    await updateDoc(doc(db, collectionName, docId), data);
  }

  // ---------------- DELETE ----------------
  static async deleteDocument(collectionName: string, docId: string) {
    await deleteDoc(doc(db, collectionName, docId));
  }

  // ---------------- CHECK PRODUCTS (YEAR → MONTH → PRODUCTS) ----------------
  static async isProductsCollectionExists(
    year: number,
    monthName: string
  ): Promise<boolean> {
    const productsRef = collection(
      db,
      "production",
      year.toString(), // doc
      "months", // collection
      monthName, // doc
      "products" // collection
    );

    const q = query(productsRef, limit(1));
    const snap = await getDocs(q);

    return !snap.empty;
  }

  static async getProductsByPeriod<T>(
    year: number,
    monthName: string
  ): Promise<(T & { id: string })[]> {
    const productsRef = collection(
      db,
      "production",
      year.toString(),
      "months",
      monthName,
      "products"
    );

    const snap = await getDocs(productsRef);

    return snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as T),
    }));
  }
  static async getManpowerByPeriod<T>(
  year: number,
  monthName: string
): Promise<T | null> {
  const ref = doc(
    db,
    "manpowers",
    year.toString(),
    "months",
    monthName
  );

  const snap = await getDoc(ref);

  if (!snap.exists()) return null;
  return snap.data() as T;
}
}

export default Firebase;
