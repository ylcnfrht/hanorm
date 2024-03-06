# HanORM - TypeScript MySQL ORM
![Screenshot](hanorm.png)


HanORM is a TypeScript library that provides a simple yet powerful Object-Relational Mapping (ORM) framework for MySQL databases. With HanORM, you can define and manage database entities using TypeScript classes and benefit from features such as transactions, table indexing, and query logging.

## Table of Contents

1. [Installation](#installation)
2. [Getting Started](#getting-started)
3. [Connection](#connection)
4. [Transactions](#transactions)
5. [Entity Models](#entity-models)
6. [Table Operations](#table-operations)
7. [Querying](#querying)

## 1. Installation <a name="installation"></a>

To use HanORM, you need to install it as a dependency in your TypeScript project:

```bash
npm install mysql2 hanorm
````

## 2. Getting Started <a name="getting-started"></a>
### Start by importing HanORM and creating an instance of the HanORM class:
```typescript
import { HanORM, ConnectionOptions, MySQLType } from 'hanorm';

const connectionOptions: ConnectionOptions = {
  host: 'your-database-host',
  user: 'your-database-user',
  password: 'your-database-password',
  database: 'your-database-name',
  logging: false, // default false
  sync: false // default false, Note that: Please do not set this to true for production database
};

const hanORM = new HanORM(connectionOptions);
```

## 3. Connection <a name="connection"></a>

### 3.1 Connect to the Database
To establish a connection to the database:

```typescript
await hanORM.connect();
```

### 3.2 Disconnect from the Database
To disconnect from the database:

```typescript
await hanORM.disconnect();
```

## 4. Transactions <a name="transactions"></a>
### 4.1 Start a Transaction

```typescript
const transactionConnection = await hanORM.startTransaction();
```

### 4.2 Commit a Transaction
```typescript
await hanORM.commitTransaction();
````

### 4.3 Rollback a Transaction
```typescript
await hanORM.rollbackTransaction();
```
### Example: Using Transactions
```typescript
try {
  // Start a transaction
  const transactionConnection = await hanORM.startTransaction();

  // Perform multiple operations within the transaction
  await userModel.create({ username: 'john_doe', email: 'john.doe@example.com' });

  const updatedUser = await userModel.update(1, { username: 'new_username' });

  // Commit the transaction if all operations are successful
  await hanORM.commitTransaction();

  console.log('Transaction committed successfully');
} catch (error) {
  // Rollback the transaction if an error occurs
  await hanORM.rollbackTransaction();
  console.error('Transaction failed. Rolling back changes:', error);
}
```

## 5. Entity Models <a name="entity-models"></a>
### 5.1 Create a Single Entity
```typescript
const user = await userModel.create({
  username: 'john_doe',
  email: 'john.doe@example.com',
});
```

### 5.2 Create Multiple Entities
```typescript
const usersData = [
  { username: 'john_doe', email: 'john.doe@example.com' },
  { username: 'jane_doe', email: 'jane.doe@example.com' },
];

const createdUsers = await userModel.createMany(usersData);
```
### 5.3 Update a Single Entity by ID
```typescript
const updatedUser = await userModel.update(1, { username: 'new_username' });
```
### 5.4 Update Multiple Entities by IDs
```typescript
const updatedUsers = await userModel.updateMany([1, 2], { email: 'new_email@example.com' });
````

### 5.5 Delete a Single Entity by ID
```typescript
await userModel.delete(1);
```
### 5.6 Delete Multiple Entities by IDs
```typescript
const userIdsToDelete = [1, 2, 3];
await userModel.deleteMany(userIdsToDelete);
```

### 5.7 Find by ID
```typescript
const user = await userModel.findById(1);
```

### 5.8 Find with Conditions
```typescript
const users = await userModel.find({ username: 'john_doe' });
````

## 5.9 Join Tables
### 5.9.1 INNER Join
```typescript
const innerJoinResult = await userModel.join('INNER', 'users', 'posts', ['users.id = posts.user_id'], ['users.id', 'posts.title']);
```

### 5.9.2 LEFT Join
```typescript
const leftJoinResult = await userModel.join('LEFT', 'users', 'comments', ['users.id = comments.user_id'], ['users.id', 'comments.text']);
````

### 5.9.3 RIGHT Join
```typescript
const rightJoinResult = await userModel.join('RIGHT', 'users', 'orders', ['users.id = orders.user_id'], ['users.id', 'orders.total']);
```


### 5.10 Count Records
```typescript
const count = await userModel.count({ username: 'john_doe' });
```

## 6. Table Operations <a name="table-operations"></a>
### 6.1 Indexing
#### 6.1.1 Create Index
This example creates a unique index on the 'username' column of the 'users' table.

```typescript
await hanORM.index('users', ['username'], true);
```

#### 6.1.2 Drop Index
This example drops the previously created index on the 'username' column of the 'users' table.
```typescript
await hanORM.dropIndex('users', 'idx_users_username');
```
### 6.2 Create Table
```typescript
interface User {
  id: number;
  username: string;
  email: string;
}

const userFields: Record<keyof User, FieldDefinition> = {
  id: { type: 'INT', primary: true, autoIncrement: true },
  username: { type: 'VARCHAR', size: 255, unique: true, nullable: false },
  email: { type: 'VARCHAR', size: 255, nullable: false },
};

await hanORM.createTable<User>('users', userFields);
```
This example creates a 'users' table with specified fields and constraints.

### 6.3 Drop Table
This example drops the 'users' table.
```typescript
await hanORM.dropTable('users');
```

## 7. Querying <a name="querying"></a>
### 7.1 Basic Query
This example retrieves users with the username 'john_doe'.
```typescript
const users = await userModel.find({ username: 'john_doe' });
```
### 7.2 Advanced Query
  This example retrieves users with the username 'john_doe', selects specific fields, paginates results, and sorts them by the 'created_at' column in descending order.
```typescript
const users = await userModel.find(
  { username: 'john_doe' },
  'id, username, email',
  1,
  10,
  'created_at',
  'desc'
);
```

### 7.3 Count Records
This example counts the number of records in the 'users' table where the username is 'john_doe'.
```typescript
const count = await userModel.count({ username: 'john_doe' });
```
## People

The original author of hanorm is [Ferhat Yalçın](https://github.com/ylcnfrht)


## License

  [MIT](LICENSE)