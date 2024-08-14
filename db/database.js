
// Connecting to Database
const { Pool } = require('pg');

const pool = new Pool({
  user: 'damanbual',
  password: '',
  host: 'localhost',
  database: 'lightbnb'
});

// Verifing Connection
pool.query(`SELECT title FROM properties LIMIT 10;`)
  .then(response => {
    console.log(response.rows);
  })
  .catch(err => {
    console.error('Connection error', err.stack);
  });

const properties = require("./json/properties.json");
const users = require("./json/users.json");

/// Users

/**
 * Get a single user from the database given their email.
 * @param {String} email The email of the user.
 * @return {Promise<{}>} A promise to the user.
 */

const getUserWithEmail = function (email) {
  const queryString = `
    SELECT * 
    FROM users 
    WHERE email = $1;
  `;
  const values = [email];

  return pool.query(queryString, values)
    .then((result) => {
      if (result.rows.length > 0) {
        return result.rows[0];
      }
      return null;
    })
    .catch((err) => console.error('query error', err.stack));
};

/**
 * Get a single user from the database given their id.
 * @param {string} id The id of the user.
 * @return {Promise<{}>} A promise to the user.
 */

const getUserWithId = function (id) {
  const queryString = `
    SELECT * 
    FROM users 
    WHERE id = $1;
  `;
  const values = [id];

  return pool.query(queryString, values)
    .then((result) => {
      if (result.rows.length > 0) {
        return result.rows[0];
      }
      return null;
    })
    .catch((err) => console.error('query error', err.stack));
};


/**
 * Add a new user to the database.
 * @param {{name: string, password: string, email: string}} user
 * @return {Promise<{}>} A promise to the user.
 */

const addUser = function (user) {
  const queryString = `
    INSERT INTO users (name, email, password)
    VALUES ($1, $2, $3)
    RETURNING *;
  `;
  const values = [user.name, user.email, user.password];

  return pool.query(queryString, values)
    .then((result) => {
      return result.rows[0];
    })
    .catch((err) => console.error('query error', err.stack));
};



/// Reservations

/**
 * Get all reservations for a single user.
 * @param {string} guest_id The id of the user.
 * @return {Promise<[{}]>} A promise to the reservations.
 */
const getAllReservations = function (guest_id, limit = 10) {
  const queryString = `
    SELECT reservations.*, properties.*, AVG(property_reviews.rating) as average_rating
    FROM reservations
    JOIN properties ON reservations.property_id = properties.id
    LEFT JOIN property_reviews ON properties.id = property_reviews.property_id
    WHERE reservations.guest_id = $1
    GROUP BY reservations.id, properties.id
    ORDER BY reservations.start_date
    LIMIT $2;
  `;
  const queryParams = [guest_id, limit];

  return pool.query(queryString, queryParams)
    .then((result) => result.rows)
    .catch((err) => console.error('query error', err.stack));
};

/// Properties

/**
 * Get all properties.
 * @param {{}} options An object containing query options.
 * @param {*} limit The number of results to return.
 * @return {Promise<[{}]>}  A promise to the properties.
 */

const getAllProperties = function (options, limit = 10) {
  // 1. Initialize an array to store query parameters
  const queryParams = [];

  // 2. Begin building the query string
  let queryString = `
    SELECT properties.*, avg(property_reviews.rating) as average_rating
    FROM properties
    LEFT JOIN property_reviews ON properties.id = property_reviews.property_id
  `;

  // 3. Add filtering based on options
  if (options.city) {
    queryParams.push(`%${options.city}%`);
    queryString += `WHERE city LIKE $${queryParams.length} `;
  }

  if (options.owner_id) {
    queryParams.push(options.owner_id);
    queryString += `${queryParams.length === 1 ? 'WHERE' : 'AND'} owner_id = $${queryParams.length} `;
  }

  if (options.minimum_price_per_night) {
    queryParams.push(options.minimum_price_per_night * 100);
    queryString += `${queryParams.length === 1 ? 'WHERE' : 'AND'} cost_per_night >= $${queryParams.length} `;
  }

  if (options.maximum_price_per_night) {
    queryParams.push(options.maximum_price_per_night * 100);
    queryString += `${queryParams.length === 1 ? 'WHERE' : 'AND'} cost_per_night <= $${queryParams.length} `;
  }

  if (options.minimum_rating) {
    queryParams.push(options.minimum_rating);
    queryString += `${queryParams.length === 1 ? 'WHERE' : 'AND'} avg(property_reviews.rating) >= $${queryParams.length} `;
  }

  // 4. Finalize the query string with GROUP BY, ORDER BY, and LIMIT clauses
  queryParams.push(limit);
  queryString += `
    GROUP BY properties.id
    ORDER BY cost_per_night
    LIMIT $${queryParams.length};
  `;

  // 5. Log the query and parameters for debugging purposes
  console.log(queryString, queryParams);

  // 6. Execute the query and return the result as a promise
  return pool.query(queryString, queryParams).then((res) => res.rows);
};

/**
 * Add a property to the database
 * @param {{}} property An object containing all of the property details.
 * @return {Promise<{}>} A promise to the property.
 */
const addProperty = function (property) {
  const queryParams = [
    property.owner_id,
    property.title,
    property.description,
    property.thumbnail_photo_url,
    property.cover_photo_url,
    property.cost_per_night,
    property.street,
    property.city,
    property.province,
    property.post_code,
    property.country,
    property.parking_spaces,
    property.number_of_bathrooms,
    property.number_of_bedrooms,
  ];

  const queryString = `
    INSERT INTO properties (
      owner_id,
      title,
      description,
      thumbnail_photo_url,
      cover_photo_url,
      cost_per_night,
      street,
      city,
      province,
      post_code,
      country,
      parking_spaces,
      number_of_bathrooms,
      number_of_bedrooms
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    RETURNING *;
  `;

  return pool
    .query(queryString, queryParams)
    .then((result) => result.rows[0])
    .catch((err) => {
      console.error('Error executing query', err.stack);
      return null;
    });
};

module.exports = {
  getUserWithEmail,
  getUserWithId,
  addUser,
  getAllReservations,
  getAllProperties,
  addProperty,
};
