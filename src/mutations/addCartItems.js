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

  console.log("CART TOKEN", cartToken);

  // console.log("ACCOUNT ID", accountId);
  let selector;
  if (accountId) {
    // Account cart
    selector = { _id: cartId, accountId };
  } else {
    // Anonymous cart

    console.log("CART TOKEN ", cartToken);
    if (!cartToken) {
      throw new ReactionError("not-found", "Cart not found");
    }

    selector = { _id: cartId, anonymousAccessToken: hashToken(cartToken) };
    // selector = { _id: cartId, anonymousAccessToken:cartToken };

    console.log("CART TOKEN  jjjjj", selector.anonymousAccessToken);
  }

  console.log("SELECTOR", selector);
  const cart = await Cart.findOne(selector);

  if (!cart) {
    throw new ReactionError("not-found", "Cart not found");
  }

  const { incorrectPriceFailures, minOrderQuantityFailures, updatedItemList } =
    await addCartItemsUtil(context, cart.items, items, {
      skipPriceCheck: options.skipPriceCheck,
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

  // cosnole.log("UPDATE CART =======", updateCart);

  const savedCart = await context.mutations.saveCart(context, updatedCart);

  // console.log("SAVED CART ======= ", savedCart);

  return { cart: savedCart, incorrectPriceFailures, minOrderQuantityFailures };
}

// import hashToken from "@reactioncommerce/api-utils/hashToken.js";
// import ReactionError from "@reactioncommerce/reaction-error";
// import addCartItemsUtil from "../util/addCartItems.js";

// // A simple in-memory store for locks (can be replaced by Redis or any other locking mechanism)
// const cartLocks = {};

// /**
//  * @method lockCart
//  * @summary Lock the cart to prevent concurrent updates
//  * @param {String} cartId - The ID of the cart to lock
//  */
// function lockCart(cartId) {
//   return new Promise((resolve, reject) => {
//     const interval = setInterval(() => {
//       if (!cartLocks[cartId]) {
//         cartLocks[cartId] = true; // Lock the cart
//         clearInterval(interval);
//         resolve();
//       }
//     }, 50); // Check every 100ms for lock availability
//   });
// }

// /**
//  * @method unlockCart
//  * @summary Unlock the cart after updating
//  * @param {String} cartId - The ID of the cart to unlock
//  */
// function unlockCart(cartId) {
//   cartLocks[cartId] = false; // Release the cart lock
// }

// /**
//  * @method addCartItems
//  * @summary Add one or more items to a cart, with locking to prevent concurrency issues
//  * @param {Object} context - an object containing the per-request state
//  * @param {Object} input - mutation input
//  * @param {Object} [options] - Options
//  * @param {Boolean} [options.skipPriceCheck] - Set to `true` to skip checking price.
//  * @returns {Promise<Object>} An object with `cart`, `minOrderQuantityFailures`, and `incorrectPriceFailures` properties.
//  */
// export default async function addCartItems(context, input, options = {}) {
//   const { cartId, items, cartToken } = input;
//   const { collections, accountId = null } = context;
//   const { Cart } = collections;

//   let selector;
//   if (accountId) {
//     // Account cart
//     selector = { _id: cartId, accountId };
//   } else {
//     // Anonymous cart
//     if (!cartToken) {
//       throw new ReactionError("not-found", "Cart not found");
//     }
//     selector = { _id: cartId, anonymousAccessToken: hashToken(cartToken) };
//   }

//   // Lock the cart before proceeding
//   await lockCart(cartId);

//   try {
//     const cart = await Cart.findOne(selector);

//     if (!cart) {
//       throw new ReactionError("not-found", "Cart not found");
//     }

//     const {
//       incorrectPriceFailures,
//       minOrderQuantityFailures,
//       updatedItemList,
//     } = await processItemsWithConcurrency(context, cart, items, options);

//     // Prepare the final cart update with all items
//     const updatedCart = {
//       ...cart,
//       items: updatedItemList,
//       billing: cart.billing || [],
//       discount: cart.discount || 0.0,
//       updatedAt: new Date(),
//     };

//     // Save the updated cart atomically
//     const savedCart = await context.mutations.saveCart(context, updatedCart);

//     return {
//       cart: savedCart,
//       incorrectPriceFailures,
//       minOrderQuantityFailures,
//     };
//   } finally {
//     // Always unlock the cart when done, even if there's an error
//     unlockCart(cartId);
//   }
// }

// /**
//  * Process items one by one and handle concurrency issues.
//  * @param {Object} context - an object containing the per-request state
//  * @param {Object} cart - the current cart object
//  * @param {Array} items - the list of items to add
//  * @param {Object} options - the options to control behavior like skipping price checks
//  * @returns {Object} The result containing updated item list and failure reasons
//  */
// async function processItemsWithConcurrency(context, cart, items, options) {
//   const incorrectPriceFailures = [];
//   const minOrderQuantityFailures = [];
//   const updatedItemList = [...cart.items];

//   for (const item of items) {
//     try {
//       const {
//         incorrectPriceFailures: priceFailures,
//         minOrderQuantityFailures: quantityFailures,
//         updatedItemList: newItemList,
//       } = await addCartItemsUtil(context, updatedItemList, [item], {
//         skipPriceCheck: options.skipPriceCheck,
//       });

//       // Avoid duplicates
//       newItemList.forEach((newItem) => {
//         if (
//           !updatedItemList.find(
//             (existingItem) => existingItem._id === newItem._id
//           )
//         ) {
//           updatedItemList.push(newItem);
//         }
//       });

//       incorrectPriceFailures.push(...priceFailures);
//       minOrderQuantityFailures.push(...quantityFailures);
//     } catch (error) {
//       console.error(`Failed to add item: ${item._id}`, error);
//     }
//   }

//   return { incorrectPriceFailures, minOrderQuantityFailures, updatedItemList };
// }

// import hashToken from "@reactioncommerce/api-utils/hashToken.js";
// import ReactionError from "@reactioncommerce/reaction-error";
// import addCartItemsUtil from "../util/addCartItems.js";
// import Redis from "ioredis"; // Redis client for Node.js

// // Initialize Redis connection
// const redisClient = new Redis({
//   port: 6379,
//   host: "redis-svc", // Replace with actual Redis host
// });

// const REDIS_CART_QUEUE_KEY = "cartQueue"; // Redis key for the cart queue

// /**
//  * @method lockCart
//  * @summary Adds the cart to the Redis queue to ensure it is processed one at a time
//  * @param {String} cartId - The ID of the cart to lock
//  * @returns {Promise<boolean>} Returns true if the cart was added to the queue, false if already in queue
//  */
// async function lockCart(cartId) {
//   const lockKey = `cartLock:${cartId}`;

//   // Use Redis set with EX (expiry) option to set a lock for a short period
//   const lock = await redisClient.set(lockKey, "locked", "NX", "EX", 30); // Lock for 30 seconds

//   if (!lock) {
//     return false; // Cart is already locked
//   }

//   return true; // Cart successfully locked
// }

// /**
//  * @method unlockCart
//  * @summary Removes the cart lock after processing
//  * @param {String} cartId - The ID of the cart to unlock
//  */
// async function unlockCart(cartId) {
//   const lockKey = `cartLock:${cartId}`;
//   await redisClient.del(lockKey); // Remove the cart lock
// }

// /**
//  * @method addCartItems
//  * @summary Add one or more items to a cart, with Redis queue locking to prevent concurrency issues
//  * @param {Object} context - an object containing the per-request state
//  * @param {Object} input - mutation input
//  * @param {Object} [options] - Options
//  * @param {Boolean} [options.skipPriceCheck] - Set to `true` to skip checking price.
//  * @returns {Promise<Object>} An object with `cart`, `minOrderQuantityFailures`, and `incorrectPriceFailures` properties.
//  */
// export default async function addCartItems(context, input, options = {}) {
//   const { cartId, items, cartToken } = input;
//   const { collections, accountId = null } = context;
//   const { Cart } = collections;

//   let selector;
//   if (accountId) {
//     // Account cart
//     selector = { _id: cartId, accountId };
//   } else {
//     // Anonymous cart
//     if (!cartToken) {
//       throw new ReactionError("not-found", "Cart not found");
//     }
//     selector = { _id: cartId, anonymousAccessToken: hashToken(cartToken) };
//   }

//   // Lock the cart by adding it to the Redis queue
//   const cartLocked = await lockCart(cartId);

//   if (!cartLocked) {
//     // If the cart is already locked, instead of returning an error, retry after a delay
//     console.log(
//       `Cart ${cartId} is already locked, waiting for it to be available...`
//     );

//     // Poll every 500ms until the cart becomes available
//     await waitForUnlock(cartId);

//     // Now retry locking after waiting
//     const retryLock = await lockCart(cartId);

//     if (!retryLock) {
//       throw new ReactionError(
//         "cart-locked",
//         "This cart is still being processed after waiting."
//       );
//     }
//   }

//   try {
//     const cart = await Cart.findOne(selector);

//     if (!cart) {
//       throw new ReactionError("not-found", "Cart not found");
//     }

//     const {
//       incorrectPriceFailures,
//       minOrderQuantityFailures,
//       updatedItemList,
//     } = await processItemsWithConcurrency(context, cart, items, options);

//     // Prepare the final cart update with all items
//     const updatedCart = {
//       ...cart,
//       items: updatedItemList,
//       billing: cart.billing || [],
//       discount: cart.discount || 0.0,
//       updatedAt: new Date(),
//     };

//     // Save the updated cart atomically
//     const savedCart = await context.mutations.saveCart(context, updatedCart);

//     return {
//       cart: savedCart,
//       incorrectPriceFailures,
//       minOrderQuantityFailures,
//     };
//   } finally {
//     // Always unlock the cart when done, even if there's an error
//     await unlockCart(cartId);
//   }
// }

// /**
//  * Wait for the cart to be unlocked before processing the next request
//  * @param {String} cartId - The ID of the cart to wait for
//  * @returns {Promise<void>} Resolves when the cart is unlocked
//  */
// async function waitForUnlock(cartId) {
//   const lockKey = `cartLock:${cartId}`;

//   // Poll Redis every 500ms to check if the lock has been removed
//   while ((await redisClient.get(lockKey)) === "locked") {
//     await new Promise((resolve) => setTimeout(resolve, 500)); // Wait for 500ms
//   }
// }

// /**
//  * Process items one by one and handle concurrency issues.
//  * @param {Object} context - an object containing the per-request state
//  * @param {Object} cart - the current cart object
//  * @param {Array} items - the list of items to add
//  * @param {Object} options - the options to control behavior like skipping price checks
//  * @returns {Object} The result containing updated item list and failure reasons
//  */
// async function processItemsWithConcurrency(context, cart, items, options) {
//   const incorrectPriceFailures = [];
//   const minOrderQuantityFailures = [];
//   const updatedItemList = [...cart.items];

//   for (const item of items) {
//     try {
//       const {
//         incorrectPriceFailures: priceFailures,
//         minOrderQuantityFailures: quantityFailures,
//         updatedItemList: newItemList,
//       } = await addCartItemsUtil(context, updatedItemList, [item], {
//         skipPriceCheck: options.skipPriceCheck,
//       });

//       // Avoid duplicates
//       newItemList.forEach((newItem) => {
//         if (
//           !updatedItemList.find(
//             (existingItem) => existingItem._id === newItem._id
//           )
//         ) {
//           updatedItemList.push(newItem);
//         }
//       });

//       incorrectPriceFailures.push(...priceFailures);
//       minOrderQuantityFailures.push(...quantityFailures);
//     } catch (error) {
//       console.error(`Failed to add item: ${item._id}`, error);
//     }
//   }

//   return { incorrectPriceFailures, minOrderQuantityFailures, updatedItemList };
// }
