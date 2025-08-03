export const sumJSON = {
  type: 'object',
  properties: {
    a: { type: 'number', description: 'The first number' },
    b: { type: 'number', description: 'The second number' },
  },
  required: ['a', 'b'],
};

export const subJSON = {
  type: 'object',
  properties: {
    a: { type: 'number', description: 'The first number' },
    b: { type: 'number', description: 'The second number' },
  },
  required: ['a', 'b'],
};

export const queryExecutorJSON = {
  type: 'object',
  properties: {
    sql: {
      type: 'string',
      description: 'A raw SQL query to retrieve data from the PostgreSQL database. Use $1, $2, etc. for parameters.',
    },
    params: {
      type: 'array',
      description: 'Optional array of parameters to replace positional placeholders in the SQL query.',
      items: {
        type: ['string', 'number', 'boolean', 'null'],
        description: 'Each parameter corresponds to a positional placeholder in the SQL query.',
      },
      default: [],
    },
  },
  required: ['sql'],
};
