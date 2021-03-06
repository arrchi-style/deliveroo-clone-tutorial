'use strict';

/**
 * Restaurant.js controller
 *
 * @description: A set of functions called "actions" for managing `Restaurant`.
 */

module.exports = {

  /**
   * Retrieve restaurant records.
   *
   * @return {Object|Array}
   */

  find: async (ctx, next, { populate } = {}) => {
    if (ctx.query._q) {
      return strapi.services.restaurant.search(ctx.query);
    } else {
      // console.log('DAtA IN CONTROLLER ---> ', strapi.services.restaurant.fetchAll(ctx.query, populate))
      return strapi.services.restaurant.fetchAll(ctx.query, populate);
    }
  },

  /**
   * Retrieve a restaurant record.
   *
   * @return {Object}
   */

  findOne: async (ctx) => {
    return strapi.services.restaurant.fetch(ctx.params);
  },

  /**
   * Count restaurant records.
   *
   * @return {Number}
   */

  count: async (ctx, next, { populate } = {}) => {
    return strapi.services.restaurant.count(ctx.query, populate);
  },

  /**
   * Create a/an restaurant record.
   *
   * @return {Object}
   */

  create: async (ctx) => {
    return strapi.services.restaurant.add(ctx.request.body);
  },

  /**
   * Update a/an restaurant record.
   *
   * @return {Object}
   */

  update: async (ctx, next) => {
    return strapi.services.restaurant.edit(ctx.params, ctx.request.body) ;
  },

  /**
   * Destroy a/an restaurant record.
   *
   * @return {Object}
   */

  destroy: async (ctx, next) => {
    return strapi.services.restaurant.remove(ctx.params);
  }
};
