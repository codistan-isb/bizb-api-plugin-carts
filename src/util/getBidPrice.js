import decodeOpaqueId from "@reactioncommerce/api-utils/decodeOpaqueId.js";

/**
 * @summary Get the accepted bid price for a user and product combination
 * @param {Object} context - App context
 * @param {String} userId - User ID
 * @param {String} productId - Product ID
 * @param {String} variantId - Variant ID
 * @returns {Promise<Number|null>} Accepted bid price or null if no valid bid
 */
export default async function getBidPrice(
  context,
  userId,
  productId,
  variantId
) {
  const { collections } = context;
  const { Bids } = collections;

  console.log("PRODUCT ID", productId);
  console.log("VARIANT ID", variantId);
  console.log("USER ID", userId);

  if (!Bids || !userId) {
    return null;
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

    console.log("DECODED PRODUCT ID", decodedProductId);
    console.log("DECODED VARIANT ID", decodedVariantId);

    const acceptedBid = await Bids.findOne({
      productId: decodedProductId,
      variantId: decodedVariantId,
      createdBy: userId,
      status: "closed",
      acceptedOffer: { $exists: true, $ne: null },
    });

    console.log("Accepted Bid", acceptedBid);

    if (acceptedBid && acceptedBid.acceptedOffer) {
      // Check if the accepted offer is still valid (not expired)
      const now = new Date();
      const validTill = new Date(acceptedBid.acceptedOffer.validTill);

      if (now <= validTill) {
        console.log(
          `Found valid accepted bid price: ${acceptedBid.acceptedOffer.amount.amount} for product: ${productId}`
        );
        return acceptedBid.acceptedOffer.amount.amount;
      } else {
        console.log(`Accepted bid expired for product: ${productId}`);
      }
    }
  } catch (error) {
    console.error("Error checking bid price:", error);
  }

  return null;
}
