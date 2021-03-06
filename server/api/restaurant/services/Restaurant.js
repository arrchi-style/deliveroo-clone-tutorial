/* global Restaurant */
'use strict';

/**
 * Restaurant.js service
 *
 * @description: A set of functions similar to controller's actions to avoid code duplication.
 */

// Public dependencies.
const _ = require('lodash');

// Strapi utilities.
const utils = require('strapi-hook-bookshelf/lib/utils/');
const { convertRestQueryParams, buildQuery } = require('strapi-utils');

var redis = require('redis');
var client = redis.createClient();

client.on('connect', function () {
  console.log('Redis client connected');
});

client.on('error', function (err) {
  console.log('Something went wrong ' + err);
});

//Its not working yet
function getCache(req, res, next) {
  console.log('getCache Working');
  // const org = req.query.org;
  // client.get(org, function (err, data) {
  //     if (err) throw err;

  //     console.log('getCache --- > ', data)
  //     if (data != null) {
  //         return res.send(respond(org, data));
  //     } else {
  //         return null;
  //     }
  // });
}

module.exports = {

  /**
   * Promise to fetch all restaurants.
   *
   * @return {Promise}
   */


  fetchAll: (params, populate) => {

    //   // Select field to populate.
    //   const withRelated = populate || Restaurant.associations
    //   .filter(ast => ast.autoPopulate !== false)
    //   .map(ast => ast.alias);

    // const filters = convertRestQueryParams(params);

    // console.log('Result', Restaurant.query(buildQuery({ model: Restaurant, filters }))
    // .fetchAll({ withRelated })
    // .then(data => data.toJSON()))

    // return Restaurant.query(buildQuery({ model: Restaurant, filters }))
    //   .fetchAll({ withRelated })
    //   .then(data => data.toJSON());

    return new Promise((res, rej) => {
      client.get('http://localhost:1337/restaurants', async (error, result) => {
        try {
          if (error) {
            return res(error);
          }

          client.ttl('http://localhost:1337/restaurants', function (err, data) {
            console.log('TTL ---> ', data);
          });

          if (result === null && data > 0) {
            try {
              //if we dont have data in radis take it from strapi

              // Select field to populate.
              const withRelated = populate || await Restaurant.associations
                .filter(ast => ast.autoPopulate !== false)
                .map(ast => ast.alias);

              const filters = convertRestQueryParams(params);

              let data = await Restaurant.query(buildQuery({ model: Restaurant, filters }))
                .fetchAll({ withRelated });
              data.toJSON();


              //need to stringify obj before send to redis
              let jsonData = JSON.stringify(data);
              // console.log('jsonData ---> ', jsonData);

              client.set('http://localhost:1337/restaurants', jsonData, redis.print);

              //give an expiration time to an existing key 
              client.expire('http://localhost:1337/restaurants', 900);

              console.log('STRAPI', data);
            }
            catch{
              //need to take data if something wrong with strapi
            }
            return res(data);
          }

          console.log('REDIS');

          return res(result);

        } catch (err) {
          console.log(err);
          return err;
        }
      });
    })


  },

  /**
   * Promise to fetch a/an restaurant.
   *
   * @return {Promise}
   */

  fetch: (params) => {
    // Select field to populate.
    const populate = Restaurant.associations
      .filter(ast => ast.autoPopulate !== false)
      .map(ast => ast.alias);

    return Restaurant.forge(_.pick(params, 'id')).fetch({
      withRelated: populate
    });
  },

  /**
   * Promise to count a/an restaurant.
   *
   * @return {Promise}
   */

  count: (params) => {
    // Convert `params` object to filters compatible with Bookshelf.
    const filters = convertRestQueryParams(params);

    return Restaurant.query(buildQuery({ model: Restaurant, filters: _.pick(filters, 'where') })).count();
  },

  /**
   * Promise to add a/an restaurant.
   *
   * @return {Promise}
   */

  add: async (values) => {
    // Extract values related to relational data.
    const relations = _.pick(values, Restaurant.associations.map(ast => ast.alias));
    const data = _.omit(values, Restaurant.associations.map(ast => ast.alias));

    // Create entry with no-relational data.
    const entry = await Restaurant.forge(data).save();

    // Create relational data and return the entry.
    return Restaurant.updateRelations({ id: entry.id, values: relations });
  },

  /**
   * Promise to edit a/an restaurant.
   *
   * @return {Promise}
   */

  edit: async (params, values) => {
    // Extract values related to relational data.
    const relations = _.pick(values, Restaurant.associations.map(ast => ast.alias));
    const data = _.omit(values, Restaurant.associations.map(ast => ast.alias));

    // Create entry with no-relational data.
    const entry = await Restaurant.forge(params).save(data);

    // Create relational data and return the entry.
    return Restaurant.updateRelations(Object.assign(params, { values: relations }));
  },

  /**
   * Promise to remove a/an restaurant.
   *
   * @return {Promise}
   */

  remove: async (params) => {
    params.values = {};
    Restaurant.associations.map(association => {
      switch (association.nature) {
        case 'oneWay':
        case 'oneToOne':
        case 'manyToOne':
        case 'oneToManyMorph':
          params.values[association.alias] = null;
          break;
        case 'oneToMany':
        case 'manyToMany':
        case 'manyToManyMorph':
          params.values[association.alias] = [];
          break;
        default:
      }
    });

    await Restaurant.updateRelations(params);

    return Restaurant.forge(params).destroy();
  },

  /**
   * Promise to search a/an restaurant.
   *
   * @return {Promise}
   */

  search: async (params) => {
    // Convert `params` object to filters compatible with Bookshelf.
    const filters = strapi.utils.models.convertParams('restaurant', params);
    // Select field to populate.
    const populate = Restaurant.associations
      .filter(ast => ast.autoPopulate !== false)
      .map(ast => ast.alias);

    const associations = Restaurant.associations.map(x => x.alias);
    const searchText = Object.keys(Restaurant._attributes)
      .filter(attribute => attribute !== Restaurant.primaryKey && !associations.includes(attribute))
      .filter(attribute => ['string', 'text'].includes(Restaurant._attributes[attribute].type));

    const searchInt = Object.keys(Restaurant._attributes)
      .filter(attribute => attribute !== Restaurant.primaryKey && !associations.includes(attribute))
      .filter(attribute => ['integer', 'decimal', 'float'].includes(Restaurant._attributes[attribute].type));

    const searchBool = Object.keys(Restaurant._attributes)
      .filter(attribute => attribute !== Restaurant.primaryKey && !associations.includes(attribute))
      .filter(attribute => ['boolean'].includes(Restaurant._attributes[attribute].type));

    const query = (params._q || '').replace(/[^a-zA-Z0-9.-\s]+/g, '');

    return Restaurant.query(qb => {
      if (!_.isNaN(_.toNumber(query))) {
        searchInt.forEach(attribute => {
          qb.orWhereRaw(`${attribute} = ${_.toNumber(query)}`);
        });
      }

      if (query === 'true' || query === 'false') {
        searchBool.forEach(attribute => {
          qb.orWhereRaw(`${attribute} = ${_.toNumber(query === 'true')}`);
        });
      }

      // Search in columns with text using index.
      switch (Restaurant.client) {
        case 'mysql':
          qb.orWhereRaw(`MATCH(${searchText.join(',')}) AGAINST(? IN BOOLEAN MODE)`, `*${query}*`);
          break;
        case 'pg': {
          const searchQuery = searchText.map(attribute =>
            _.toLower(attribute) === attribute
              ? `to_tsvector(${attribute})`
              : `to_tsvector('${attribute}')`
          );

          qb.orWhereRaw(`${searchQuery.join(' || ')} @@ to_tsquery(?)`, query);
          break;
        }
      }

      if (filters.sort) {
        qb.orderBy(filters.sort.key, filters.sort.order);
      }

      if (filters.skip) {
        qb.offset(_.toNumber(filters.skip));
      }

      if (filters.limit) {
        qb.limit(_.toNumber(filters.limit));
      }
    }).fetchAll({
      withRelated: populate
    });
  }
};

