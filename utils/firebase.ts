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
    const ref = doc(db, "manpowers", year.toString(), "months", monthName);

    const snap = await getDoc(ref);

    if (!snap.exists()) return null;
    return snap.data() as T;
  }
  static async updateManpowerData(
    year: number,
    monthName: string,
    data: any
  ): Promise<void> {
    try {
      const docRef = doc(db, "manpowers", year.toString(), "months", monthName);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const existingData = docSnap.data();
        const dataArray = existingData.data || [];

        // Find if date already exists
        const dateIndex = dataArray.findIndex(
          (item: any) => item.date === data.date
        );

        if (dateIndex >= 0) {
          // Update existing date entry
          dataArray[dateIndex] = { ...dataArray[dateIndex], ...data };
        } else {
          // Add new date entry
          dataArray.push({
            date: data.date,
            bakery: 0,
            biscuit: 0,
            cake: 0,
            dairy_milk: 0,
            lachcha: 0,
            noodles: 0,
            snacks: 0,
            vermicelli: 0,
            wafer: 0,
            water_and_beverage: 0,
            total_manpower: 0,
            ...data,
          });
        }

        // Update the document
        await updateDoc(docRef, { data: dataArray });
      } else {
        // Create new document
        const initialData = {
          data: [
            {
              date: data.date,
              bakery: 0,
              biscuit: 0,
              cake: 0,
              dairy_milk: 0,
              lachcha: 0,
              noodles: 0,
              snacks: 0,
              vermicelli: 0,
              wafer: 0,
              water_and_beverage: 0,
              total_manpower: 0,
              ...data,
            },
          ],
        };

        await setDoc(docRef, initialData);
      }
    } catch (error) {
      console.error("Error updating manpower data:", error);
      throw error;
    }
  }
}

export default Firebase;
