import * as Nedb from 'nedb';
import { promisify } from 'util';
import { tokens } from './database.constants';
import { User } from '../../../src/common/models/dto/user';
import { DatabaseRepository } from './database.repository';
import { InvoiceInvoiceData } from '../../../clients/centrifuge-node/generated-client';
import { Contact } from '../../../src/common/models/dto/contact';

export interface DatabaseProvider {
  invoices: DatabaseRepository<InvoiceInvoiceData>;
  users: DatabaseRepository<User>;
  contacts: DatabaseRepository<Contact>;
}

const testUser = new User(
  'test',
  '$2b$12$o7HxJQsEl0jjwZ6FoGiEv.uQs9hLDFo2fOj5S3BnLL4nGpLfy/yW2', // password is test
  'test_user_1',
);

const initializeDatabase = async function() {
  const invoicesDb = new Nedb();
  await promisify(invoicesDb.loadDatabase.bind(invoicesDb))();

  const usersDb = new Nedb();
  await promisify(usersDb.loadDatabase.bind(usersDb))();
  await promisify(usersDb.insert.bind(usersDb))(testUser);

  const contactsDb = new Nedb();
  await promisify(contactsDb.loadDatabase.bind(contactsDb))();

  return {
    invoices: new DatabaseRepository<InvoiceInvoiceData>(invoicesDb),
    users: new DatabaseRepository<User>(usersDb),
    contacts: new DatabaseRepository<Contact>(contactsDb),
  };
};

let initializeDatabasePromise;

export const databaseConnectionFactory = {
  provide: tokens.databaseConnectionFactory,
  useFactory: async (): Promise<DatabaseProvider> => {
    if (!initializeDatabasePromise) {
      initializeDatabasePromise = initializeDatabase();
    }

    return initializeDatabasePromise;
  },
};