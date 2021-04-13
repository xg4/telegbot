import { Arg, Field, InputType, Mutation, Resolver } from 'type-graphql';
import { ParseMode } from 'typegram';
import { bot } from '../lib';
import { User } from '../models';

@InputType()
export class PushMessageInputs {
  @Field(() => String)
  token: string;

  @Field(() => String)
  content: string;

  @Field(() => String, { nullable: true })
  type?: ParseMode;
}

@Resolver()
export class MessageResolver {
  @Mutation(() => Boolean)
  async pushMessage(@Arg('data') data: PushMessageInputs) {
    const { token, content, type } = data;
    const user = await User.findOne({ token });

    if (!user) {
      throw new Error(`no such token: ${token}`);
    }

    const chatId = user.telegram_chat_id;

    await bot.telegram.sendMessage(chatId, content, { parse_mode: type });

    return true;
  }
}