import ReactionError from "@reactioncommerce/reaction-error";
import { encodeProductOpaqueId, decodeProductOpaqueId, encodeCartItemOpaqueId } from "../xforms/id.js";


/**
 * @name checkProductStatus
 * @method
 * @memberof Cart/NoMeteorQueries
 * @summary Query the Cart collection and return item IDs, product IDs, isSoldOut, isVisible, and inventory status with separate messages.
 * @param {Object} context - an object containing the per-request state
 * @param {String} params.cartId - The cart ID to check
 * @returns {Promise<Array<Object>>} - An array with itemId, productId, inventoryInStock, isSoldOut, isVisible, and message
 */
export default async function checkProductStatus(context, { cartId }) {
    const { collections } = context;
    const { Cart, Catalog, SimpleInventory } = collections;

    // Validate cartId
    if (!cartId || cartId.length === 0) {
        throw new ReactionError("not-found", "You must provide a valid cartId");
    }

    // Fetch the cart
    const cart = await Cart.findOne({ _id: cartId });
    if (!cart) {
        throw new ReactionError("not-found", "Cart not found");
    }

    // Extract product statuses with soldOut, isVisible, and inventory check
    const productStatuses = await Promise.all(
        cart.items.map(async (item) => {
            const productId = item.productId;
            console.log("PRIDUCT ID", productId);
            

            // Fetch product from Catalog collection
            const productRecord = await Catalog.findOne({ "product._id": productId });

            if (!productRecord || !productRecord.product) {
                return null; // Skip if product not found
            }

            const { isSoldOut, isVisible } = productRecord.product;

            // Check inventory status from SimpleInventory collection
            const inventoryRecord = await SimpleInventory.findOne({ "productConfiguration.productId": productId });
            const inventoryInStock = inventoryRecord?.inventoryInStock || 0;

            // Separate messages based on conditions
            const messages = [];
            if (isSoldOut === true) {
                messages.push("Product is sold out");
            }
            if (isVisible === false) {
                messages.push("Product is unpublished");
            }
            if (inventoryInStock === 0) {
                messages.push("Product is out of stock");
            }

            // Include only if any of the conditions are met
            if (messages.length > 0) {
                return {
                    itemId: encodeCartItemOpaqueId(item._id),
                    productId:encodeProductOpaqueId(item.productId),
                    productTitle:item.title,
                    inventoryInStock,
                    isSoldOut,
                    isVisible,
                    message: messages.join(", ") 
                };
            }

            return null; // Skip if conditions are not met
        })
    );

    // Filter out null results
    return productStatuses.filter((status) => status !== null);
}


// import ReactionError from "@reactioncommerce/reaction-error";

// /**
//  * @name checkProductStatus
//  * @method
//  * @memberof Cart/NoMeteorQueries
//  * @summary Query the Cart collection and return item IDs, product IDs, isSoldOut, isVisible, and inventory status.
//  * @param {Object} context - an object containing the per-request state
//  * @param {String} params.cartId - The cart ID to check
//  * @returns {Promise<Array<Object>>} - An array with itemId, productId, isSoldOut, isVisible, inventoryInStock, and message
//  */
// export default async function checkProductStatus(context, { cartId }) {
//     const { collections } = context;
//     const { Cart, Catalog, SimpleInventory } = collections;

//     // Validate cartId
//     if (!cartId || cartId.length === 0) {
//         throw new ReactionError("not-found", "You must provide a valid cartId");
//     }

//     // Fetch the cart
//     const cart = await Cart.findOne({ _id: cartId });
//     if (!cart) {
//         throw new ReactionError("not-found", "Cart not found");
//     }

//     // Extract product statuses with soldOut, isVisible, and inventory check
//     const productStatuses = await Promise.all(
//         cart.items.map(async (item) => {
//             const productId = item.productId;

//             // Fetch product from Catalog collection
//             const productRecord = await Catalog.findOne({ "product._id": productId });

//             if (!productRecord || !productRecord.product) {
//                 return {
//                     itemId: item._id,
//                     productId,
//                     inventoryInStock: 0,
//                     isSoldOut: true,
//                     isVisible: false,
//                     message: "Product not found"
//                 };
//             }

//             const { isSoldOut, isVisible } = productRecord.product;

//             // Check inventory status from SimpleInventory collection
//             const inventoryRecord = await SimpleInventory.findOne({ "productConfiguration.productId": productId });
//             const inventoryInStock = inventoryRecord?.inventoryInStock || 0;

//             const soldOutStatus = isVisible !== true || isSoldOut === true || inventoryInStock <= 0;

//             return {
//                 itemId: item._id,
//                 productId,
//                 inventoryInStock,
//                 isSoldOut: soldOutStatus,
//                 isVisible,
//                 message: soldOutStatus
//                     ? "Product is sold out or out of stock"
//                     : "Product is available"
//             };
//         })
//     );

//     return productStatuses;
// }



// import ReactionError from "@reactioncommerce/reaction-error";

// /**
//  * @name checkProductStatus
//  * @method
//  * @memberof Cart/NoMeteorQueries
//  * @summary Query the Cart collection and return item IDs, product IDs, isSoldOut, and isVisible status.
//  * @param {Object} context - an object containing the per-request state
//  * @param {String} params.cartId - The cart ID to check
//  * @returns {Promise<Array<Object>>} - An array with itemId, productId, isSoldOut, isVisible, and message
//  */
// export default async function checkProductStatus(context, { cartId }) {
//     const { collections } = context;
//     const { Cart, Catalog } = collections;

//     // Validate cartId
//     if (!cartId || cartId.length === 0) {
//         throw new ReactionError("not-found", "You must provide a valid cartId");
//     }

//     // Fetch the cart
//     const cart = await Cart.findOne({ _id: cartId });
//     if (!cart) {
//         throw new ReactionError("not-found", "Cart not found");
//     }

//     // Extract product statuses with soldOut and isVisible check
//     const productStatuses = await Promise.all(
//         cart.items.map(async (item) => {
//             const productId = item.productId;

//             // Fetch product from Catalog collection
//             const productRecord = await Catalog.findOne({ "product._id": productId });

//             if (!productRecord || !productRecord.product) {
//                 return {
//                     itemId: item._id,
//                     productId,
//                     message: "Product not found"
//                 };
//             }

//             const { isSoldOut, isVisible } = productRecord.product;
//             const soldOutStatus = isVisible !== true || isSoldOut === true;

//             return {
//                 itemId: item._id,
//                 productId,
//                 isSoldOut: soldOutStatus,
//                 isVisible,
//                 message: soldOutStatus ? "Product is sold out" : "Product is available"
//             };
//         })
//     );

//     return productStatuses;
// }




// import ReactionError from "@reactioncommerce/reaction-error";

// /**
//  * @name checkProductStatus
//  * @method
//  * @memberof Cart/NoMeteorQueries
//  * @summary Query the Cart collection and return item IDs, product IDs, and soldOut status.
//  * @param {Object} context - an object containing the per-request state
//  * @param {String} params.cartId - The cart ID to check
//  * @returns {Promise<Array<Object>>} - An array with itemId, productId, and soldOut status
//  */
// export default async function checkProductStatus(context, { cartId }) {
//     const { collections } = context;
//     const { Cart, Catalog } = collections;

//     // Validate cartId
//     if (!cartId || cartId.length === 0) {
//         throw new ReactionError("not-found", "You must provide a valid cartId");
//     }

//     // Fetch the cart
//     const cart = await Cart.findOne({ _id: cartId });
//     if (!cart) {
//         throw new ReactionError("not-found", "Cart not found");
//     }

//     // Extract product statuses with soldOut check
//     const productStatuses = await Promise.all(
//         cart.items.map(async (item) => {
//             const productId = item.productId;
//             console.log("productId", productId);

//             const product = await Catalog.findOne({ "product._id": productId });

//             console.log("product", product);

//             if (!product) {
//                 return {
//                     itemId: item._id,
//                     productId,
//                     isSoldOut: true, 
//                     message: "Product not found"
//                 };
//             }

//             // Check soldOut status
//             const isSoldOut = product.isVisible !== true || product.isSoldOut === true;

//             console.log("isSoldOut: " + isSold)

//             return {
//                 itemId: item._id,
//                 productId,
//                 isSoldOut,
//                 message: isSoldOut ? "Product is sold out" : "Product is available"
//             };
//         })
//     );

//     return productStatuses;
// }




// import ReactionError from "@reactioncommerce/reaction-error";

// /**
//  * @name checkProductStatus
//  * @method
//  * @memberof Cart/NoMeteorQueries
//  * @summary Query the Cart collection and return only item IDs and product IDs.
//  * @param {Object} context - an object containing the per-request state
//  * @param {String} params.cartId - The cart ID to check
//  * @returns {Promise<Array<Object>>} - An array with item._id and productId
//  */
// export default async function checkProductStatus(context, { cartId }) {
//     const { collections } = context;
//     const { Cart } = collections;

//     if (!cartId || cartId.length === 0) {
//         throw new ReactionError("not-found", "You must provide a valid cartId");
//     }

//     const cart = await Cart.findOne({ _id: cartId });
//     if (!cart) {
//         throw new ReactionError("not-found", "Cart not found");
//     }

  

//     // Extract relevant fields
//     const productStatuses = cart.items.map((item) => ({
//         itemId: item._id,
//         productId: item.productId
//     }));

   

//     return productStatuses;
// }
