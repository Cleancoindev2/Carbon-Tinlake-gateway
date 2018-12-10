import { Test, TestingModule } from '@nestjs/testing';
import { ContactsController } from './contacts.controller';
import { Contact } from '../../../src/common/models/dto/contact';
import { SessionGuard } from '../auth/SessionGuard';
import { centrifugeClientFactory } from '../centrifuge-client/centrifuge.client';
import { tokens as clientTokens } from '../centrifuge-client/centrifuge.constants';
import { tokens as databaseTokens } from '../database/database.constants';
import { databaseConnectionFactory } from '../database/database.providers';

describe('ContactsController', () => {
  let contactsModule: TestingModule;

  const contactToCreate = new Contact('sarah', '0xsarah_address');
  const fetchedContacts = [new Contact('alberta', '0xalberta_address')];

  class DatabaseServiceMock {
    contacts = {
      create: jest.fn(val => val),
      find: jest.fn(() => fetchedContacts),
    };
  }

  const databaseServiceMock = new DatabaseServiceMock();

  class CentrifugeClientMock {
    create = jest.fn(data => data);
  }

  const centrifugeClientMock = new CentrifugeClientMock();

  beforeEach(async () => {
    contactsModule = await Test.createTestingModule({
      controllers: [ContactsController],
      providers: [
        SessionGuard,
        centrifugeClientFactory,
        databaseConnectionFactory,
      ],
    })
      .overrideProvider(databaseTokens.databaseConnectionFactory)
      .useValue(databaseServiceMock)
      .overrideProvider(clientTokens.centrifugeClientFactory)
      .useValue(centrifugeClientMock)
      .compile();

    databaseServiceMock.contacts.create.mockClear();
    databaseServiceMock.contacts.find.mockClear();
  });

  describe('create', () => {
    it('should return the created contact', async () => {
      const contactsController = contactsModule.get<ContactsController>(
        ContactsController,
      );

      const userId = 'owner_id';

      const result = await contactsController.create(
        { user: { id: userId } },
        contactToCreate,
      );
      expect(result).toEqual({
        ownerId: userId,
        name: contactToCreate.name,
        address: contactToCreate.address,
      });

      expect(databaseServiceMock.contacts.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('get', () => {
    it('should return a list of contacts', async () => {
      const contactsController = contactsModule.get<ContactsController>(
        ContactsController,
      );

      const result = await contactsController.get({
        user: { id: 'some_user_id' },
      });
      expect(result).toBe(fetchedContacts);
      expect(databaseServiceMock.contacts.find).toHaveBeenCalledTimes(1);
    });
  });
});