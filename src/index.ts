import { AppDataSource } from './data-source';
import { User } from './entities/users/user.entity';

AppDataSource.initialize()
  .then(async () => {
    console.log('Inserting a new user into the database...');
    const user = new User();
    user.auth0Sub = 'auth0|123456789';
    user.email = 'timber.saw@example.com';
    user.firstName = 'Timber';
    user.lastName = 'Saw';
    user.country = 'USA';
    user.birthYear = 1925;
    await AppDataSource.manager.save(user);
    console.log('Saved a new user with id: ' + user.id);

    console.log('Loading users from the database...');
    const users = await AppDataSource.manager.find(User);
    console.log('Loaded users: ', users);

    console.log(
      'Here you can setup and run express / fastify / any other framework.',
    );
  })
  .catch((error) => console.log(error));
