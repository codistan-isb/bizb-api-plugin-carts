import hashToken from "@reactioncommerce/api-utils/hashToken.js";
import ReactionError from "@reactioncommerce/reaction-error";
import addCartItemsUtil from "../util/addCartItems.js";

// A simple in-memory store for locks (can be replaced by Redis or any other locking mechanism)
const cartLocks = {};

/**
 * @method lockCart
 * @summary Lock the cart to prevent concurrent updates
 * @param {String} cartId - The ID of the cart to lock
 */
function lockCart(cartId) {
  return new Promise((resolve, reject) => {
    const interval = setInterval(() => {
      if (!cartLocks[cartId]) {
        cartLocks[cartId] = true; // Lock the cart
        clearInterval(interval);
        resolve();
      }
    }, 50); // Check every 100ms for lock availability
  });
}

/**
 * @method unlockCart
 * @summary Unlock the cart after updating
 * @param {String} cartId - The ID of the cart to unlock
 */
function unlockCart(cartId) {
  cartLocks[cartId] = false; // Release the cart lock
}

/**
 * @method addCartOptimize
 * @summary Add one or more items to a cart, with locking to prevent concurrency issues
 * @param {Object} context - an object containing the per-request state
 * @param {Object} input - mutation input
 * @param {Object} [options] - Options
 * @param {Boolean} [options.skipPriceCheck] - Set to `true` to skip checking price.
 * @returns {Promise<Object>} An object with `cart`, `minOrderQuantityFailures`, and `incorrectPriceFailures` properties.
 */
export default async function addCartOptimize(context, input, options = {}) {
  const { cartId, items, cartToken } = input;
  const { collections, accountId = null } = context;
  const { Cart } = collections;

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

  // Lock the cart before proceeding
  await lockCart(cartId);

  try {
    const cart = await Cart.findOne(selector);

    if (!cart) {
      throw new ReactionError("not-found", "Cart not found");
    }

    const {
      incorrectPriceFailures,
      minOrderQuantityFailures,
      updatedItemList,
    } = await processItemsWithConcurrency(context, cart, items, options);

    // Prepare the final cart update with all items
    const updatedCart = {
      ...cart,
      items: updatedItemList,
      billing: cart.billing || [],
      discount: cart.discount || 0.0,
      updatedAt: new Date(),
    };

    // Save the updated cart atomically
    const savedCart = await context.mutations.saveCart(context, updatedCart);

    return {
      cart: savedCart,
      incorrectPriceFailures,
      minOrderQuantityFailures,
    };
  } finally {
    // Always unlock the cart when done, even if there's an error
    unlockCart(cartId);
  }
}

/**
 * Process items one by one and handle concurrency issues.
 * @param {Object} context - an object containing the per-request state
 * @param {Object} cart - the current cart object
 * @param {Array} items - the list of items to add
 * @param {Object} options - the options to control behavior like skipping price checks
 * @returns {Object} The result containing updated item list and failure reasons
 */
async function processItemsWithConcurrency(context, cart, items, options) {
  const incorrectPriceFailures = [];
  const minOrderQuantityFailures = [];
  const updatedItemList = [...cart.items];

  for (const item of items) {
    try {
      const {
        incorrectPriceFailures: priceFailures,
        minOrderQuantityFailures: quantityFailures,
        updatedItemList: newItemList,
      } = await addCartItemsUtil(context, updatedItemList, [item], {
        skipPriceCheck: options.skipPriceCheck,
      });

      // Avoid duplicates
      newItemList.forEach((newItem) => {
        if (
          !updatedItemList.find(
            (existingItem) => existingItem._id === newItem._id
          )
        ) {
          updatedItemList.push(newItem);
        }
      });

      incorrectPriceFailures.push(...priceFailures);
      minOrderQuantityFailures.push(...quantityFailures);
    } catch (error) {
      console.error(`Failed to add item: ${item._id}`, error);
    }
  }

  return { incorrectPriceFailures, minOrderQuantityFailures, updatedItemList };
}
