import checkAcceptedBid from "../../queries/checkAcceptedBid.js";

/**
 * @method checkAcceptedBid
 * @summary GraphQL resolver for checking accepted bid
 * @param {Object} parentResult - Parent result
 * @param {Object} args - Query arguments
 * @param {Object} context - App context
 * @returns {Promise<Object>} Accepted bid information
 */
export default async function checkAcceptedBidResolver(
  parentResult,
  args,
  context
) {
  return checkAcceptedBid(context, args);
}
