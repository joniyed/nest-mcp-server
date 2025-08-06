export const sumJSON = {
  type: 'object',
  properties: {
    a: {
      type: 'number',
      description: 'First number to add',
    },
    b: {
      type: 'number',
      description: 'Second number to add',
    },
  },
  required: ['a', 'b'],
};

export const subJSON = {
  type: 'object',
  properties: {
    a: {
      type: 'number',
      description: 'First number (minuend)',
    },
    b: {
      type: 'number',
      description: 'Second number (subtrahend)',
    },
  },
  required: ['a', 'b'],
};

export const queryExecutorJSON = {
  type: 'object',
  properties: {
    sql: {
      type: 'string',
      description: 'SQL query to execute',
    },
    params: {
      type: 'array',
      description: 'Query parameters',
      items: {
        type: 'string',
      },
    },
  },
  required: ['sql'],
};

export const simpleReplyJSON = {
  type: 'object',
  properties: {
    message: {
      type: 'string',
      description: 'The message to respond to',
    },
  },
  required: ['message'],
};
