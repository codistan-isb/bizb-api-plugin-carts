import hashToken from "@reactioncommerce/api-utils/hashToken.js";
import ReactionError from "@reactioncommerce/reaction-error";
import addCartItemsUtil from "../util/addCartItems.js";

/**
 * @method addCartItems
 * @summary Add one or more items to a cart
 * @param {Object} context -  an object containing the per-request state
 * @param {Object} input - mutation input
 * @param {Object} [options] - Options
 * @param {Boolean} [options.skipPriceCheck] - For backwards compatibility, set to `true` to skip checking price.
 *   Skipping this is not recommended for new code.
 * @returns {Promise<Object>} An object with `cart`, `minOrderQuantityFailures`, and `incorrectPriceFailures` properties.
 *   `cart` will always be the full updated cart document, but `incorrectPriceFailures` and
 *   `minOrderQuantityFailures` may still contain other failures that the caller should
 *   optionally retry with the corrected price or quantity.
 */
export default async function addCartItems(context, input, options = {}) {
  const { cartId, items, cartToken } = input;
  const { collections, accountId = null } = context;
  const { Cart } = collections;
  let cartResponse = {};
  // console.log("context test function ", context);

  // console.log("cart context is ", context.mongoDbClientUpdated);

  const session = context.mongoDbClientUpdated.startSession();
  // console.log("mongo session is ", session);

  try {
    await session.withTransaction(async () => {
      let selector;
      if (accountId) {
        // Account cart
        selector = { _id: cartId, accountId };
      } else {
        // Anonymous cart
        if (!cartToken) {
          throw new ReactionError("not-found", "Cart not found");
        }

        selector = { _id: cartId, anonymousAccessToken: hashToken(cartToken) };
      }

      const cart = await Cart.findOne(selector, { session });

      console.log("STEP1: founded cart is ", cart);

      if (!cart) {
        throw new ReactionError("not-found", "Cart not found");
      }

      const {
        incorrectPriceFailures,
        minOrderQuantityFailures,
        updatedItemList,
      } = await addCartItemsUtil(context, cart.items, items, {
        skipPriceCheck: options.skipPriceCheck,
      });

      console.log("STEP 2: updated items list is ", {
        incorrectPriceFailures,
        minOrderQuantityFailures,
        updatedItemList,
      });

      // const updatedCart = {
      //   ...cart,
      //   items: updatedItemList,
      //   updatedAt: new Date()
      // };

      const updatedCart = {
        ...cart,
        items: updatedItemList,
        billing: [],
        discount: 0.0,
        updatedAt: new Date(),
      };

      const savedCart = await context.mutations.saveCart(
        context,
        updatedCart,
        session
      );

      console.log("STEP 3: saved Cart is ", savedCart);

      cartResponse = {
        cart: savedCart,
        incorrectPriceFailures,
        minOrderQuantityFailures,
      };
    });
    return cartResponse;
  } catch (err) {
    console.log("error in add cart mutation", err);
  } finally {
    await session.endSession();
  }
}
