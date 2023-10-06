
export default async function storeNameValue(parent, args, context, info) {
    const { collections } = context;
    const { Products, Accounts } = collections;
    console.log("parent",parent);
    const productId = parent?.variantId;
    console.log("productId",productId);
    if (!productId) {
        return null;
    }
    const product = await Products.find({ _id: productId } ).toArray();
    console.log("product",product); 
    if (!product) {
        return null;}
    
    const userId = product[0]?.uploadedBy?.userId;
    console.log("userId",userId);
    const store = await Accounts.find({ _id: userId } ).toArray();
    console.log("store",store);
  const  storeName = store[0]?.storeName;
  console.log("storeName",storeName);
  return {
    storeName: storeName
  }
    }