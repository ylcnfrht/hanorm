import { Address } from "./adress.entity";
import { HanORM } from "..";
import { User } from "./user.entity";

async function main() {
  const hanORM = new HanORM({
    connectionLimit: 20,
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'example-schema',
    sync: true,
    logging: true
  });

  await hanORM.connect();

  await hanORM.index('users', ['username', 'email'], true);
  await hanORM.dropIndex('users', 'idx_users_username_email');


  const userModel = await hanORM.createModel<User>('User', {
    name: {
      type: 'VARCHAR',
      size: 255,
      nullable: true,
      defaultValue: 50
    },
    age: { type: 'INT' },
  });

  const addressModel = await hanORM.createModel<Address>('Address', {
    country: { type: 'VARCHAR', size: 255 },
    city: { type: 'VARCHAR', size: 255 },
    district: { type: 'VARCHAR', size: 255 },
    no: { type: 'INT' },
    userId: { type: 'INT' },
  });

  try {
    await hanORM.startTransaction();

    await userModel.create({ name: 'John Doe', age: 33 });
    await userModel.update(1, { name: 'John and Jane' })

    await hanORM.commitTransaction();
  } catch (error) {
    await hanORM.rollbackTransaction();
    console.error('Transaction failed:', error);
  }

  const { insertId: userId } = await userModel.create({ name: 'John Doe', age: 33 });

  await userModel.createMany([
    { name: 'John', age: 55 },
    { name: 'Jane', age: 40,  },
  ]);

  const ids = [2, 3, 4, 5, 6];

  await userModel.updateMany(ids, { name: 'John' });
  
  await userModel.deleteMany(ids);

  await addressModel.create({ country: 'turkey', city: 'istanbul', district: 'pendik', no: 222, userId });

  const userJoinAddress = await userModel.join('INNER', 'User', 'Address', ['User.id = Address.userId']);

  await userModel.update(userId, { age: 26 });

  const user = await userModel.findById(userId, 'name, age');

  const usersWithAge26 = await userModel.find({ age: 26 });

  console.log('Users with age 26:', usersWithAge26);

  await userModel.delete(userId || 0);

  console.log('User deleted.');

  await hanORM.disconnect();
}

main();