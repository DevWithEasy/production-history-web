import Firebase from "@/utils/firebase";

interface Product {
  section: string;
  name: string;
  price: number;
  sku: string;
  code: string;
  data: [
    {
      date: number;
      batch: number;
      carton: number;
      manpower: number;
    }
  ];
  infos: [
    {
      name: string;
      unit: string;
      value: number;
    }
  ];
}

export default async function SectionPage({
  params,
}: {
  params: { id: string };
}) {

  const { id } = await params;
  const products = await Firebase.getFindDocuments<Product>(
    "products",
    "section",
    id 
  );

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Section: {id}</h1>

      {products.length === 0 && <p>No products found</p>}

      <ul className="space-y-2">
        {products.map((product) => (
          <li key={product.id} className="border p-2 rounded">
            <p>Name: {product.name}</p>
            <p>Price: {product.price}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
