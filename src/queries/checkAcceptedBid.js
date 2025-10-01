import getBidPrice from "../util/getBidPrice.js";
import decodeOpaqueId from "@reactioncommerce/api-utils/decodeOpaqueId.js";

/**
 * @method checkAcceptedBid
 * @summary Check if user has an accepted bid for a product
 * @param {Object} context - an object containing the per-request state
 * @param {Object} args - query arguments
 * @param {String} args.productId - Product ID
 * @param {String} args.variantId - Variant ID
 * @returns {Promise<Object>} Accepted bid information
 */
export default async function checkAcceptedBid(context, args) {
  const { productId, variantId } = args;
  const { collections } = context;
  const { Bids } = collections;

  // Use accountId if userId is not available
  const userId = context.userId || context.accountId;

  if (!userId) {
    throw new Error("Authentication required");
  }

  if (!Bids) {
    return {
      hasAcceptedBid: false,
      bidPrice: null,
      isValid: false,
      validTill: null,
      bidId: null,
    };
  }

  try {
    // Decode opaque IDs to get actual database IDs
    let decodedProductId = productId;
    let decodedVariantId = variantId;

    try {
      const decodedProduct = decodeOpaqueId(productId);
      if (decodedProduct.id !== productId) {
        decodedProductId = decodedProduct.id;
      }
    } catch (e) {
      // If decode fails, use original ID
      console.log("Product ID decode failed, using original:", productId);
    }

    try {
      const decodedVariant = decodeOpaqueId(variantId);
      if (decodedVariant.id !== variantId) {
        decodedVariantId = decodedVariant.id;
      }
    } catch (e) {
      // If decode fails, use original ID
      console.log("Variant ID decode failed, using original:", variantId);
    }

    const acceptedBid = await Bids.findOne({
      productId: decodedProductId,
      variantId: decodedVariantId,
      createdBy: userId,
      status: "closed",
      acceptedOffer: { $exists: true, $ne: null },
    });

    if (acceptedBid && acceptedBid.acceptedOffer) {
      const now = new Date();
      const validTill = new Date(acceptedBid.acceptedOffer.validTill);
      const isValid = now <= validTill;

      return {
        hasAcceptedBid: true,
        bidPrice: {
          amount: acceptedBid.acceptedOffer.amount.amount,
          currencyCode: acceptedBid.acceptedOffer.amount.currencyCode,
        },
        isValid: isValid,
        validTill: validTill,
        bidId: acceptedBid._id,
      };
    }

    return {
      hasAcceptedBid: false,
      bidPrice: null,
      isValid: false,
      validTill: null,
      bidId: null,
    };
  } catch (error) {
    console.error("Error checking accepted bid:", error);
    return {
      hasAcceptedBid: false,
      bidPrice: null,
      isValid: false,
      validTill: null,
      bidId: null,
    };
  }
}
