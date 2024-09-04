export default async function storeNameValue(parent, args, context, info) {
  const { collections } = context;
  const { Catalog, Accounts } = collections;
  console.log("parent in carts ", parent);
  const productId = parent?.productConfiguration?.productId;
  console.log("productId", productId);
  if (!productId) {
    return null;
  }
  const product = await Catalog.find({ "product._id": productId }).toArray();
  console.log("product", product);
  if (!product) {
    return null;
  }

  const userId = product[0]?.product?.variants[0]?.uploadedBy?.userId;
  console.log("userId", product[0]?.product?.variants[0]?.uploadedBy);
  const store = await Accounts.find({ _id: userId }).toArray();
  console.log("store", store);
  const storeName = store[0]?.storeName;
  console.log("storeName", storeName);
  return {
    storeName: storeName,
  };
}
