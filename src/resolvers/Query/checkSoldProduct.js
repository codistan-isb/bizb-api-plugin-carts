

// import { decodeProductOpaqueId } from "../../xforms/id.js";
// import ReactionError from "@reactioncommerce/reaction-error";

// /**
//  * @name Query.checkSoldProducts
//  * @method
//  * @memberof Cart/GraphQL
//  * @summary Checks if products are sold out.
//  * @param {Object} parentResult - unused
//  * @param {Object} args - An object of all arguments that were sent by the client
//  * @param {String[]} args.productIds - Array of product IDs to check
//  * @param {Object} context - An object containing the per-request state
//  * @returns {Promise<Object>|undefined} An array of ProductSoldOutStatus
//  */
// export default async function checkSoldProducts(
//     parentResult,
//     { itemsId },
//     context
// ) {
//     if (!itemsId || itemsId.length === 0) {
//         throw new ReactionError("invalid-param", "You must provide at least one productId");
//     }

//     // const decodedIds = itemsId.map(id => decodeProductOpaqueId(id));


//     return context.queries.checkSoldProduct(context, {
//         itemsId
//     });
// }





import { decodeCartOpaqueId } from "../../xforms/id.js";
import ReactionError from "@reactioncommerce/reaction-error";

/**
 * @name Query.checkSoldProducts
 * @method
 * @memberof Cart/GraphQL
 * @summary Checks if products are sold out.
 * @param {Object} parentResult - unused
 * @param {Object} args - An object of all arguments that were sent by the client
 * @param {String[]} args.productIds - Array of product IDs to check
 * @param {Object} context - An object containing the per-request state
 * @returns {Promise<Object>|undefined} An array of ProductSoldOutStatus
 */
export default async function checkSoldProducts(
    parentResult,
    { cartId },
    context
) {
    if (!cartId || cartId.length === 0) {
        throw new ReactionError("invalid-param", "You must provide at least one productId");
    }

    const decodedIds = decodeCartOpaqueId(cartId);
    console.log("DEOCDE ID", decodedIds);


    return context.queries.checkSoldProduct(context, {
        cartId: decodeCartOpaqueId(cartId)
    });
}

