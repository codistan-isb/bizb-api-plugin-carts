import ReactionError from "@reactioncommerce/reaction-error";
import { encodeProductOpaqueId, decodeProductOpaqueId } from "../xforms/id.js";

/**
 * @name checkSoldProduct
 * @method
 * @memberof Cart/NoMeteorQueries
 * @summary Query the Catalog collection for products and check if they are sold out.
 * @param {Object} context - an object containing the per-request state
 * @param {Object} params - request parameters
 * @param {Array<String>} params.productIds - Array of product IDs to check
 * @returns {Promise<Array<Object>>} - An array of ProductSoldOutStatus objects indicating if the products are sold out.
 */
export default async function checkSoldProduct(context, { productIds } = { productIds: [] }) {
    const { collections } = context;
    const { Catalog } = collections;

    if (!productIds || productIds.length === 0) {
        throw new ReactionError("not-found", "You must provide at least one productId");
    }

    const products = await Catalog.find({
        "product._id": { $in: decodeProductOpaqueId(productIds) },
        "product.isSoldOut": true
    }).toArray();

    return products.map(({ product }) => {
        const { _id, title } = product;
        const message = `The product "${title}" is sold out. Please remove it from your cart.`;

        return {
            productId: encodeProductOpaqueId(_id),
            isSoldOut: true,
            message
        };
    });
}




// /**
//  * @name checkSoldProduct
//  * @method
//  * @memberof Cart/NoMeteorQueries
//  * @summary Query the Catalog collection for products and check if they are sold out.
//  * @param {Object} context - an object containing the per-request state
//  * @param {Object} params - request parameters
//  * @param {Array<String>} params.productIds - Array of product IDs to check
//  * @returns {Promise<Array<Object>>} - An array of ProductSoldOutStatus objects indicating if the products are sold out.
//  */
// export default async function checkSoldProduct(context, { productIds } = { productIds: [] }) {
//     const { collections } = context;
//     const { Catalog } = collections;

//     if (!productIds || productIds.length === 0) {
//         throw new ReactionError("not-found", "None of the products were found");
//     }

//     const products = await Catalog.find({
//         "product._id": { $in: productIds }
//     }).toArray();

//     if (!products.length) {
//         throw new ReactionError("not-found", "None of the products were found");
//     }

//     return products.map(({ product }) => {
//         const { _id, title, isSoldOut } = product;
//         const message = isSoldOut
//             ? `The product "${title}" is sold out. Please remove it from your cart.`
//             : `The product "${title}" is available.`;

//         return {
//             productId: _id,
//             isSoldOut: !!isSoldOut,
//             message
//         };
//     });
// }
