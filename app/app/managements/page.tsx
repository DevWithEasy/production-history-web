"use client";
import Firebase from "@/utils/firebase";

export default function Managements() {
  async function operation() {
    const names = [
      "Active Energy Glucose 60gm X 96pcs [Export]",
      "Cream Club Choco Plus Chocolate 60gm X 96pcs [Export]",
      "Hot Chanachur-260gm X 24pcs",
      "Lachcha Semai- 5 kg",
      "Valencia Orange 60gm X 96Pcs [Export]",
      "Zafran Lachcha Semai-180gm X 24pcs",
    ];
    const collection = "production/2026/months/February/products/";
    for (const name of names) {
      await Firebase.deleteDocument(collection, name);
    }
  }
  return (
    <div>
      <h1>Managements</h1>
      {/* <button onClick={operation}>Operation</button> */}
    </div>
  );
}
