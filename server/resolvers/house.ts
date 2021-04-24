import dayjs from 'dayjs';
import { groupBy } from 'lodash';
import { bot, pull } from 'server/lib';
import { House, Record, User } from 'server/models';
import { composeContent } from 'server/util';
import { Arg, Int, Mutation, Query, Resolver } from 'type-graphql';
import { Between } from 'typeorm';

@Resolver()
export class HouseResolver {
  @Query(() => [House])
  houses() {
    return House.find();
  }

  @Query(() => [House])
  async yearOfHouses(@Arg('year', () => Int) year: number) {
    const date = dayjs(`${year}`);
    const houses = await House.find({
      where: {
        ends_at: Between(
          date.format('YYYY-MM-DD HH:mm:ss'),
          date.add(1, 'year').format('YYYY-MM-DD HH:mm:ss'),
        ),
      },
    });

    return houses;
  }

  @Query(() => Int)
  recordsCount() {
    return Record.count();
  }

  @Query(() => [String])
  async years() {
    const houses = await House.find({ select: ['ends_at'] });
    const years = groupBy(houses, (item) => dayjs(item.ends_at).get('year'));
    return Object.keys(years);
  }

  @Mutation(() => [House])
  async pullHouses() {
    const houses = await pull(1, 'first');

    const diffHouses = await Promise.all(
      houses.map(async (item) => {
        const savedHouse = await House.findOne({
          uuid: item.uuid,
        });

        const house = House.create(item);

        if (savedHouse?.status !== house.status) {
          return house.save();
        }
      }),
    );

    const sendHouses = diffHouses.filter(Boolean) as House[];

    if (sendHouses.length) {
      const users = await User.find();
      for (const user of users) {
        await Promise.all(
          sendHouses.map((house) =>
            bot.telegram.sendMessage(
              user.telegram_chat_id,
              composeContent(house),
            ),
          ),
        );
      }
    }

    return sendHouses;
  }
}
